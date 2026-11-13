// Escena 3D a pantalla completa: monta el Viewport de three.js y conecta el arrastre.
import { useEffect, useRef } from 'react';
import { Viewport } from '../three/viewport';
import { attachInteraction } from '../three/interaction';
import { store } from '../app/context';
import { useToast } from '../app/toast';

let initialized = false;

export function Stage({ onReady }: { onReady: (vp: Viewport | null) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const msg = useToast();

  useEffect(() => {
    const vp = new Viewport(host.current!, store);
    const detach = attachInteraction(vp, store);
    if (!initialized) { initialized = true; store.init(); }
    vp.setView('iso');
    onReady(vp);
    if (import.meta.env.DEV) Object.assign(window, { tallerVp: vp });
    return () => { detach(); vp.destroy(); onReady(null); };
  }, [onReady]);

  return (
    <main className="stage" aria-label="Escena 3D. Arrastra piezas para moverlas, el fondo para girar y usa WASD para mover la cámara.">
      <div id="view" ref={host} />
      {msg && <div className="toast" role="status">{msg}</div>}
    </main>
  );
}
