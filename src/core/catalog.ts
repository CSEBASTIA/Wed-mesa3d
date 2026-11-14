// Catálogo de piezas y materiales. Agregar una pieza nueva:
// 1) su tipo en types.ts, 2) declararla en TYPES con su categoría,
// 3) describir sus partes en parts.ts (de ahí salen el 3D, el despiece, el costo y la miniatura).
import type { MatKey, Piece, PieceTemplate, PieceType } from './types';

/** Grosor estándar de melamina / aglomerado, en cm. */
export const T = 1.8;

export type PieceCategory = 'tableros' | 'patas' | 'almacenamiento' | 'accesorios';
export const CATEGORY_NAMES: Record<PieceCategory, string> = {
  tableros: 'Tableros y paneles', patas: 'Patas y soportes', almacenamiento: 'Almacenamiento', accesorios: 'Accesorios'
};

type TypeDef = PieceTemplate & { cat: PieceCategory; hint?: string };

export const TYPES: Record<PieceType, TypeDef> = {
  // tableros y paneles
  tablero:   { cat: 'tableros', name: 'Tablero',        w: 120, h: 2.5,  d: 60,  mat: 'roble', hint: 'Superficie de trabajo recta' },
  tableroL:  { cat: 'tableros', name: 'Tablero en L',   w: 160, h: 2.5,  d: 120, mat: 'roble', c: 60, r: 20, hint: 'Esquinero con curva interior' },
  lateral:   { cat: 'tableros', name: 'Panel lateral',  w: 2.5, h: 72.5, d: 58,  mat: 'blanco', hint: 'Costado de apoyo hasta el piso' },
  estante:   { cat: 'tableros', name: 'Estante',        w: 60,  h: 1.8,  d: 30,  mat: 'roble' },
  faldon:    { cat: 'tableros', name: 'Faldón trasero', w: 110, h: 30,   d: 1.8, mat: 'blanco', hint: 'Panel de privacidad bajo el tablero' },
  travesano: { cat: 'tableros', name: 'Travesaño',      w: 100, h: 4,    d: 4,   mat: 'roble-macizo', hint: 'Chambrana entre patas' },
  biombo:    { cat: 'tableros', name: 'Panel divisor',  w: 120, h: 40,   d: 2,   mat: 'gris', hint: 'Privacidad sobre el escritorio' },
  // patas y soportes
  pata:         { cat: 'patas', name: 'Pata cuadrada',    w: 5,   h: 72.5, d: 5,  mat: 'negro' },
  patar:        { cat: 'patas', name: 'Pata redonda',     w: 5,   h: 72.5, d: 5,  mat: 'metal' },
  pataConica:   { cat: 'patas', name: 'Pata cónica',      w: 5.5, h: 72.5, d: 5.5, mat: 'roble-macizo', hint: 'Estilo nórdico, mid-century' },
  pataTorneada: { cat: 'patas', name: 'Pata torneada',    w: 8,   h: 72.5, d: 8,  mat: 'nogal-macizo', hint: 'Clásica, con dado y pie' },
  horquilla:    { cat: 'patas', name: 'Pata horquilla',   w: 10,  h: 72.5, d: 10, mat: 'acero-negro', hint: 'Hairpin de varilla' },
  caballete:    { cat: 'patas', name: 'Caballete',        w: 5,   h: 72.5, d: 60, mat: 'pino', hint: 'Pata en A de madera' },
  marcoU:       { cat: 'patas', name: 'Pata en U',        w: 4,   h: 72.5, d: 58, mat: 'acero-negro', hint: 'Tubo 40×20 mm' },
  marcoO:       { cat: 'patas', name: 'Marco cerrado',    w: 4,   h: 72.5, d: 58, mat: 'acero-negro', hint: 'Pata en O, tubo 40×20 mm' },
  trapecio:     { cat: 'patas', name: 'Pata trapecio',    w: 4,   h: 72.5, d: 60, mat: 'acero-negro', hint: 'Arriba 25 cm más angosta' },
  baseX:        { cat: 'patas', name: 'Pata en X',        w: 4,   h: 72.5, d: 60, mat: 'acero-negro', hint: 'Para escritorio de caballete' },
  escuadra:     { cat: 'patas', name: 'Escuadra de pared', w: 3,  h: 25,   d: 35, mat: 'acero-negro', hint: 'Escritorio flotante' },
  // almacenamiento
  cajonera:      { cat: 'almacenamiento', name: 'Cajonera',          w: 45, h: 73, d: 55, mat: 'blanco', n: 3, zoc: 8, hint: 'Pedestal con zócalo' },
  cajoneraMovil: { cat: 'almacenamiento', name: 'Cajonera con ruedas', w: 40, h: 58, d: 50, mat: 'blanco', n: 3, hint: 'Va debajo del tablero' },
  archivador:    { cat: 'almacenamiento', name: 'Archivador',        w: 45, h: 73, d: 55, mat: 'gris', hint: 'Cajón + cajón para carpetas' },
  gabinete:      { cat: 'almacenamiento', name: 'Módulo con puerta', w: 45, h: 73, d: 55, mat: 'blanco', hint: 'Puerta y entrepaño' },
  librero:       { cat: 'almacenamiento', name: 'Librero lateral',   w: 40, h: 73, d: 30, mat: 'roble', n: 2, hint: 'Estantes abiertos' },
  nicho:         { cat: 'almacenamiento', name: 'Nicho',             w: 35, h: 35, d: 30, mat: 'blanco', hint: 'Cubo abierto' },
  hutch:         { cat: 'almacenamiento', name: 'Repisa superior',   w: 120, h: 40, d: 28, mat: 'roble', hint: 'Hutch sobre el tablero' },
  cajon:         { cat: 'almacenamiento', name: 'Cajón suelto',      w: 40, h: 13, d: 45, mat: 'roble' },
  // accesorios
  bandejaTeclado:  { cat: 'accesorios', name: 'Bandeja de teclado', w: 65, h: 6,  d: 30, mat: 'negro', hint: 'Deslizable bajo el tablero' },
  soporteCPU:      { cat: 'accesorios', name: 'Porta CPU',          w: 25, h: 14, d: 48, mat: 'negro', hint: 'Con ruedas' },
  elevadorMonitor: { cat: 'accesorios', name: 'Elevador de monitor', w: 55, h: 10, d: 22, mat: 'roble' },
  reposapies:      { cat: 'accesorios', name: 'Reposapiés',         w: 45, h: 12, d: 35, mat: 'negro' },
  canaleta:        { cat: 'accesorios', name: 'Bandeja de cables',  w: 80, h: 8,  d: 12, mat: 'acero-negro', hint: 'Bajo el tablero' },
  pasacables:      { cat: 'accesorios', name: 'Pasacables',         w: 6,  h: 2,  d: 6,  mat: 'negro', hint: 'Tapa ø 60 mm' }
};

export const PIECE_TYPES = Object.keys(TYPES) as PieceType[];

export type MatFamily = 'melamina' | 'tablero' | 'maciza' | 'metal';

export const FAMILY_NAMES: Record<MatFamily, string> = {
  melamina: 'Melaminas', tablero: 'Tableros', maciza: 'Maderas macizas', metal: 'Metal'
};

export interface Material {
  name: string;
  family: MatFamily;
  base: string;
  grain?: string;
  wood?: boolean;
  metal?: boolean;
  /** Aspecto satinado (lacados). */
  gloss?: boolean;
  /** Lleva canto en los bordes vistos (las maderas macizas no). */
  edged?: boolean;
}

export const MATS: Record<MatKey, Material> = {
  blanco:         { name: 'Melamina blanca', family: 'melamina', base: '#efefec', edged: true },
  gris:           { name: 'Melamina gris', family: 'melamina', base: '#8c9196', edged: true },
  negro:          { name: 'Melamina negra', family: 'melamina', base: '#2b2d31', edged: true },
  roble:          { name: 'Melamina roble', family: 'melamina', base: '#c9a26b', grain: '#a67c45', wood: true, edged: true },
  nogal:          { name: 'Melamina nogal', family: 'melamina', base: '#6e4629', grain: '#4a2d18', wood: true, edged: true },
  mdf:            { name: 'MDF lacado blanco', family: 'tablero', base: '#f6f5f2', gloss: true, edged: true },
  contrachapado:  { name: 'Contrachapado abedul', family: 'tablero', base: '#dcc39a', grain: '#c4a46f', wood: true },
  pino:           { name: 'Pino macizo', family: 'maciza', base: '#e3c896', grain: '#c8a468', wood: true },
  'roble-macizo': { name: 'Roble macizo', family: 'maciza', base: '#b88a55', grain: '#8e6235', wood: true },
  'nogal-macizo': { name: 'Nogal macizo', family: 'maciza', base: '#5a3a24', grain: '#3b2414', wood: true },
  metal:          { name: 'Acero pintado', family: 'metal', base: '#a3acb6', metal: true },
  'acero-negro':  { name: 'Acero negro mate', family: 'metal', base: '#26282c', metal: true }
};

export const MAT_KEYS = Object.keys(MATS) as MatKey[];
export const matOf = (key: MatKey): Material => MATS[key] ?? MATS.roble;

export type ExtraKey = 'c' | 'r' | 'n' | 'zoc';
export const EXTRA_KEYS: ExtraKey[] = ['c', 'r', 'n', 'zoc'];

/** Campos extra que muestra la ficha según el tipo: [clave, etiqueta]. */
export const EXTRA_FIELDS: Partial<Record<PieceType, [ExtraKey, string][]>> = {
  tableroL: [['c', 'c · Fondo del tablero'], ['r', 'Radio de la curva']],
  cajonera: [['n', 'Cajones'], ['zoc', 'Zócalo']],
  cajoneraMovil: [['n', 'Cajones']],
  librero: [['n', 'Estantes']]
};

export type EditableKey = 'w' | 'h' | 'd' | 'x' | 'y' | 'z' | ExtraKey;

/** Ajusta un valor a los límites razonables de cada propiedad. */
export function limitValue(p: Piece, key: EditableKey, v: number): number {
  const c = (lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  switch (key) {
    case 'w': case 'h': case 'd': return c(0.5, 400);
    case 'y': return c(0, 300);
    case 'x': case 'z': return c(-400, 400);
    case 'n': return Math.round(c(1, 6));
    case 'zoc': return c(0, p.h / 3);
    case 'c': return c(10, Math.min(p.w, p.d) - 10);
    case 'r': return c(0, 100);
  }
}
