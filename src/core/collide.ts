// Colisión con las paredes: las piezas no pueden salir de la habitación.
// Se trabaja en planta con la huella real de la pieza (girada) y el contorno interior del cuarto.
import { footprint } from './geometry';
import { normalizeRoom, walls } from './room';
import type { Box, Piece, Room, Vec2 } from './types';

const EPS = 0.3; // cm de tolerancia: permite apoyar la pieza al ras de la pared

export function pointInPolygon(poly: Vec2[], [x, z]: Vec2): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Acerca cada esquina hacia el centro un poco en cada eje (tolerancia para quedar al ras de la pared). */
function shrink(pts: Vec2[], cx: number, cz: number, by: number): Vec2[] {
  return pts.map(([x, z]) => [x + Math.sign(cx - x) * by, z + Math.sign(cz - z) * by]);
}

/** ¿La pieza cabe dentro de la habitación sin cruzar ninguna pared? */
export function fitsInRoom(room: Room, p: Piece, eps = EPS): boolean {
  const poly = normalizeRoom(room).points;
  const fp = shrink(footprint(p), p.x, p.z, eps);
  // 1) todas las esquinas de la pieza dentro del cuarto
  if (!fp.every((q) => pointInPolygon(poly, q))) return false;
  // 2) ninguna esquina del cuarto (rincones en L o U) metida dentro de la pieza
  return !poly.some((v) => pointInPolygon(fp, v));
}

/**
 * Lleva la pieza hacia (nx, nz) sin atravesar paredes. Si choca, intenta deslizarse en un solo eje
 * (como en un juego) y, si tampoco puede, se queda donde estaba.
 * Si la pieza ya estaba fuera del cuarto, se deja mover libremente para poder entrarla.
 */
export function constrainMove(room: Room | null, p: Piece, nx: number, nz: number): { x: number; z: number } {
  if (!room) return { x: nx, z: nz };
  // solo una pieza que de verdad está fuera del cuarto (su centro) se mueve libre, para poder entrarla
  if (!pointInPolygon(normalizeRoom(room).points, [p.x, p.z])) return { x: nx, z: nz };
  const at = (x: number, z: number) => fitsInRoom(room, { ...p, x, z });
  if (at(nx, nz)) return { x: nx, z: nz };
  // al buscar el contacto se usa la mitad de la tolerancia: así la pieza queda con margen
  // y después puede deslizarse a lo largo de la pared sin "trabarse" en el borde
  const atStrict = (x: number, z: number) => fitsInRoom(room, { ...p, x, z }, EPS / 2);
  /** Punto más lejano que cabe yendo de (fx, fz) hacia (tx, tz): búsqueda binaria hasta ~0,5 mm. */
  const reach = (fx: number, fz: number, tx: number, tz: number, ok: (x: number, z: number) => boolean): [number, number] => {
    if (ok(tx, tz)) return [tx, tz];
    let lo = 0, hi = 1;
    const steps = Math.ceil(Math.log2(Math.max(1, Math.hypot(tx - fx, tz - fz)) / 0.05));
    for (let i = 0; i < steps; i++) {
      const t = (lo + hi) / 2;
      if (ok(fx + (tx - fx) * t, fz + (tz - fz) * t)) lo = t; else hi = t;
    }
    return [fx + (tx - fx) * lo, fz + (tz - fz) * lo];
  };
  // chocó: avanzar en x hasta la pared (con margen) y luego deslizarse en z (como en un juego)
  const [x1] = reach(p.x, p.z, nx, p.z, atStrict);
  const [, z1] = reach(x1, p.z, x1, nz, at);
  // redondear a décimas solo si no queda metido en la pared
  const rx = Math.round(x1 * 10) / 10, rz = Math.round(z1 * 10) / 10;
  return at(rx, rz) ? { x: rx, z: rz } : { x: x1, z: z1 };
}

/**
 * Paredes rectas como "cajas" para el imán: una pared vertical en planta solo tiene borde en x,
 * una horizontal solo en z (los demás bordes quedan NaN y el imán los ignora).
 */
export function wallSnapBoxes(room: Room | null): Box[] {
  if (!room) return [];
  const out: Box[] = [];
  for (const w of walls(room)) {
    if (Math.abs(w.dir[0]) < 1e-6) out.push({ x0: w.a[0], x1: w.a[0], y0: NaN, y1: NaN, z0: NaN, z1: NaN, sx: 0, sz: 0 });
    else if (Math.abs(w.dir[1]) < 1e-6) out.push({ x0: NaN, x1: NaN, y0: NaN, y1: NaN, z0: w.a[1], z1: w.a[1], sx: 0, sz: 0 });
  }
  return out;
}
