// Geometría pura (sin three.js): cajas envolventes, contorno en L, huellas y cotas.
import type { Box, Dim, Piece, Vec2, Vec3 } from './types';
import { clamp } from './format';

/** Giro en grados (rot está en cuartos de vuelta y puede tener decimales). */
export const rotDeg = (p: Piece): number => ((p.rot * 90) % 360 + 360) % 360;

/** Caja envolvente alineada a los ejes de una pieza, con cualquier giro. */
export function box(p: Piece): Box {
  const th = p.rot * Math.PI / 2, c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
  const r = (n: number) => Math.round(n * 1000) / 1000;
  const sx = r(p.w * c + p.d * s), sz = r(p.w * s + p.d * c);
  return { x0: p.x - sx / 2, x1: p.x + sx / 2, y0: p.y, y1: p.y + p.h, z0: p.z - sz / 2, z1: p.z + sz / 2, sx, sz };
}

export const overlapXZ = (a: Box, b: Box): boolean =>
  a.x0 < b.x1 - 0.01 && a.x1 > b.x0 + 0.01 && a.z0 < b.z1 - 0.01 && a.z1 > b.z0 + 0.01;

export const addVec = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const armDepth = (p: Piece) => p.c ?? 60;

export const lRadius = (p: Piece): number =>
  clamp(p.r ?? 0, 0, Math.max(0, Math.min(p.w, p.d) - armDepth(p) - 1));

/** Contorno del tablero en L, centrado y sin girar. Esquina atrás-izquierda (o atrás-derecha si flip). */
export function lShape(p: Piece): Vec2[] {
  const a = p.w, b = p.d, c = clamp(armDepth(p), 5, Math.min(a, b) - 5), r = lRadius(p);
  let pts: Vec2[] = [[0, 0], [a, 0], [a, c]];
  if (r > 0.5) {
    for (let i = 0; i <= 18; i++) {
      const ang = -Math.PI / 2 - (i / 18) * (Math.PI / 2);
      pts.push([c + r + r * Math.cos(ang), c + r + r * Math.sin(ang)]);
    }
  } else pts.push([c, c]);
  pts.push([c, b], [0, b]);
  pts = pts.map(([x, z]): Vec2 => [x - a / 2, z - b / 2]);
  if (p.flip) pts = pts.map(([x, z]): Vec2 => [-x, z]).reverse();
  return pts;
}

/** Huella vista desde arriba en coordenadas del mundo (mismo giro que three.js rotation.y). */
export function footprint(p: Piece): Vec2[] {
  const loc: Vec2[] = p.type === 'tableroL' ? lShape(p)
    : [[-p.w / 2, -p.d / 2], [p.w / 2, -p.d / 2], [p.w / 2, p.d / 2], [-p.w / 2, p.d / 2]];
  const th = p.rot * Math.PI / 2, cs = Math.cos(th), sn = Math.sin(th);
  return loc.map(([x, z]): Vec2 => [p.x + x * cs + z * sn, p.z - x * sn + z * cs]);
}

export interface DrawerFront { fh: number; cy: number }

/** Frentes de una cajonera: altura de cada frente y su centro vertical (relativo al centro de la pieza). */
export function cajoneraFronts(p: Piece): DrawerFront[] {
  const zoc = p.zoc ?? 8, y0 = -p.h / 2 + zoc, y1 = p.h / 2, n = Math.max(1, Math.round(p.n ?? 3)), gap = 0.3;
  const fh = (y1 - y0 - (n - 1) * gap) / n;
  return Array.from({ length: n }, (_, i) => ({ fh, cy: y0 + fh / 2 + i * (fh + gap) }));
}

export function bounds(pieces: Piece[]): Box | null {
  if (!pieces.length) return null;
  const B = { x0: 1e9, x1: -1e9, y0: 0, y1: 0, z0: 1e9, z1: -1e9, sx: 0, sz: 0 };
  for (const p of pieces) {
    const b = box(p);
    B.x0 = Math.min(B.x0, b.x0); B.x1 = Math.max(B.x1, b.x1); B.y1 = Math.max(B.y1, b.y1);
    B.z0 = Math.min(B.z0, b.z0); B.z1 = Math.max(B.z1, b.z1);
  }
  B.sx = B.x1 - B.x0; B.sz = B.z1 - B.z0;
  return B;
}

export interface SceneInfo { center: Vec3; r: number; size: Vec3 }

export function sceneInfo(pieces: Piece[]): SceneInfo {
  const B = bounds(pieces);
  if (!B) return { center: [0, 40, 0], r: 120, size: [0, 0, 0] };
  return {
    center: [(B.x0 + B.x1) / 2, B.y1 / 2, (B.z0 + B.z1) / 2],
    r: Math.max(B.sx, B.y1, B.sz, 60),
    size: [B.sx, B.y1, B.sz]
  };
}

/** El tablero principal (el de mayor superficie). */
export function mainTop(pieces: Piece[]): Piece | null {
  let best: Piece | null = null, area = 0;
  for (const p of pieces) {
    if ((p.type === 'tableroL' || p.type === 'tablero') && p.w * p.d > area) { best = p; area = p.w * p.d; }
  }
  return best;
}

/** +1 si la esquina del L está a la izquierda, -1 si está a la derecha. */
export function cornerSide(pieces: Piece[]): 1 | -1 {
  const L = mainTop(pieces);
  return L && L.type === 'tableroL' && L.flip ? -1 : 1;
}

/** Cotas principales del mueble (a, b, c, d). */
export function getDims(pieces: Piece[]): Dim[] {
  const p = mainTop(pieces), B = bounds(pieces), off = 14;
  if (!B) return [];
  if (p && p.type === 'tableroL' && p.rot === 0) {
    const s = p.flip ? -1 : 1, c = armDepth(p);
    const X0 = p.x - s * p.w / 2, Z0 = p.z - p.d / 2, Y = p.y + p.h, X1 = X0 + s * p.w;
    return [
      { k: 'a', v: p.w, txt: 'Largo del tramo trasero', p1: [X0, Y, Z0], p2: [X1, Y, Z0], o: [0, 0, -off] },
      { k: 'b', v: p.d, txt: 'Largo del tramo lateral', p1: [X0, Y, Z0], p2: [X0, Y, Z0 + p.d], o: [-s * off, 0, 0] },
      { k: 'c', v: c, txt: 'Fondo del tablero', p1: [X0, Y, Z0 + p.d], p2: [X0 + s * c, Y, Z0 + p.d], o: [0, 0, off] },
      { k: 'd', v: Y, txt: 'Altura total', p1: [X1, 0, Z0 + c], p2: [X1, Y, Z0 + c], o: [s * off, 0, 0] }
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
    { k: 'a', v: B.sx, txt: 'Ancho total', p1: [B.x0, B.y1, B.z0], p2: [B.x1, B.y1, B.z0], o: [0, 0, -off] },
    { k: 'b', v: B.sz, txt: 'Fondo total', p1: [B.x0, B.y1, B.z0], p2: [B.x0, B.y1, B.z1], o: [-off, 0, 0] },
    { k: 'd', v: B.y1, txt: 'Altura total', p1: [B.x1, 0, B.z1], p2: [B.x1, B.y1, B.z1], o: [off, 0, 0] }
  ];
}
