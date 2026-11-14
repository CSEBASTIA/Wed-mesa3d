// Miniaturas isométricas de cada tipo de pieza, dibujadas en SVG a partir de cajas 3D.
// Las piezas compuestas (core/parts.ts) se dibujan solas a partir de sus partes reales, con giros incluidos.
import { useMemo } from 'react';
import { TYPES, matOf } from '../core/catalog';
import { compose, partMat } from '../core/parts';
import type { Piece, PieceType } from '../core/types';

type V3 = [number, number, number];
interface Block { at: V3; size: V3; wood?: boolean; lines?: number }

const C = Math.cos(Math.PI / 6), S = 0.5;
const iso = ([x, y, z]: V3): [number, number] => [(x - z) * C, (x + z) * S - y];

/** Formas simplificadas por tipo (unidades libres; x a lo ancho, y alto, z fondo). */
const SHAPES: Partial<Record<PieceType, Block[]>> = {
  tablero: [{ at: [0, 0, 0], size: [12, 0.9, 6], wood: true }],
  tableroL: [
    { at: [0, 0, 0], size: [12, 0.9, 4], wood: true },
    { at: [0, 0, 4], size: [4, 0.9, 7], wood: true }
  ],
  lateral: [{ at: [0, 0, 0], size: [0.7, 7, 6] }],
  estante: [{ at: [0, 0, 0], size: [9, 0.6, 4], wood: true }],
  faldon: [{ at: [0, 0, 0], size: [11, 3, 0.5] }],
  pata: [{ at: [0, 0, 0], size: [1.1, 8, 1.1] }],
  patar: [],
  cajonera: [{ at: [0, 0, 0], size: [5, 8, 6], lines: 3 }],
  cajon: [{ at: [0, 0, 0], size: [6, 2.2, 6], wood: true, lines: 1 }]
};

/** Composición de un escritorio completo (para la tarjeta "Escritorio a medida"). */
const DESK_L: Block[] = [
  { at: [0, 0, 0], size: [0.5, 6, 3.6] },
  { at: [10.6, 0, 0], size: [0.5, 6, 3.6] },
  { at: [0, 0, 9], size: [3.6, 6, 3], lines: 3 },
  { at: [0, 6, 0], size: [11.1, 0.7, 4], wood: true },
  { at: [0, 6, 4], size: [4, 0.7, 8], wood: true }
];
const DESK_RECTO: Block[] = [
  { at: [0, 0, 0.3], size: [3.4, 6, 4.4], lines: 3 },
  { at: [11.5, 0, 0.3], size: [0.5, 6, 4.4] },
  { at: [0, 6, 0], size: [12, 0.7, 5], wood: true }
];

function faces({ at: [x0, y0, z0], size: [w, h, d] }: Block) {
  const x1 = x0 + w, y1 = y0 + h, z1 = z0 + d;
  return {
    top: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] as V3[],
    left: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] as V3[],
    right: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]] as V3[]
  };
}

const toPath = (pts: V3[]) => 'M' + pts.map((p) => iso(p).map((n) => n.toFixed(2)).join(' ')).join('L') + 'Z';

function render(blocks: Block[]) {
  const all = blocks.flatMap((b) => Object.values(faces(b)).flat().map(iso));
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), w = Math.max(...xs) - minX, h = Math.max(...ys) - minY;
  const pad = 0.6;
  const viewBox = `${(minX - pad).toFixed(2)} ${(minY - pad).toFixed(2)} ${(w + 2 * pad).toFixed(2)} ${(h + 2 * pad).toFixed(2)}`;
  const shapes = blocks.map((b, i) => {
    const f = faces(b), cls = b.wood ? 'wood ' : '';
    const { at: [x0, y0], size: [w2, h2, d2] } = b, z1 = b.at[2] + d2;
    const lines = [];
    for (let k = 1; k <= (b.lines ?? 0); k++) {
      // líneas de cajones en el frente (cara z1)
      const y = y0 + (h2 * k) / ((b.lines ?? 0) + 1);
      if (b.lines === 1) lines.push(<path key={'h' + k} className="mark" d={toPath([[x0 + w2 * 0.35, y0 + h2 * 0.55, z1], [x0 + w2 * 0.65, y0 + h2 * 0.55, z1]]).replace('Z', '')} />);
      else lines.push(<path key={'l' + k} className="mark" d={toPath([[x0, y, z1], [x0 + w2, y, z1]]).replace('Z', '')} />);
    }
    return (
      <g key={i}>
        <path className={cls + 'r'} d={toPath(f.right)} />
        <path className={cls + 'l'} d={toPath(f.left)} />
        <path className={cls + 't'} d={toPath(f.top)} />
        {lines}
      </g>
    );
  });
  return { viewBox, shapes };
}

function RoundLeg() {
  return (
    <svg className="iso" viewBox="-4 -1 8 12" aria-hidden="true">
      <path className="r" d="M-1 1.2V9.6A1 0.45 0 0 0 1 9.6V1.2" />
      <ellipse className="t" cx="0" cy="1.2" rx="1" ry="0.45" />
    </svg>
  );
}

/** Habitación: piso y dos paredes con una ventana. */
const ROOM: Block[] = [
  { at: [0, 0, 0], size: [14, 0.4, 12], wood: true },
  { at: [-0.6, 0, -0.6], size: [0.6, 8, 12.6] },
  { at: [0, 0, -0.6], size: [4, 8, 0.6] },
  { at: [4, 0, -0.6], size: [5, 3, 0.6] },
  { at: [4, 6.5, -0.6], size: [5, 1.5, 0.6] },
  { at: [9, 0, -0.6], size: [5, 8, 0.6] },
  { at: [1.5, 0.4, 7.5], size: [5, 3.2, 3], lines: 0 }
];

export type IconShape = PieceType | 'deskL' | 'deskRecto' | 'room';

/* ---------- piezas compuestas: caras de cajas giradas, ordenadas por profundidad ---------- */

const FACES = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];

function rotate([x, y, z]: V3, [rx, ry, rz]: V3): V3 {
  // mismo orden que three.js (Euler XYZ): primero z, luego y, luego x
  let c = Math.cos(rz), s = Math.sin(rz); [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(ry); s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rx); s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c];
  return [x, y, z];
}

function ComposedIcon({ type }: { type: PieceType }) {
  const data = useMemo(() => {
    const t = TYPES[type];
    const p: Piece = { id: 'icon', type, name: t.name, w: t.w, h: t.h, d: t.d, x: 0, y: 0, z: 0, rot: 0, mat: t.mat, n: t.n, zoc: t.zoc };
    const comp = compose(p);
    const faces: { pts: [number, number][]; depth: number; cls: string }[] = [];
    if (comp) {
      for (const part of comp.parts) {
        const [w, h, d] = part.size, round = part.shape === 'cyl' || part.shape === 'cone';
        const bottom = part.shape === 'cone' ? (part.d2 ?? w) / w : 1;
        const m = matOf(partMat(part, p)), kind = m.metal ? 'metal ' : m.wood ? 'wood ' : '';
        const corners: V3[] = [];
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
          const k = sy < 0 ? bottom : 1;
          const local: V3 = [sx * w / 2 * k, sy * h / 2, sz * (round ? w : d) / 2 * k];
          const r = part.rot ? rotate(local, part.rot) : local;
          corners.push([r[0] + part.at[0], r[1] + part.at[1], r[2] + part.at[2]]);
        }
        for (const f of FACES) {
          const q = f.map((i) => corners[i]);
          const u = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]];
          const v = [q[3][0] - q[0][0], q[3][1] - q[0][1], q[3][2] - q[0][2]];
          const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
          if (n[0] + n[1] + n[2] <= 1e-6) continue; // de espaldas al observador
          const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
          const shade = ay >= ax && ay >= az ? 't' : az >= ax ? 'l' : 'r';
          const depth = q.reduce((s, c) => s + c[0] + c[1] + c[2], 0) / 4;
          faces.push({ pts: q.map(iso), depth, cls: kind + shade });
        }
      }
    }
    faces.sort((a, b) => a.depth - b.depth);
    const xs = faces.flatMap((f) => f.pts.map((p2) => p2[0])), ys = faces.flatMap((f) => f.pts.map((p2) => p2[1]));
    const minX = Math.min(...xs), minY = Math.min(...ys), W = Math.max(...xs) - minX, H = Math.max(...ys) - minY;
    const pad = Math.max(W, H) * 0.06;
    return { faces, viewBox: `${minX - pad} ${minY - pad} ${W + 2 * pad} ${H + 2 * pad}` };
  }, [type]);
  return (
    <svg className="iso" viewBox={data.viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {data.faces.map((f, i) => <path key={i} className={f.cls} d={'M' + f.pts.map((q) => q[0].toFixed(2) + ' ' + q[1].toFixed(2)).join('L') + 'Z'} />)}
    </svg>
  );
}

export function PieceIcon({ type }: { type: IconShape }) {
  if (type === 'patar') return <RoundLeg />;
  if (type !== 'deskL' && type !== 'deskRecto' && type !== 'room' && !SHAPES[type]) {
    if (compose({ ...TYPES[type], id: '', type, x: 0, y: 0, z: 0, rot: 0 })) return <ComposedIcon type={type} />;
    // pieza simple sin dibujo propio: una caja con sus proporciones
    const t = TYPES[type], k = 10 / Math.max(t.w, t.h, t.d);
    const { viewBox, shapes } = render([{ at: [0, 0, 0], size: [t.w * k, t.h * k, t.d * k], wood: matOf(t.mat).wood }]);
    return <svg className="iso" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">{shapes}</svg>;
  }
  const blocks = type === 'deskL' ? DESK_L : type === 'deskRecto' ? DESK_RECTO : type === 'room' ? ROOM : SHAPES[type]!;
  const { viewBox, shapes } = render(blocks);
  return <svg className="iso" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden="true">{shapes}</svg>;
}
