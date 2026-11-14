// Mini tutorial: recorre las partes de la app resaltando cada una con un foco y una tarjeta de ayuda.
// Se muestra la primera vez y se puede volver a abrir con el botón "?".
import { useEffect, useLayoutEffect, useState } from 'react';
import { Icon } from './Icon';

interface Step { target: string | null; title: string; body: string; place?: 'right' | 'left' | 'bottom' | 'top' | 'center' }

const STEPS: Step[] = [
  { target: null, place: 'center', title: 'Bienvenido al Taller de Escritorios',
    body: 'En un minuto te mostramos cómo diseñar tu escritorio a medida, dentro de tu habitación, y llevarle el plano al carpintero.' },
  { target: '[data-tour="entorno"]', place: 'right', title: '1. Dibuja tu habitación',
    body: 'Crea un cuarto, sala u oficina. Arrastra las esquinas para darle la forma real, y agrega puertas y ventanas.' },
  { target: '[data-tour="escritorio"]', place: 'right', title: '2. Crea el escritorio',
    body: 'Elige en L o recto, escribe las medidas y se arma solo, con tablero, laterales, faldones y cajonera.' },
  { target: '.stage', place: 'center', title: '3. Doble clic para editar',
    body: 'Haz doble clic en una pieza para activarla. Solo la pieza activa se mueve: arrástrala, o gírala con el aro que la rodea.' },
  { target: '[data-tour="panel-right"]', place: 'left', title: '4. Medidas en tiempo real',
    body: 'En "Pieza" cambias las medidas y todo se actualiza mientras escribes. Si es parte de un escritorio, puedes cambiar el escritorio completo.' },
  { target: '[data-tour="panel-right"]', place: 'left', title: '5. Materiales y presupuesto',
    body: 'En "Costo" ves cuánto saldría y comparas acabados: económico, estándar, premium o lujo. Puedes ajustar los precios a tu proveedor.' },
  { target: '.bottombar', place: 'top', title: '6. Muévete por la escena',
    body: 'Cambia entre vistas 3D, frente y arriba. Con W A S D te mueves como en un juego, Q y E bajan y suben.' },
  { target: '[data-tour="export"]', place: 'bottom', title: '7. Lleva el plano al carpintero',
    body: 'Exporta una imagen con la vista 3D acotada, la planta a escala y la lista de cortes. ¡Listo para enviar!' }
];

const KEY = 'taller-tutorial-visto';
export const tutorialSeen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return true; } };

interface Rect { x: number; y: number; w: number; h: number }

export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = STEPS[i], last = i === STEPS.length - 1;

  const finish = () => { try { localStorage.setItem(KEY, '1'); } catch { /* nada */ } onClose(); };

  // medir el elemento resaltado (y seguirlo si cambia de tamaño)
  useLayoutEffect(() => {
    const measure = () => {
      const el = step.target ? document.querySelector(step.target) : null;
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect(), pad = 6;
      setRect({ x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step.target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' || e.key === 'Enter') setI((n) => Math.min(STEPS.length - 1, n + 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // posición de la tarjeta junto al elemento
  const W = 330, vw = window.innerWidth, vh = window.innerHeight;
  let style: React.CSSProperties = { left: vw / 2 - W / 2, top: vh / 2 - 110 };
  const place = rect && step.place !== 'center' ? step.place : 'center';
  if (rect && place === 'right') style = { left: Math.min(rect.x + rect.w + 16, vw - W - 12), top: Math.max(12, Math.min(rect.y + 20, vh - 260)) };
  if (rect && place === 'left') style = { left: Math.max(12, rect.x - W - 16), top: Math.max(12, Math.min(rect.y + 40, vh - 260)) };
  if (rect && place === 'bottom') style = { left: Math.max(12, Math.min(rect.x + rect.w - W, vw - W - 12)), top: rect.y + rect.h + 14 };
  if (rect && place === 'top') style = { left: Math.max(12, Math.min(rect.x + rect.w / 2 - W / 2, vw - W - 12)), top: Math.max(12, rect.y - 230) };
  const narrow = vw < 700;
  if (narrow) style = { left: 12, right: 12, bottom: 12 };

  // foco: si el elemento ocupa casi toda la pantalla (la escena), se muestra solo la tarjeta
  const spot = rect && !(rect.w > vw * 0.9 && rect.h > vh * 0.8) ? rect : null;

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {spot
        ? <div className="tour-spot" style={{ left: spot.x, top: spot.y, width: spot.w, height: spot.h }} />
        : <div className="tour-dim" />}
      <div className={'tour-card' + (narrow ? ' narrow' : '')} style={{ ...style, width: narrow ? undefined : W }} key={i}>
        <div className="tour-top">
          <span className="tour-step num">{i + 1} / {STEPS.length}</span>
          <button className="icon-btn sm" aria-label="Cerrar tutorial" onClick={finish}><Icon name="close" size={16} /></button>
        </div>
        <h3 id="tour-title">{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-dots" aria-hidden="true">
          {STEPS.map((_, k) => <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />)}
        </div>
        <div className="tour-actions">
          {i === 0
            ? <button className="btn ghost" onClick={finish}>Saltar</button>
            : <button className="btn ghost" onClick={() => setI(i - 1)}>Anterior</button>}
          <button className="btn primary" autoFocus onClick={() => (last ? finish() : setI(i + 1))}>
            {last ? 'Empezar a diseñar' : i === 0 ? 'Ver el recorrido' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
