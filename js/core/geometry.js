// Geometría pura (sin three.js): cajas envolventes, contorno en L, huellas y cotas.
// Coordenadas en cm. X = izquierda/derecha, Y = altura, Z = atrás/frente. p.y es la base de la pieza.
import { T } from './catalog.js';
import { clamp } from '../utils/format.js';

/** Caja envolvente de una pieza (los giros son de 90°). */
export function box(p) {
  const odd = p.rot % 2 === 1, sx = odd ? p.d : p.w, sz = odd ? p.w : p.d;
  return { x0: p.x - sx / 2, x1: p.x + sx / 2, y0: p.y, y1: p.y + p.h, z0: p.z - sz / 2, z1: p.z + sz / 2, sx, sz };
}

export const overlapXZ = (a, b) =>
  a.x0 < b.x1 - 0.01 && a.x1 > b.x0 + 0.01 && a.z0 < b.z1 - 0.01 && a.z1 > b.z0 + 0.01;

export const lRadius = (p) => clamp(p.r || 0, 0, Math.max(0, Math.min(p.w, p.d) - p.c - 1));

/** Contorno del tablero en L, centrado y sin girar: lista de [x, z]. Esquina atrás-izquierda (o derecha si flip). */
export function lShape(p) {
  const a = p.w, b = p.d, c = clamp(p.c, 5, Math.min(a, b) - 5), r = lRadius(p);
  let pts = [[0, 0], [a, 0], [a, c]];
  if (r > 0.5) {
    for (let i = 0; i <= 18; i++) {
      const ang = -Math.PI / 2 - (i / 18) * (Math.PI / 2);
      pts.push([c + r + r * Math.cos(ang), c + r + r * Math.sin(ang)]);
    }
  } else pts.push([c, c]);
  pts.push([c, b], [0, b]);
  pts = pts.map(([x, z]) => [x - a / 2, z - b / 2]);
  if (p.flip) pts = pts.map(([x, z]) => [-x, z]).reverse();
  return pts;
}

/** Huella vista desde arriba en coordenadas del mundo (mismo giro que three.js rotation.y). */
export function footprint(p) {
  const loc = p.type === 'tableroL' ? lShape(p)
    : [[-p.w / 2, -p.d / 2], [p.w / 2, -p.d / 2], [p.w / 2, p.d / 2], [-p.w / 2, p.d / 2]];
  const th = p.rot * Math.PI / 2, cs = Math.cos(th), sn = Math.sin(th);
  return loc.map(([x, z]) => [p.x + x * cs + z * sn, p.z - x * sn + z * cs]);
}

/** Frentes de una cajonera: altura de cada frente y su centro vertical (relativo al centro de la pieza). */
export function cajoneraFronts(p) {
  const y0 = -p.h / 2 + p.zoc, y1 = p.h / 2, n = Math.max(1, Math.round(p.n)), gap = 0.3;
  const fh = (y1 - y0 - (n - 1) * gap) / n;
  return Array.from({ length: n }, (_, i) => ({ fh, cy: y0 + fh / 2 + i * (fh + gap) }));
}
export { T };

export function bounds(pieces) {
  if (!pieces.length) return null;
  const B = { x0: 1e9, x1: -1e9, y0: 0, y1: 0, z0: 1e9, z1: -1e9 };
  pieces.forEach((p) => {
    const b = box(p);
    B.x0 = Math.min(B.x0, b.x0); B.x1 = Math.max(B.x1, b.x1); B.y1 = Math.max(B.y1, b.y1);
    B.z0 = Math.min(B.z0, b.z0); B.z1 = Math.max(B.z1, b.z1);
  });
  return B;
}

/** Centro, radio aproximado y tamaño total del mueble. */
export function sceneInfo(pieces) {
  const B = bounds(pieces);
  if (!B) return { center: [0, 40, 0], r: 120, size: [0, 0, 0] };
  return {
    center: [(B.x0 + B.x1) / 2, B.y1 / 2, (B.z0 + B.z1) / 2],
    r: Math.max(B.x1 - B.x0, B.y1, B.z1 - B.z0, 60),
    size: [B.x1 - B.x0, B.y1, B.z1 - B.z0]
  };
}

/** El tablero principal (el de mayor superficie). */
export function mainTop(pieces) {
  let best = null, area = 0;
  pieces.forEach((p) => {
    if ((p.type === 'tableroL' || p.type === 'tablero') && p.w * p.d > area) { best = p; area = p.w * p.d; }
  });
  return best;
}

/** +1 si la esquina del L está a la izquierda, -1 si está a la derecha. */
export function cornerSide(pieces) {
  const L = mainTop(pieces);
  return L && L.type === 'tableroL' && L.flip ? -1 : 1;
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export { add as addVec };

/**
 * Cotas principales del mueble: [{ k, v, txt, p1, p2, o }].
 * p1/p2 son puntos [x,y,z] del borde medido; o es el desplazamiento de la línea de cota.
 */
export function getDims(pieces) {
  const p = mainTop(pieces), B = bounds(pieces), off = 14;
  if (!B) return [];
  if (p && p.type === 'tableroL' && p.rot === 0) {
    const s = p.flip ? -1 : 1, X0 = p.x - s * p.w / 2, Z0 = p.z - p.d / 2, Y = p.y + p.h, X1 = X0 + s * p.w;
    return [
      { k: 'a', v: p.w, txt: 'Largo del tramo trasero', p1: [X0, Y, Z0], p2: [X1, Y, Z0], o: [0, 0, -off] },
      { k: 'b', v: p.d, txt: 'Largo del tramo lateral', p1: [X0, Y, Z0], p2: [X0, Y, Z0 + p.d], o: [-s * off, 0, 0] },
      { k: 'c', v: p.c, txt: 'Fondo del tablero', p1: [X0, Y, Z0 + p.d], p2: [X0 + s * p.c, Y, Z0 + p.d], o: [0, 0, off] },
      { k: 'd', v: Y, txt: 'Altura total', p1: [X1, 0, Z0 + p.c], p2: [X1, Y, Z0 + p.c], o: [s * off, 0, 0] }
    ];
  }
  if (p && p.type === 'tablero' && p.rot % 2 === 0) {
    const b = box(p), Y = p.y + p.h;
    return [
      { k: 'a', v: p.w, txt: 'Largo', p1: [b.x0, Y, b.z0], p2: [b.x1, Y, b.z0], o: [0, 0, -off] },
      { k: 'c', v: p.d, txt: 'Fondo', p1: [b.x0, Y, b.z0], p2: [b.x0, Y, b.z1], o: [-off, 0, 0] },
      { k: 'd', v: Y, txt: 'Altura total', p1: [b.x1, 0, b.z1], p2: [b.x1, Y, b.z1], o: [off, 0, 0] }
    ];
  }
  return [
    { k: 'a', v: B.x1 - B.x0, txt: 'Ancho total', p1: [B.x0, B.y1, B.z0], p2: [B.x1, B.y1, B.z0], o: [0, 0, -off] },
    { k: 'b', v: B.z1 - B.z0, txt: 'Fondo total', p1: [B.x0, B.y1, B.z0], p2: [B.x0, B.y1, B.z1], o: [-off, 0, 0] },
    { k: 'd', v: B.y1, txt: 'Altura total', p1: [B.x1, 0, B.z1], p2: [B.x1, B.y1, B.z1], o: [off, 0, 0] }
  ];
}
