// Ventana "Exportar plano": vista previa de la lámina y descarga en JPG o PNG.
import { useEffect, useRef, useState } from 'react';
import { makeSheet } from '../export/sheet';
import { slug } from '../core/format';
import type { Project } from '../core/types';
import { store } from '../app/context';
import { toast } from '../app/toast';
import type { Viewport } from '../three/viewport';
import { Modal } from './Modal';

type ImageType = 'image/jpeg' | 'image/png';

export function ExportDialog({ viewport, onClose }: { viewport: Viewport; onClose: () => void }) {
  const [proj, setProj] = useState<Project>(() => ({ ...store.proj }));
  const [src, setSrc] = useState<string | null>(null);
  const sheet = useRef<HTMLCanvasElement | null>(null);

  // Regenera la lámina al abrir y cuando cambian los datos del proyecto (con una pequeña espera al escribir).
  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      document.fonts.ready.then(() => {
        if (cancelled) return;
        sheet.current = makeSheet(store, viewport);
        setSrc(sheet.current.toDataURL('image/jpeg', 0.9));
      });
    }, src ? 300 : 0);
    return () => { cancelled = true; window.clearTimeout(t); };
    // src solo decide la espera; no debe volver a disparar el efecto
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <Modal title="Plano para el carpintero" onClose={onClose} wide>
      <div className="exp-grid">
        <div className="form">
          <div className="field">
            <label htmlFor="e-name">Nombre del proyecto</label>
            <input id="e-name" type="text" maxLength={60} value={proj.name} onChange={(e) => edit({ name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="e-client">Cliente o lugar</label>
            <input id="e-client" type="text" maxLength={60} value={proj.client} onChange={(e) => edit({ client: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="e-notes">Notas para el carpintero</label>
            <textarea id="e-notes" maxLength={400} value={proj.notes} onChange={(e) => edit({ notes: e.target.value })}
              placeholder="Ej.: canto PVC 2 mm en todo el borde visible, correderas telescópicas." />
          </div>
          <label className="check">
            <input type="checkbox" id="e-chair" checked={proj.chair} onChange={(e) => edit({ chair: e.target.checked })} />
            Dibujar la silla en la vista superior
          </label>
          <button className="btn primary wide" onClick={() => download('image/jpeg')} disabled={!src}>Descargar JPG</button>
          <button className="btn wide" onClick={() => download('image/png')} disabled={!src}>Descargar PNG</button>
          <p className="note">Si la descarga no empieza, haz clic derecho sobre la imagen y elige "Guardar imagen como".</p>
          <button className="btn wide" onClick={onClose}>Cerrar</button>
        </div>
        <div className="preview">{src && <img id="e-img" src={src} alt="Plano del escritorio con medidas" />}</div>
      </div>
    </Modal>
  );
}
