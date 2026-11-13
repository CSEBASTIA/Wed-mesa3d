// Entorno: habitación con piso, paredes, puertas y ventanas. Geometría pura, sin three.js.
import type { FloorKind, Opening, OpeningType, Room, RoomKind, WallSide } from './types';

export const WALL_T = 10; // grosor de pared, cm

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

export const WALL_NAMES: Record<WallSide, string> = {
  trasera: 'Trasera', izquierda: 'Izquierda', derecha: 'Derecha', frontal: 'Frontal'
};
export const WALL_SIDES = Object.keys(WALL_NAMES) as WallSide[];

export const OPENING_DEFAULTS: Record<OpeningType, Omit<Opening, 'id' | 'wall' | 'pos'>> = {
  puerta: { type: 'puerta', width: 80, height: 210, sill: 0 },
  ventana: { type: 'ventana', width: 120, height: 110, sill: 95 }
};

export interface RoomPreset { kind: RoomKind; name: string; hint: string; room: Omit<Room, 'corner'> }

const op = (wall: WallSide, type: OpeningType, pos: number, width?: number): Omit<Opening, 'id'> =>
  ({ ...OPENING_DEFAULTS[type], wall, pos, ...(width ? { width } : {}) });

export const ROOM_PRESETS: RoomPreset[] = [
  {
    kind: 'cuarto', name: 'Cuarto', hint: 'Dormitorio o estudio pequeño',
    room: { w: 300, d: 300, h: 250, kind: 'cuarto', floor: 'madera', wall: '#f2f1ee',
      openings: [op('frontal', 'puerta', 200), op('izquierda', 'ventana', 90)] as Opening[] }
  },
  {
    kind: 'sala', name: 'Sala', hint: 'Espacio amplio con ventanal',
    room: { w: 480, d: 400, h: 260, kind: 'sala', floor: 'roble-claro', wall: '#e3d9cc',
      openings: [op('trasera', 'ventana', 170, 200), op('derecha', 'puerta', 280, 90)] as Opening[] }
  },
  {
    kind: 'oficina', name: 'Oficina', hint: 'Trabajo, piso técnico',
    room: { w: 400, d: 350, h: 260, kind: 'oficina', floor: 'ceramica', wall: '#d9dcdf',
      openings: [op('trasera', 'ventana', 220, 150), op('frontal', 'puerta', 40, 90)] as Opening[] }
  }
];

let openingSeq = 1;
export const newOpeningId = () => 'o' + Date.now().toString(36) + (openingSeq++);

/** Completa una habitación con los valores por defecto (las antiguas solo tenían w, d y corner). */
export function normalizeRoom(r: Room): Required<Room> {
  return {
    w: r.w, d: r.d, corner: r.corner,
    h: r.h ?? 250, kind: r.kind ?? 'libre', floor: r.floor ?? 'madera', wall: r.wall ?? '#f2f1ee',
    openings: (r.openings ?? []).map((o) => ({ ...o, id: o.id || newOpeningId() }))
  };
}

/** Límites del interior en planta. */
export function roomBounds(r: Room): { x0: number; x1: number; z0: number; z1: number } {
  const x0 = r.corner === 'der' ? -r.w : 0;
  return { x0, x1: x0 + r.w, z0: 0, z1: r.d };
}

export const wallLength = (r: Room, side: WallSide) => (side === 'trasera' || side === 'frontal' ? r.w : r.d);

/**
 * Recorrido de una pared por su cara interior: punto de inicio (extremo izquierdo visto desde dentro),
 * dirección a lo largo y normal hacia afuera, en planta [x, z].
 */
export function wallFrame(r: Room, side: WallSide) {
  const { x0, x1, z0, z1 } = roomBounds(r);
  switch (side) {
    case 'trasera':   return { start: [x0, z0], dir: [1, 0], out: [0, -1] } as const;
    case 'frontal':   return { start: [x1, z1], dir: [-1, 0], out: [0, 1] } as const;
    case 'izquierda': return { start: [x0, z1], dir: [0, -1], out: [-1, 0] } as const;
    case 'derecha':   return { start: [x1, z0], dir: [0, 1], out: [1, 0] } as const;
  }
}

/** Ajusta una abertura para que quepa en su pared. */
export function clampOpening(r: Room, o: Opening): Opening {
  const L = wallLength(r, o.wall), h = r.h ?? 250;
  const width = Math.max(30, Math.min(o.width, L - 20));
  const height = Math.max(30, Math.min(o.height, h - 5));
  const sill = o.type === 'puerta' ? 0 : Math.max(0, Math.min(o.sill, h - height - 5));
  const pos = Math.max(5, Math.min(o.pos, L - width - 5));
  return { ...o, width, height, sill, pos };
}

/** Tramos macizos de una pared alrededor de sus aberturas: [desde, hasta, abajo, arriba] a lo largo de la pared. */
export function wallSegments(r: Room, side: WallSide): [number, number, number, number][] {
  const L = wallLength(r, side), H = r.h ?? 250;
  const ops = (r.openings ?? []).filter((o) => o.wall === side).map((o) => clampOpening(r, o)).sort((a, b) => a.pos - b.pos);
  const segs: [number, number, number, number][] = [];
  let cursor = -WALL_T; // incluye el encuentro con la pared vecina
  for (const o of ops) {
    if (o.pos > cursor) segs.push([cursor, o.pos, 0, H]);
    if (o.sill > 0) segs.push([o.pos, o.pos + o.width, 0, o.sill]);
    if (o.sill + o.height < H) segs.push([o.pos, o.pos + o.width, o.sill + o.height, H]);
    cursor = Math.max(cursor, o.pos + o.width);
  }
  if (cursor < L + WALL_T) segs.push([cursor, L + WALL_T, 0, H]);
  return segs;
}

export function makeRoom(preset: RoomPreset, corner: Room['corner'] = 'izq'): Room {
  return { ...preset.room, corner, openings: (preset.room.openings ?? []).map((o) => ({ ...o, id: newOpeningId() })) };
}
