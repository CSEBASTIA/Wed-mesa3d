// Ventana "Exportar plano": vista previa de la lámina y descarga en JPG o PNG.
import { useEffect, useRef, useState } from 'react';
import { makeSheet } from '../export/sheet';
import { slug } from '../core/format';
import type { Project } from '../core/types';
import { store } from '../app/context';
import { toast } from '../app/toast';
import type { Viewport } from '../three/viewport';
import { Modal } from './Modal';
import { Switch } from './fields';
import { Icon } from './Icon';

type ImageType = 'image/jpeg' | 'image/png';

export function ExportDialog({ viewport, onClose }: { viewport: Viewport; onClose: () => void }) {
  const [proj, setProj] = useState<Project>(() => ({ ...store.proj }));
  const [src, setSrc] = useState<string | null>(null);
  const sheet = useRef<HTMLCanvasElement | null>(null);
  const first = useRef(true);

  // Regenera la lámina al abrir y cuando cambian los datos del proyecto (con una pequeña espera al escribir).
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      document.fonts.ready.then(() => {
        if (cancelled) return;
        sheet.current = makeSheet(store, viewport);
        setSrc(sheet.current.toDataURL('image/jpeg', 0.9));
      });
    }, first.current ? 0 : 300);
    first.current = false;
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [proj, viewport]);

  const edit = (patch: Partial<Project>) => { store.setProj(patch); setProj((p) => ({ ...p, ...patch })); };

  const download = (type: ImageType) => {
    const cv = sheet.current; if (!cv) return;
    const ext = type === 'image/png' ? 'png' : 'jpg';
    cv.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = slug(proj.name) + '-plano.' + ext;
      document.body.appendChild(a); a.click(); a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Plano descargado como ' + ext.toUpperCase() + '.');
    }, type, 0.92);
  };

  return (
    <Modal title="Plano para el carpintero" wide onClose={onClose}
      subtitle="Vista 3D con cotas, vista superior a escala y despiece completo, en una sola imagen."
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cerrar</button>
        <button className="btn" onClick={() => download('image/png')} disabled={!src}>PNG</button>
        <button className="btn primary" onClick={() => download('image/jpeg')} disabled={!src}><Icon name="download" size={16} />Descargar JPG</button>
      </>}>
      <div className="exp-grid">
        <div className="form">
          <div className="field">
            <label htmlFor="e-name">Nombre del proyecto</label>
            <div className="input"><input id="e-name" type="text" maxLength={60} value={proj.name} onChange={(e) => edit({ name: e.target.value })} /></div>
          </div>
          <div className="field">
            <label htmlFor="e-client">Cliente o lugar</label>
            <div className="input"><input id="e-client" type="text" maxLength={60} value={proj.client} placeholder="Opcional" onChange={(e) => edit({ client: e.target.value })} /></div>
          </div>
          <div className="field">
            <label htmlFor="e-notes">Notas para el carpintero</label>
            <textarea id="e-notes" className="textarea" maxLength={400} value={proj.notes} onChange={(e) => edit({ notes: e.target.value })}
              placeholder="Ej.: canto PVC 2 mm en todo el borde visible, correderas telescópicas." />
          </div>
          <Switch id="e-chair" label="Dibujar la silla en la vista superior" checked={proj.chair} onChange={(v) => edit({ chair: v })} />
          <p className="note">Si la descarga no empieza, haz clic derecho sobre la imagen y elige "Guardar imagen como".</p>
        </div>
        <div className="preview">
          {src ? <img id="e-img" src={src} alt="Plano del escritorio con medidas" /> : <span className="loading">Preparando el plano…</span>}
        </div>
      </div>
    </Modal>
  );
}
