// Tipos del modelo. Medidas en cm. X = izquierda/derecha, Y = altura, Z = atrás/frente.

export type PieceType =
  | 'tablero' | 'tableroL' | 'lateral' | 'estante' | 'faldon'
  | 'pata' | 'patar' | 'cajonera' | 'cajon';

export type MatKey = 'roble' | 'nogal' | 'pino' | 'blanco' | 'gris' | 'negro' | 'metal';

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

/** Una pieza del mueble. `y` es la base de la pieza; x/z su centro en planta. */
export interface Piece {
  id: string;
  type: PieceType;
  name: string;
  w: number;
  h: number;
  d: number;
  x: number;
  y: number;
  z: number;
  /** Giros de 90° alrededor del eje vertical (0-3). */
  rot: number;
  mat: MatKey;
  /** Tablero en L: fondo del tablero. */
  c?: number;
  /** Tablero en L: radio de la curva interior. */
  r?: number;
  /** Tablero en L: esquina a la derecha. */
  flip?: boolean;
  /** Cajonera: número de cajones. */
  n?: number;
  /** Cajonera: altura del zócalo. */
  zoc?: number;
  /** Cajón suelto: abierto. */
  open?: boolean;
}

export type PieceTemplate = Omit<Piece, 'id' | 'type' | 'x' | 'y' | 'z' | 'rot'>;

export interface Box {
  x0: number; x1: number; y0: number; y1: number; z0: number; z1: number;
  sx: number; sz: number;
}

export type Side = 'izq' | 'der';

export interface Room {
  w: number;
  d: number;
  corner: Side;
}

export type DeskShape = 'L' | 'recto';
export type DrawerSide = 'izq' | 'der' | 'ambas' | 'no';

/** Configuración del formulario "Escritorio a medida". */
export interface DeskConfig {
  shape: DeskShape;
  corner: Side;
  a: number;
  b: number;
  c: number;
  d: number;
  t: number;
  r: number;
  caj: DrawerSide;
  n: number;
  mt: MatKey;
  ms: MatKey;
  room: boolean;
  rw: number;
  rd: number;
}

/** Sensibilidad de la cámara. */
export interface CameraSettings {
  /** Velocidad con WASD, en cm por segundo. */
  move: number;
  /** Multiplicador del giro con el mouse. */
  rotate: number;
  /** Multiplicador del zoom con la rueda. */
  zoom: number;
}

export interface Project {
  name: string;
  client: string;
  notes: string;
  chair: boolean;
}

/** Cota: borde medido p1→p2 y desplazamiento o de la línea de cota. */
export interface Dim {
  k: string;
  v: number;
  txt: string;
  p1: Vec3;
  p2: Vec3;
  o: Vec3;
}

/** Fila del despiece. */
export interface CutRow {
  name: string;
  q: number;
  txt: string;
  mat: string;
}
