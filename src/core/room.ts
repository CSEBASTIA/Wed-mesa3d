// Entorno: habitación de cualquier forma (contorno de esquinas) con piso, paredes, puertas y ventanas.
// Geometría pura, sin three.js. Coordenadas en planta [x, z] en cm; z crece hacia el frente.
import type { FloorKind, Opening, OpeningType, Room, RoomKind, Side, Vec2, WallSide } from './types';

export const WALL_T = 10; // grosor de pared, cm
export const SNAP = 5;    // las esquinas se ajustan a múltiplos de 5 cm

export const FLOORS: Record<FloorKind, { name: string; base: string; line: string }> = {
  madera:        { name: 'Madera',        base: '#9a6b43', line: '#7d5434' },
  'roble-claro': { name: 'Roble claro',   base: '#c9a57a', line: '#b08a5e' },
  ceramica:      { name: 'Cerámica gris', base: '#c4c6c8', line: '#a9acaf' },
  alfombra:      { name: 'Alfombra',      base: '#6f7680', line: '#646b74' },
  cemento:       { name: 'Cemento pulido', base: '#a7a39d', line: '#97938d' }
};
export const FLOOR_KEYS = Object.keys(FLOORS) as FloorKind[];

export const WALL_COLORS: [string, string][] = [
  ['#f2f1ee', 'Blanco'], ['#d9dcdf', 'Gris perla'], ['#cfd6cc', 'Verde salvia'],
  ['#c9d3dc', 'Azul niebla'], ['#e3d9cc', 'Arena'], ['#4a4f56', 'Grafito']
];

/** En un rectángulo, los tramos 0-3 son: trasera, derecha, frontal, izquierda. */
const RECT_SIDES: WallSide[] = ['trasera', 'derecha', 'frontal', 'izquierda'];
const SIDE_NAMES: Record<WallSide, string> = { trasera: 'Trasera', derecha: 'Derecha', frontal: 'Frontal', izquierda: 'Izquierda' };

export const OPENING_DEFAULTS: Record<OpeningType, Omit<Opening, 'id' | 'wall' | 'pos'>> = {
  puerta: { type: 'puerta', width: 80, height: 210, sill: 0 },
  ventana: { type: 'ventana', width: 120, height: 110, sill: 95 }
};

/* ---------- formas ---------- */

export type RoomShape = 'rect' | 'L' | 'U';
export const SHAPE_NAMES: Record<RoomShape, string> = { rect: 'Rectangular', L: 'En L', U: 'En U' };

/** Contorno de una forma base dentro de un recuadro de w × d, con la esquina trasera en x = 0. */
export function shapePoints(shape: RoomShape, w: number, d: number, corner: Side = 'izq'): Vec2[] {
  const s = (n: number) => Math.round(n / SNAP) * SNAP;
  let pts: Vec2[];
  if (shape === 'L') {
    const cw = s(w * 0.45), cd = s(d * 0.45); // recorte en la esquina frontal derecha
    pts = [[0, 0], [w, 0], [w, d - cd], [w - cw, d - cd], [w - cw, d], [0, d]];
  } else if (shape === 'U') {
    const cw = s(w * 0.34), cd = s(d * 0.45); // entrante en el centro del frente
    const a = s((w - cw) / 2);
    pts = [[0, 0], [w, 0], [w, d], [a + cw, d], [a + cw, d - cd], [a, d - cd], [a, d], [0, d]];
  } else {
    pts = [[0, 0], [w, 0], [w, d], [0, d]];
  }
  return corner === 'der' ? pts.map(([x, z]): Vec2 => [x - w, z]) : pts;
}

/* ---------- plantillas de espacio ---------- */

export interface RoomPreset { kind: RoomKind; name: string; hint: string; room: Omit<Room, 'corner'> }

const op = (wall: number, type: OpeningType, pos: number, width?: number): Opening =>
  ({ ...OPENING_DEFAULTS[type], id: '', wall, pos, ...(width ? { width } : {}) });

export const ROOM_PRESETS: RoomPreset[] = [
  {
    kind: 'cuarto', name: 'Cuarto', hint: 'Dormitorio o estudio pequeño',
    room: { w: 300, d: 300, h: 250, kind: 'cuarto', floor: 'madera', wall: '#f2f1ee',
      openings: [op(2, 'puerta', 20), op(3, 'ventana', 90)] }
  },
  {
    kind: 'sala', name: 'Sala', hint: 'Espacio amplio con ventanal',
    room: { w: 480, d: 400, h: 260, kind: 'sala', floor: 'roble-claro', wall: '#e3d9cc',
      openings: [op(0, 'ventana', 170, 200), op(1, 'puerta', 280, 90)] }
  },
  {
    kind: 'oficina', name: 'Oficina', hint: 'Trabajo, piso técnico',
    room: { w: 400, d: 350, h: 260, kind: 'oficina', floor: 'ceramica', wall: '#d9dcdf',
      openings: [op(0, 'ventana', 220, 150), op(2, 'puerta', 270, 90)] }
  }
];

let openingSeq = 1;
export const newOpeningId = () => 'o' + Date.now().toString(36) + (openingSeq++);

/* ---------- contorno ---------- */

const signedArea = (pts: Vec2[]) =>
  pts.reduce((a, [x1, z1], i) => { const [x2, z2] = pts[(i + 1) % pts.length]; return a + x1 * z2 - x2 * z1; }, 0) / 2;

/** Ordena el contorno en el sentido que usa el resto del código (área positiva). */
export const orient = (pts: Vec2[]): Vec2[] => (signedArea(pts) < 0 ? [...pts].reverse() : pts);

export const polygonArea = (pts: Vec2[]) => Math.abs(signedArea(pts));

/** Abertura con su pared ya convertida a índice. */
export type WallOpening = Omit<Opening, 'wall'> & { wall: number };
/** Habitación con todos sus datos completos y en el formato actual. */
export type NormRoom = Omit<Required<Room>, 'openings'> & { openings: WallOpening[] };

/** Completa una habitación con los valores por defecto y la convierte al formato actual. */
export function normalizeRoom(r: Room): NormRoom {
  const points = orient(r.points && r.points.length >= 3 ? r.points.map(([x, z]): Vec2 => [x, z]) : shapePoints('rect', r.w, r.d, r.corner));
  const xs = points.map((p) => p[0]), zs = points.map((p) => p[1]);
  const openings = (r.openings ?? []).map((o) => ({
    ...o,
    id: o.id || newOpeningId(),
    wall: typeof o.wall === 'number' ? o.wall : Math.max(0, RECT_SIDES.indexOf(o.wall))
  })).filter((o) => o.wall < points.length);
  return {
    w: Math.max(...xs) - Math.min(...xs), d: Math.max(...zs) - Math.min(...zs), corner: r.corner,
    points, h: r.h ?? 250, kind: r.kind ?? 'libre', floor: r.floor ?? 'madera', wall: r.wall ?? '#f2f1ee', openings
  };
}

/** Recuadro que contiene la habitación. */
export function roomBounds(r: Room): { x0: number; x1: number; z0: number; z1: number } {
  const pts = normalizeRoom(r).points;
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
}

/** ¿Es un rectángulo alineado a los ejes? */
export function isRect(r: Room): boolean {
  const p = normalizeRoom(r).points;
  return p.length === 4 && p.every(([x, z], i) => { const [x2, z2] = p[(i + 1) % 4]; return x === x2 || z === z2; });
}

export interface Wall {
  i: number;
  a: Vec2;
  b: Vec2;
  len: number;
  /** Dirección a lo largo (unitaria). */
  dir: Vec2;
  /** Normal hacia afuera (unitaria). */
  out: Vec2;
  /** Cuánto se prolonga el muro en cada extremo para cerrar las esquinas exteriores. */
  extA: number;
  extB: number;
}

export function walls(r: Room): Wall[] {
  const pts = normalizeRoom(r).points, n = pts.length;
  const dirs = pts.map((a, i) => {
    const b = pts[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / len, (b[1] - a[1]) / len] as Vec2;
  });
  // esquina convexa si el giro es positivo: ahí hay que prolongar el muro para cerrar el rincón exterior
  const convex = (i: number) => { const d1 = dirs[(i - 1 + n) % n], d2 = dirs[i]; return d1[0] * d2[1] - d1[1] * d2[0] > 1e-6; };
  return pts.map((a, i) => {
    const b = pts[(i + 1) % n], d = dirs[i];
    return {
      i, a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]), dir: d, out: [d[1], -d[0]] as Vec2,
      extA: convex(i) ? WALL_T : 0, extB: convex((i + 1) % n) ? WALL_T : 0
    };
  });
}

export const wallLength = (r: Room, i: number) => walls(r)[i]?.len ?? 0;

/** Nombre de una pared para mostrar. */
export function wallName(r: Room, i: number): string {
  if (isRect(r)) return SIDE_NAMES[RECT_SIDES[i]];
  return 'Pared ' + (i + 1);
}

/** Ajusta una abertura para que quepa en su pared. */
export function clampOpening(r: Room, o: Opening | WallOpening): WallOpening {
  const i = typeof o.wall === 'number' ? o.wall : Math.max(0, RECT_SIDES.indexOf(o.wall));
  const L = wallLength(r, i), h = r.h ?? 250;
  const width = Math.max(30, Math.min(o.width, L - 20));
  const height = Math.max(30, Math.min(o.height, h - 5));
  const sill = o.type === 'puerta' ? 0 : Math.max(0, Math.min(o.sill, h - height - 5));
  const pos = Math.max(5, Math.min(o.pos, L - width - 5));
  return { ...o, wall: i, width, height, sill, pos };
}

/** Tramos macizos de una pared alrededor de sus aberturas: [desde, hasta, abajo, arriba] a lo largo de la pared. */
export function wallSegments(r: Room, i: number): [number, number, number, number][] {
  const nr = normalizeRoom(r), w = walls(nr)[i], H = nr.h;
  const ops = nr.openings.filter((o) => o.wall === i).map((o) => clampOpening(nr, o)).sort((a, b) => a.pos - b.pos);
  const segs: [number, number, number, number][] = [];
  let cursor = -w.extA;
  for (const o of ops) {
    if (o.pos > cursor) segs.push([cursor, o.pos, 0, H]);
    if (o.sill > 0) segs.push([o.pos, o.pos + o.width, 0, o.sill]);
    if (o.sill + o.height < H) segs.push([o.pos, o.pos + o.width, o.sill + o.height, H]);
    cursor = Math.max(cursor, o.pos + o.width);
  }
  if (cursor < w.len + w.extB) segs.push([cursor, w.len + w.extB, 0, H]);
  return segs;
}

/** Punto sobre una pared: u a lo largo desde su inicio, n hacia afuera desde la cara interior. */
export function onWallPoint(w: Wall, u: number, n: number): Vec2 {
  return [w.a[0] + w.dir[0] * u + w.out[0] * n, w.a[1] + w.dir[1] * u + w.out[1] * n];
}

/* ---------- edición del contorno ---------- */

/** Parte una pared en dos agregando una esquina en su punto medio. Las aberturas se reparten. */
export function splitWall(r: Room, i: number): Room {
  const nr = normalizeRoom(r), w = walls(nr)[i], half = w.len / 2;
  const mid: Vec2 = [Math.round((w.a[0] + w.b[0]) / 2), Math.round((w.a[1] + w.b[1]) / 2)];
  const points = [...nr.points.slice(0, i + 1), mid, ...nr.points.slice(i + 1)];
  const openings = nr.openings.map((o) => {
    if (o.wall < i) return o;
    if (o.wall > i) return { ...o, wall: o.wall + 1 };
    return o.pos + o.width / 2 < half ? o : { ...o, wall: i + 1, pos: o.pos - half };
  });
  return { ...nr, points, openings };
}

/** Quita una esquina (si quedan al menos 3). Las aberturas de las dos paredes que se unen pasan a la nueva. */
export function removeCorner(r: Room, j: number): Room {
  const nr = normalizeRoom(r), n = nr.points.length;
  if (n <= 3) return nr;
  const prev = (j - 1 + n) % n, prevLen = walls(nr)[prev].len;
  const points = nr.points.filter((_, k) => k !== j);
  const openings = nr.openings.map((o) => {
    let wall = o.wall, pos = o.pos;
    if (wall === j) { wall = prev; pos += prevLen; } // la pared que empezaba en j se une a la anterior
    if (wall > j) wall -= 1;
    return { ...o, wall, pos };
  });
  return { ...nr, points, openings };
}

/** Escala el contorno para que su recuadro mida w × d, manteniendo la esquina de referencia. */
export function resizeRoom(r: Room, w: number, d: number): Room {
  const nr = normalizeRoom(r), b = roomBounds(nr);
  const fx = w / (b.x1 - b.x0 || 1), fz = d / (b.z1 - b.z0 || 1);
  const ax = nr.corner === 'der' ? b.x1 : b.x0;
  const snap = (n: number) => Math.round(n / SNAP) * SNAP;
  const points = nr.points.map(([x, z]): Vec2 => [snap(ax + (x - ax) * fx), snap(b.z0 + (z - b.z0) * fz)]);
  return { ...nr, points };
}

export function makeRoom(preset: RoomPreset, corner: Side = 'izq', shape: RoomShape = 'rect'): Room {
  const base = { ...preset.room, corner, points: shapePoints(shape, preset.room.w, preset.room.d, corner) };
  return { ...base, openings: (preset.room.openings ?? []).map((o) => ({ ...o, id: newOpeningId() })) };
}
