// Plantillas de escritorio a medida: a partir de unas pocas medidas genera todas las piezas.
import { T } from './catalog';
import { fmt } from './format';
import type { DeskConfig, Kit, MatKey, Piece, PieceType, Room } from './types';
import { roomBounds } from './room';

export const DEFAULT_CFG: DeskConfig = {
  shape: 'L', corner: 'izq', a: 120, b: 160, c: 60, d: 75.5, t: 2.5, r: 20, caj: 'izq', n: 3,
  mt: 'blanco', ms: 'blanco', room: false, rw: 200, rd: 200
};

export interface Preset { label: string; cfg: Partial<DeskConfig> }

export const PRESETS: Preset[] = [
  { label: 'L 120 × 160, cajonera izquierda', cfg: { shape: 'L', corner: 'izq', a: 120, b: 160, c: 60, d: 75.5, caj: 'izq' } },
  { label: 'L 160 × 120, cajonera derecha', cfg: { shape: 'L', corner: 'der', a: 120, b: 160, c: 60, d: 75.5, caj: 'der' } },
  { label: 'Esquinero 130 × 130 en cuarto de 2 × 2 m', cfg: { shape: 'L', corner: 'der', a: 130, b: 130, c: 50, d: 75, r: 35, caj: 'no', room: true, rw: 200, rd: 200 } },
  { label: 'Recto 120 × 60', cfg: { shape: 'recto', a: 120, c: 60, d: 75, caj: 'der' } },
  { label: 'Recto 160 × 70, dos cajoneras', cfg: { shape: 'recto', a: 160, c: 70, d: 75, caj: 'ambas' } }
];

type NewPiece = Omit<Piece, 'id'>;

function mk(type: PieceType, name: string, w: number, h: number, d: number,
  x: number, y: number, z: number, rot: number, mat: MatKey, extra: Partial<Piece> = {}): NewPiece {
  return { type, name, w, h, d, x, y, z, rot, mat, ...extra };
}

/** Genera las piezas de un escritorio a partir de su configuración. */
export function genTemplate(cfg: DeskConfig, newId: () => string): Piece[] {
  const { a, b, c, t, mt, ms, n } = cfg, H = cfg.d - t, fy = Math.max(0, H - 30);
  const L: NewPiece[] = [];
  const cajonera = (name: string, w: number, d: number, x: number, z: number) =>
    L.push(mk('cajonera', name, w, H, d, x, 0, z, 0, ms, { n, zoc: 8 }));
  const lateral = (name: string, len: number, x: number, z: number, alongX: boolean) =>
    L.push(mk('lateral', name, 2.5, H, len, x, 0, z, alongX ? 1 : 0, ms));

  if (cfg.shape === 'L') {
    // Local: esquina atrás-izquierda en (0,0); tramo trasero sobre X, tramo lateral sobre Z.
    L.push(mk('tableroL', 'Tablero en L', a, t, b, a / 2, H, b / 2, 0, mt, { c, r: cfg.r, flip: false }));
    const onSide = cfg.caj !== 'no' && cfg.caj === cfg.corner;
    const onBack = cfg.caj !== 'no' && !onSide;
    const cw = Math.min(50, c - 4);
    let sideEnd: number, backEnd: number;
    if (onSide) { cajonera('Cajonera', cw, 50, c / 2, b - 25); sideEnd = 50; }
    else { lateral('Lateral tramo b', c - 2, c / 2, b - 1.25, true); sideEnd = 2.5; }
    if (onBack) { cajonera('Cajonera', 45, c - 4, a - 22.5, c / 2); backEnd = 45; }
    else { lateral('Lateral tramo a', c - 2, a - 1.25, c / 2, false); backEnd = 2.5; }
    L.push(mk('pata', 'Pata de esquina', 5, H, 5, 3.5, 0, 3.5, 0, ms));
    const lb = a - backEnd - 6;
    if (lb > 5) L.push(mk('faldon', 'Faldón tramo a', lb, 30, T, 6 + lb / 2, fy, 1.5 + T / 2, 0, ms));
    const ls = b - sideEnd - 6;
    if (ls > 5) L.push(mk('faldon', 'Faldón tramo b', ls, 30, T, 1.5 + T / 2, fy, 6 + ls / 2, 1, ms));
    if (cfg.corner === 'der') L.forEach((p) => { p.x = -p.x; if (p.type === 'tableroL') p.flip = true; });
  } else {
    L.push(mk('tablero', 'Tablero', a, t, c, a / 2, H, c / 2, 0, mt));
    const left = cfg.caj === 'izq' || cfg.caj === 'ambas', right = cfg.caj === 'der' || cfg.caj === 'ambas';
    const le = left ? 45 : 2.5, re = right ? 45 : 2.5;
    if (left) cajonera('Cajonera izquierda', 45, c - 4, 22.5, c / 2); else lateral('Lateral izquierdo', c - 2, 1.25, c / 2, false);
    if (right) cajonera('Cajonera derecha', 45, c - 4, a - 22.5, c / 2); else lateral('Lateral derecho', c - 2, a - 1.25, c / 2, false);
    const lf = a - le - re;
    if (lf > 5) L.push(mk('faldon', 'Faldón trasero', lf, 30, T, le + lf / 2, fy, 1.5 + T / 2, 0, ms));
  }
  return L.map((p) => ({ ...p, id: newId() }));
}

/**
 * Arma las piezas de un escritorio agrupado: genera la plantilla, la lleva a su origen y la marca con el kit.
 * Los identificadores son estables (kit-1, kit-2...) para que la selección sobreviva al rearmar.
 */
export function buildKit(kit: Kit): Piece[] {
  let n = 0;
  return genTemplate(kit.cfg, () => kit.id + '-' + (++n)).map((p) => ({ ...p, x: p.x + kit.ox, z: p.z + kit.oz, kit: kit.id }));
}

/** Esquina de la habitación donde se arma el escritorio (o el origen si no hay habitación). */
export function kitOrigin(cfg: DeskConfig, room: Room | null): { ox: number; oz: number } {
  if (!room) return { ox: 0, oz: 0 };
  const b = roomBounds(room), corner = cfg.shape === 'L' ? cfg.corner : 'izq';
  return { ox: corner === 'der' ? b.x1 : b.x0, oz: b.z0 };
}

export function roomFromCfg(cfg: DeskConfig): Room | null {
  return cfg.room ? { w: cfg.rw, d: cfg.rd, corner: cfg.shape === 'L' ? cfg.corner : 'izq' } : null;
}

export function projectName(cfg: DeskConfig): string {
  return cfg.shape === 'L'
    ? 'Escritorio en L ' + fmt(cfg.a) + ' × ' + fmt(cfg.b)
    : 'Escritorio recto ' + fmt(cfg.a) + ' × ' + fmt(cfg.c);
}
