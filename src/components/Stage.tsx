// Escena 3D central: monta el Viewport de three.js y conecta el arrastre.
import { useEffect, useRef } from 'react';
import { Viewport } from '../three/viewport';
import { attachInteraction } from '../three/interaction';
import { pieceLabel } from '../core/cutlist';
import { store, useStoreVersion } from '../app/context';
import { useToast } from '../app/toast';

let initialized = false;

export function Stage({ onReady }: { onReady: (vp: Viewport | null) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const msg = useToast();
  useStoreVersion();
  const sel = store.selected();

  useEffect(() => {
    const vp = new Viewport(host.current!, store);
    const detach = attachInteraction(vp, store);
    if (!initialized) { initialized = true; store.init(); }
    vp.setView('iso');
    onReady(vp);
    return () => { detach(); vp.destroy(); onReady(null); };
  }, [onReady]);

  return (
    <main className="stage">
      <div id="view" ref={host} />
      {msg && <div className="toast">{msg}</div>}
      <div className="hud">
        <div className="hint">Arrastra una pieza para moverla. Arrastra el fondo para girar la vista, la rueda acerca y aleja. Medidas en centímetros.</div>
        {sel && <div className="badge">{pieceLabel(sel)} cm</div>}
      </div>
    </main>
  );
}
