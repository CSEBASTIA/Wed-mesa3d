// Piezas compuestas: cada una se describe UNA vez como un conjunto de partes (cajas, cilindros, conos).
// De esa descripción salen el 3D, el despiece, el presupuesto y la miniatura.
// Coordenadas relativas al centro de la pieza (y = 0 a media altura). Medidas en cm.
// Referencias: escritorios de caballete, pedestal, repisa superior (hutch), bandeja de teclado, panel de
// privacidad y pasacables; patas recta, cónica, torneada, horquilla, en U, marco cerrado, trapecio y en X;
// altura habitual de escritorio 72-76 cm, bases en X de 58-68 cm, tubo 40×20 mm.
import { T } from './catalog';
import type { MatKey, Piece, PieceType, Vec3 } from './types';

export type HwKey = 'slide' | 'handle' | 'hinge' | 'wheel' | 'kbSlide' | 'grommet' | 'bracket';

export interface Part {
  name: string;
  /** Ancho (x), alto (y), fondo (z). En cilindros y conos, ancho = diámetro. */
  size: Vec3;
  at: Vec3;
  /** Giro en radianes alrededor de x, y, z. */
  rot?: Vec3;
  /** Material: el de la pieza por defecto, o uno fijo (herrajes, ruedas). */
  mat?: MatKey | 'piece';
  shape?: 'box' | 'cyl' | 'cone';
  /** Cono: diámetro abajo (el de arriba es size[0]). */
  d2?: number;
  /** false para partes que no se cortan ni se cobran como tabla (tiradores, ruedas...). */
  cut?: boolean;
}

export interface Composition { parts: Part[]; hw?: Partial<Record<HwKey, number>> }

export const HW_NAMES: Record<HwKey, string> = {
  slide: 'Correderas (pares)', handle: 'Tiradores', hinge: 'Bisagras', wheel: 'Ruedas',
  kbSlide: 'Guías para bandeja', grommet: 'Tapas pasacables', bracket: 'Tornillería de anclaje'
};

const handle = (x: number, y: number, z: number, vertical = false): Part =>
  ({ name: 'Tirador', size: vertical ? [1.2, 12, 2.2] : [12, 1.2, 2.2], at: [x, y, z], mat: 'metal', cut: false });

const wheel = (x: number, y: number, z: number): Part =>
  ({ name: 'Rueda', size: [5, 2.2, 5], at: [x, y, z], rot: [0, 0, Math.PI / 2], mat: 'acero-negro', shape: 'cyl', cut: false });

/** Tubo/listón inclinado entre dos puntos del plano z-y (patas en A, X, trapecio). */
function strut(name: string, w: number, thick: number, z1: number, y1: number, z2: number, y2: number, shape: Part['shape'] = 'box'): Part {
  const dz = z2 - z1, dy = y2 - y1, len = Math.hypot(dz, dy);
  return { name, size: [w, len, thick], at: [0, (y1 + y2) / 2, (z1 + z2) / 2], rot: [Math.atan2(dz, dy), 0, 0], shape };
}

/** Cuerpo de mueble: costados, techo, base, fondo y zócalo (o ruedas). Devuelve también el hueco útil. */
function carcass(w: number, h: number, d: number, plinth: number, wheels = false) {
  const parts: Part[] = [], y0 = -h / 2 + plinth, H = h - plinth, dc = d - T, zc = -T / 2;
  parts.push({ name: 'Costado', size: [T, H, dc], at: [-(w / 2 - T / 2), y0 + H / 2, zc] });
  parts.push({ name: 'Costado', size: [T, H, dc], at: [w / 2 - T / 2, y0 + H / 2, zc] });
  parts.push({ name: 'Techo', size: [w - 2 * T, T, dc], at: [0, h / 2 - T / 2, zc] });
  parts.push({ name: 'Base', size: [w - 2 * T, T, dc], at: [0, y0 + T / 2, zc] });
  parts.push({ name: 'Fondo', size: [w - 2 * T, H - 2 * T, 0.6], at: [0, y0 + H / 2, zc - dc / 2 + 0.3] });
  if (wheels) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(wheel(sx * (w / 2 - 5), -h / 2 + 2.5, sz * (d / 2 - 7)));
  } else if (plinth > 0) {
    parts.push({ name: 'Zócalo', size: [w - 2 * T, plinth, T], at: [0, -h / 2 + plinth / 2, d / 2 - T - 3], mat: 'negro' });
  }
  return { parts, y0: y0 + T, y1: h / 2 - T };
}

/** Frentes de cajón repartidos entre y0 e y1 (de abajo hacia arriba), con sus tiradores. */
function fronts(w: number, d: number, y0: number, y1: number, heights: number[]): Part[] {
  const gap = 0.3, total = y1 - y0 - gap * (heights.length - 1), sum = heights.reduce((a, b) => a + b, 0);
  const out: Part[] = []; let y = y0;
  for (const h0 of heights) {
    const fh = (h0 / sum) * total;
    out.push({ name: 'Frente de cajón', size: [w - 0.4, fh, T], at: [0, y + fh / 2, d / 2 - T / 2] });
    out.push(handle(0, y + fh * 0.72, d / 2 + 1.1));
    y += fh + gap;
  }
  return out;
}

type Composer = (p: Piece) => Composition;

const C: Partial<Record<PieceType, Composer>> = {
  /* ---------- patas y soportes ---------- */
  pataConica: ({ w, h }) => ({
    parts: [
      { name: 'Pata cónica', size: [w, h - 2, w], at: [0, 1, 0], shape: 'cone', d2: w * 0.55 },
      { name: 'Contera', size: [w * 0.55, 2, w * 0.55], at: [0, -h / 2 + 1, 0], shape: 'cyl', mat: 'metal', cut: false }
    ]
  }),
  pataTorneada: ({ w, h }) => ({
    parts: [
      { name: 'Dado superior', size: [w, 12, w], at: [0, h / 2 - 6, 0] },
      { name: 'Anillo', size: [w * 0.85, 3, w * 0.85], at: [0, h / 2 - 13.5, 0], shape: 'cyl', cut: false },
      { name: 'Fuste torneado', size: [w * 0.72, h - 22, w * 0.72], at: [0, -h / 2 + 7 + (h - 22) / 2, 0], shape: 'cone', d2: w * 0.48, cut: false },
      { name: 'Pie', size: [w * 0.68, 7, w * 0.68], at: [0, -h / 2 + 3.5, 0], shape: 'cyl', cut: false }
    ]
  }),
  horquilla: ({ w, h, d }) => ({
    parts: [
      { name: 'Placa de anclaje', size: [w, 0.6, d], at: [0, h / 2 - 0.3, 0], mat: 'piece' },
      { ...strut('Varilla', 1.2, 1.2, -(d / 2 - 1.5), h / 2 - 0.6, -0.8, -h / 2, 'cyl') },
      { ...strut('Varilla', 1.2, 1.2, d / 2 - 1.5, h / 2 - 0.6, 0.8, -h / 2, 'cyl') }
    ],
    hw: { bracket: 1 }
  }),
  caballete: ({ w, h, d }) => {
    const span = d / 2 - 4;
    return {
      parts: [
        { name: 'Travesaño superior', size: [w, 5, d - 6], at: [0, h / 2 - 2.5, 0] },
        strut('Pata inclinada', w, 5, -span, -h / 2, -8, h / 2 - 5),
        strut('Pata inclinada', w, 5, span, -h / 2, 8, h / 2 - 5),
        { name: 'Chambrana', size: [w, 4, d * 0.55], at: [0, -h / 2 + h * 0.3, 0] }
      ]
    };
  },
  marcoU: ({ w, h, d }) => ({
    parts: [
      { name: 'Tubo superior', size: [w, 4, d], at: [0, h / 2 - 2, 0] },
      { name: 'Tubo vertical', size: [w, h - 4, 4], at: [0, -2, -(d / 2 - 2)] },
      { name: 'Tubo vertical', size: [w, h - 4, 4], at: [0, -2, d / 2 - 2] }
    ],
    hw: { bracket: 1 }
  }),
  marcoO: ({ w, h, d }) => ({
    parts: [
      { name: 'Tubo superior', size: [w, 4, d], at: [0, h / 2 - 2, 0] },
      { name: 'Tubo inferior', size: [w, 4, d], at: [0, -h / 2 + 2, 0] },
      { name: 'Tubo vertical', size: [w, h - 8, 4], at: [0, 0, -(d / 2 - 2)] },
      { name: 'Tubo vertical', size: [w, h - 8, 4], at: [0, 0, d / 2 - 2] }
    ],
    hw: { bracket: 1 }
  }),
  trapecio: ({ w, h, d }) => {
    const top = Math.max(10, d - 25);
    return {
      parts: [
        { name: 'Tubo superior', size: [w, 4, top], at: [0, h / 2 - 2, 0] },
        { name: 'Tubo inferior', size: [w, 4, d], at: [0, -h / 2 + 2, 0] },
        strut('Tubo inclinado', w, 4, -(d / 2 - 2), -h / 2 + 4, -(top / 2 - 2), h / 2 - 4),
        strut('Tubo inclinado', w, 4, d / 2 - 2, -h / 2 + 4, top / 2 - 2, h / 2 - 4)
      ],
      hw: { bracket: 1 }
    };
  },
  baseX: ({ w, h, d }) => ({
    parts: [
      { name: 'Tubo superior', size: [w, 4, d], at: [0, h / 2 - 2, 0] },
      strut('Tubo en X', w, 4, -(d / 2 - 2), -h / 2, d / 2 - 2, h / 2 - 4),
      strut('Tubo en X', w, 4, d / 2 - 2, -h / 2, -(d / 2 - 2), h / 2 - 4)
    ],
    hw: { bracket: 1 }
  }),
  escuadra: ({ w, h, d }) => ({
    parts: [
      { name: 'Ala vertical', size: [w, h, 3], at: [0, 0, -(d / 2 - 1.5)] },
      { name: 'Ala horizontal', size: [w, 3, d], at: [0, h / 2 - 1.5, 0] },
      strut('Tirante', w * 0.7, 2.5, -(d / 2 - 3), -h / 2 + h * 0.3, -d / 2 + d * 0.7, h / 2 - 3)
    ],
    hw: { bracket: 1 }
  }),

  /* ---------- paneles ---------- */
  biombo: ({ w, h, d }) => ({
    parts: [
      { name: 'Panel divisor', size: [w, h, d], at: [0, 0, 0] },
      { name: 'Pinza', size: [4, 10, d + 4], at: [-(w / 2 - 15), -h / 2 - 3, 0], mat: 'acero-negro', cut: false },
      { name: 'Pinza', size: [4, 10, d + 4], at: [w / 2 - 15, -h / 2 - 3, 0], mat: 'acero-negro', cut: false }
    ],
    hw: { bracket: 2 }
  }),

  /* ---------- almacenamiento ---------- */
  cajoneraMovil: (p) => {
    const n = Math.max(1, Math.round(p.n ?? 3)), c = carcass(p.w, p.h, p.d, 6, true);
    return { parts: [...c.parts, ...fronts(p.w, p.d, -p.h / 2 + 6, p.h / 2, Array(n).fill(1))], hw: { slide: n, handle: n, wheel: 4 } };
  },
  archivador: (p) => {
    const c = carcass(p.w, p.h, p.d, 8);
    return { parts: [...c.parts, ...fronts(p.w, p.d, -p.h / 2 + 8, p.h / 2, [2.6, 1])], hw: { slide: 2, handle: 2 } };
  },
  gabinete: (p) => {
    const c = carcass(p.w, p.h, p.d, 8), H = p.h - 8;
    return {
      parts: [
        ...c.parts,
        { name: 'Entrepaño', size: [p.w - 2 * T, T, p.d - T - 2], at: [0, -p.h / 2 + 8 + H / 2, -T / 2 - 1] },
        { name: 'Puerta', size: [p.w - 0.4, H - 0.4, T], at: [0, -p.h / 2 + 8 + H / 2, p.d / 2 - T / 2] },
        handle(p.w / 2 - 5, -p.h / 2 + 8 + H * 0.7, p.d / 2 + 1.1, true)
      ],
      hw: { hinge: 2, handle: 1 }
    };
  },
  librero: (p) => {
    const n = Math.max(0, Math.round(p.n ?? 2)), c = carcass(p.w, p.h, p.d, 6);
    const shelves: Part[] = [];
    for (let i = 1; i <= n; i++) {
      const y = c.y0 + ((c.y1 - c.y0) * i) / (n + 1);
      shelves.push({ name: 'Estante', size: [p.w - 2 * T, T, p.d - T - 1], at: [0, y, -T / 2 + 0.5] });
    }
    return { parts: [...c.parts, ...shelves] };
  },
  nicho: ({ w, h, d }) => ({
    parts: [
      { name: 'Costado', size: [T, h, d], at: [-(w / 2 - T / 2), 0, 0] },
      { name: 'Costado', size: [T, h, d], at: [w / 2 - T / 2, 0, 0] },
      { name: 'Techo', size: [w - 2 * T, T, d], at: [0, h / 2 - T / 2, 0] },
      { name: 'Base', size: [w - 2 * T, T, d], at: [0, -h / 2 + T / 2, 0] },
      { name: 'Fondo', size: [w - 2 * T, h - 2 * T, 0.6], at: [0, 0, -d / 2 + 0.3] }
    ]
  }),
  hutch: ({ w, h, d }) => ({
    parts: [
      { name: 'Costado', size: [T, h, d], at: [-(w / 2 - T / 2), 0, 0] },
      { name: 'Costado', size: [T, h, d], at: [w / 2 - T / 2, 0, 0] },
      { name: 'Techo', size: [w, T, d], at: [0, h / 2 - T / 2, 0] },
      { name: 'Estante', size: [w - 2 * T, T, d - 1], at: [0, -h / 2 + h * 0.48, 0.5] },
      { name: 'Fondo', size: [w - 2 * T, h - T, 0.6], at: [0, -T / 2, -d / 2 + 0.3] }
    ]
  }),

  /* ---------- accesorios ---------- */
  bandejaTeclado: ({ w, h, d }) => ({
    parts: [
      { name: 'Bandeja', size: [w, T, d], at: [0, -h / 2 + T / 2, 0] },
      { name: 'Guía', size: [1.5, h - T, d], at: [-(w / 2 + 0.75), T / 2, 0], mat: 'acero-negro', cut: false },
      { name: 'Guía', size: [1.5, h - T, d], at: [w / 2 + 0.75, T / 2, 0], mat: 'acero-negro', cut: false }
    ],
    hw: { kbSlide: 1 }
  }),
  soporteCPU: ({ w, h, d }) => ({
    parts: [
      { name: 'Base', size: [w, T, d], at: [0, -h / 2 + 5 + T / 2, 0] },
      { name: 'Lateral', size: [T, h - 5, d], at: [-(w / 2 - T / 2), 2.5, 0] },
      { name: 'Lateral', size: [T, h - 5, d], at: [w / 2 - T / 2, 2.5, 0] },
      ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => wheel(sx * (w / 2 - 4), -h / 2 + 2.5, sz * (d / 2 - 5))))
    ],
    hw: { wheel: 4 }
  }),
  elevadorMonitor: ({ w, h, d }) => ({
    parts: [
      { name: 'Tapa', size: [w, T, d], at: [0, h / 2 - T / 2, 0] },
      { name: 'Pata', size: [T, h - T, d], at: [-(w / 2 - T / 2 - 3), -T / 2, 0] },
      { name: 'Pata', size: [T, h - T, d], at: [w / 2 - T / 2 - 3, -T / 2, 0] }
    ]
  }),
  reposapies: ({ w, h, d }) => {
    const ang = Math.atan2(h - 4, d) * 0.9;
    return {
      parts: [
        { name: 'Base', size: [w, 2, d], at: [0, -h / 2 + 1, 0] },
        { name: 'Plataforma inclinada', size: [w, T, d / Math.cos(ang)], at: [0, 0.5, 0], rot: [ang, 0, 0] }, // más alta atrás
        { name: 'Apoyo trasero', size: [w - 4, h - 4, 3], at: [0, -2 + 0.5, -(d / 2 - 2)] }
      ]
    };
  },
  canaleta: ({ w, h, d }) => ({
    parts: [
      { name: 'Fondo de canaleta', size: [w, 0.5, d], at: [0, -h / 2 + 0.25, 0] },
      { name: 'Ala', size: [w, h, 0.5], at: [0, 0, -(d / 2 - 0.25)] },
      { name: 'Ala', size: [w, h, 0.5], at: [0, 0, d / 2 - 0.25] }
    ],
    hw: { bracket: 2 }
  }),
  pasacables: ({ w, h }) => ({
    parts: [{ name: 'Tapa pasacables', size: [w, h, w], at: [0, 0, 0], shape: 'cyl', mat: 'piece', cut: false }],
    hw: { grommet: 1 }
  })
};

export const isComposed = (t: PieceType): boolean => !!C[t];
export function compose(p: Piece): Composition | null {
  const f = C[p.type];
  return f ? f(p) : null;
}

/** Material de una parte. */
export const partMat = (part: Part, p: Piece): MatKey => (!part.mat || part.mat === 'piece' ? p.mat : part.mat);
