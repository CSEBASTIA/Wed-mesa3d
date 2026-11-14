// Tipos del modelo. Medidas en cm. X = izquierda/derecha, Y = altura, Z = atrás/frente.

export type PieceType =
  // tableros y paneles
  | 'tablero' | 'tableroL' | 'lateral' | 'estante' | 'faldon' | 'travesano' | 'biombo'
  // patas y soportes
  | 'pata' | 'patar' | 'pataConica' | 'pataTorneada' | 'horquilla' | 'caballete' | 'marcoU' | 'marcoO'
  | 'trapecio' | 'baseX' | 'escuadra'
  // almacenamiento
  | 'cajonera' | 'cajoneraMovil' | 'archivador' | 'gabinete' | 'librero' | 'nicho' | 'hutch' | 'cajon'
  // accesorios
  | 'bandejaTeclado' | 'soporteCPU' | 'elevadorMonitor' | 'reposapies' | 'canaleta' | 'pasacables';

export type MatKey =
  | 'blanco' | 'gris' | 'negro' | 'roble' | 'nogal'          // melaminas
  | 'mdf' | 'contrachapado'                                   // tableros
  | 'pino' | 'roble-macizo' | 'nogal-macizo'                  // maderas macizas
  | 'metal' | 'acero-negro';                                  // metal

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
  /** Giro alrededor del eje vertical, en cuartos de vuelta (1 = 90°). Admite decimales para giros libres. */
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
  /** Escritorio al que pertenece (piezas generadas por "Escritorio a medida"). */
  kit?: string;
}

/** Escritorio generado: sus medidas y dónde está su esquina de origen. Cambiar la configuración rearma sus piezas. */
export interface Kit {
  id: string;
  cfg: DeskConfig;
  ox: number;
  oz: number;
}

export type PieceTemplate = Omit<Piece, 'id' | 'type' | 'x' | 'y' | 'z' | 'rot'>;

export interface Box {
  x0: number; x1: number; y0: number; y1: number; z0: number; z1: number;
  sx: number; sz: number;
}

export type Side = 'izq' | 'der';

export type WallSide = 'trasera' | 'izquierda' | 'derecha' | 'frontal';
export type OpeningType = 'puerta' | 'ventana';
export type RoomKind = 'cuarto' | 'sala' | 'oficina' | 'libre';
export type FloorKind = 'madera' | 'roble-claro' | 'ceramica' | 'alfombra' | 'cemento';

/** Puerta o ventana en una pared. `pos` se mide desde el extremo izquierdo de la pared (visto desde dentro). */
export interface Opening {
  id: string;
  /** Índice de la pared (tramo del contorno). Las versiones viejas guardaban 'trasera', 'izquierda'... */
  wall: number | WallSide;
  type: OpeningType;
  pos: number;
  width: number;
  height: number;
  /** Altura desde el piso (0 en puertas). */
  sill: number;
}

/**
 * Habitación. El interior va de z = 0 (pared trasera) a z = d (pared frontal).
 * `corner` indica qué esquina trasera está en x = 0: con 'izq' el interior va de x = 0 a w; con 'der', de -w a 0.
 */
export interface Room {
  w: number;
  d: number;
  corner: Side;
  /**
   * Contorno interior en planta [x, z], en orden. Cada tramo entre dos esquinas es una pared.
   * Si falta, la habitación es un rectángulo de w × d.
   */
  points?: Vec2[];
  /** Alto de las paredes. */
  h?: number;
  kind?: RoomKind;
  floor?: FloorKind;
  /** Color de las paredes. */
  wall?: string;
  openings?: Opening[];
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
