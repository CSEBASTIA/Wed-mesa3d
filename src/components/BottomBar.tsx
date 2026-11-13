// Barra inferior: medidas totales, vistas de cámara y atajo a las teclas WASD.
import { useState } from 'react';
import { sceneInfo } from '../core/geometry';
import { fmt } from '../core/format';
import { store, useStoreVersion } from '../app/context';
import type { Viewport, ViewKind } from '../three/viewport';
import { Icon, type IconName } from './Icon';

const VIEWS: [ViewKind, string, IconName][] = [['iso', '3D', 'cube'], ['front', 'Frente', 'front'], ['top', 'Arriba', 'top']];

export function BottomBar({ viewport, onCamera }: { viewport: Viewport | null; onCamera: () => void }) {
  useStoreVersion();
  const [view, setView] = useState<ViewKind>('iso');
  const s = sceneInfo(store.pieces).size;
  const go = (v: ViewKind) => { setView(v); viewport?.setView(v); };

  return (
    <div className="bottombar">
      {store.pieces.length > 0 && (
        <div className="readout float" aria-label="Medidas totales del mueble">
          <span>Mueble</span>
          <b className="num">{fmt(s[0])} × {fmt(s[1])} × {fmt(s[2])}</b>
          <span>cm</span>
        </div>
      )}
      <div className="float">
        <div className="seg" role="radiogroup" aria-label="Vista">
          {VIEWS.map(([v, label, icon]) => (
            <button key={v} role="radio" aria-checked={view === v} onClick={() => go(v)} title={'Vista ' + label}>
              <Icon name={icon} size={16} />{label}
            </button>
          ))}
        </div>
      </div>
      <button className="keyhint float" onClick={onCamera} title="Mover la cámara con el teclado">
        <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><span className="lbl">mover</span>
      </button>
    </div>
  );
}
