// Presupuesto: cuánto material lleva el mueble y cuánto cuesta, con precios editables.
// Los precios son de referencia; cada carpintero o proveedor los ajusta a su ciudad.
import { MATS, T, matOf } from './catalog';
import { cajoneraFronts, lShape } from './geometry';
import { compose, HW_NAMES, type HwKey } from './parts';
import type { MatKey, Piece } from './types';

export interface PriceList {
  /** Código ISO de la moneda (USD, EUR, MXN...). */
  currency: string;
  /** Precio del tablero por m², por material. */
  mats: Record<MatKey, number>;
  /** Canto (tapacanto) por metro lineal. */
  edge: number;
  /** Fondo de MDF 6 mm por m². */
  back: number;
  /** Par de correderas. */
  slide: number;
  /** Tirador. */
  handle: number;
  /** Pata metálica, cada una. */
  leg: number;
  /** Perfil o tubo metálico por metro (patas en U, X, marcos, escuadras). */
  tube: number;
  /** Herrajes de las piezas compuestas, cada uno. */
  hinge: number;
  wheel: number;
  kbSlide: number;
  grommet: number;
  bracket: number;
  /** Mano de obra, en % sobre materiales. */
  labor: number;
  /** Desperdicio de corte, en %. */
  waste: number;
}

export function defaultPrices(): PriceList {
  return {
    currency: 'USD',
    mats: {
      blanco: 28, gris: 30, negro: 32, roble: 34, nogal: 36,
      mdf: 55, contrachapado: 48,
      pino: 60, 'roble-macizo': 140, 'nogal-macizo': 185,
      metal: 0, 'acero-negro': 0
    },
    edge: 0.8, back: 9, slide: 9, handle: 3.5, leg: 18,
    tube: 7, hinge: 2.5, wheel: 4, kbSlide: 14, grommet: 2.5, bracket: 3,
    labor: 35, waste: 15
  };
}

export function mergePrices(p: Partial<PriceList>): PriceList {
  const d = defaultPrices();
  return { ...d, ...p, mats: { ...d.mats, ...(p.mats ?? {}) } };
}

/** Acabados de referencia para comparar diseños y presupuestos. */
export interface Finish { id: string; name: string; hint: string; top: MatKey; structure: MatKey }
export const FINISHES: Finish[] = [
  { id: 'economico', name: 'Económico', hint: 'Todo en melamina blanca', top: 'blanco', structure: 'blanco' },
  { id: 'estandar', name: 'Estándar', hint: 'Tablero roble, estructura blanca', top: 'roble', structure: 'blanco' },
  { id: 'premium', name: 'Premium', hint: 'Roble macizo y MDF lacado', top: 'roble-macizo', structure: 'mdf' },
  { id: 'lujo', name: 'Lujo', hint: 'Todo en nogal macizo', top: 'nogal-macizo', structure: 'nogal-macizo' }
];

/* ---------- cantidades ---------- */

interface Usage {
  /** m² de tablero por material. */
  area: Partial<Record<MatKey, number>>;
  /** m de canto por material. */
  edge: Partial<Record<MatKey, number>>;
  back: number;
  slides: number;
  handles: number;
  legs: number;
  /** m de perfil metálico. */
  tube: number;
  /** Herrajes de piezas compuestas. */
  hw: Partial<Record<HwKey, number>>;
}

const isMetal = (m: MatKey) => matOf(m).family === 'metal';

const m2 = (a: number, b: number) => (a * b) / 10000;

function polyArea(pts: [number, number][]) {
  return Math.abs(pts.reduce((s, [x1, z1], i) => { const [x2, z2] = pts[(i + 1) % pts.length]; return s + x1 * z2 - x2 * z1; }, 0) / 2);
}
function polyPerimeter(pts: [number, number][]) {
  return pts.reduce((s, [x1, z1], i) => { const [x2, z2] = pts[(i + 1) % pts.length]; return s + Math.hypot(x2 - x1, z2 - z1); }, 0);
}

/** Suma las cantidades de material y herrajes de todas las piezas. */
export function usage(pieces: Piece[], matFor: (p: Piece) => MatKey = (p) => p.mat): Usage {
  const u: Usage = { area: {}, edge: {}, back: 0, slides: 0, handles: 0, legs: 0, tube: 0, hw: {} };
  const board = (mat: MatKey, area: number, edgeCm: number) => {
    u.area[mat] = (u.area[mat] ?? 0) + area;
    if (matOf(mat).edged) u.edge[mat] = (u.edge[mat] ?? 0) + edgeCm / 100;
  };
  for (const p of pieces) {
    const mat = matFor(p);
    const [a, b] = [p.w, p.h, p.d].sort((x, y) => y - x);

    // piezas compuestas: cada parte se cobra según lo que es
    const comp = compose(p);
    if (comp) {
      for (const part of comp.parts) {
        if (part.cut === false) continue;
        const pm = !part.mat || part.mat === 'piece' ? mat : part.mat;
        const [s0, s1, s2] = [...part.size].sort((x, y) => y - x);
        if (isMetal(pm)) u.tube += s0 / 100;                                   // perfil: por metro
        else if (s2 < 1) u.back += m2(s0, s1);                                 // fondos delgados: MDF 6 mm
        else if (part.shape === 'cyl' || part.shape === 'cone') board(pm, m2(s0, s1), 0); // torneado: listón macizo
        else board(pm, m2(s0, s1), 2 * s0 + s1);
      }
      for (const [k, q] of Object.entries(comp.hw ?? {}) as [HwKey, number][]) {
        if (k === 'slide') u.slides += q;
        else if (k === 'handle') u.handles += q;
        else u.hw[k] = (u.hw[k] ?? 0) + q;
      }
      continue;
    }

    switch (p.type) {
      case 'tableroL': {
        const pts = lShape(p);
        board(mat, polyArea(pts) / 10000, polyPerimeter(pts));
        break;
      }
      case 'pata': case 'patar':
        if (isMetal(mat)) u.legs += 1;
        else board(mat, m2(p.w + p.d, p.h), 0); // listón macizo: se aproxima por sus caras
        break;
      case 'cajonera': {
        const { w, h, d } = p, zoc = p.zoc ?? 8, dc = d - T, fr = cajoneraFronts(p), n = fr.length;
        board(mat, 2 * m2(h, dc) + 2 * m2(w - 2 * T, dc) + m2(w - 2 * T, zoc), 2 * (h + dc) * 0.5 + 2 * (w - 2 * T));
        board(mat, n * m2(w - 0.4, fr[0].fh), n * 2 * (w - 0.4 + fr[0].fh));             // frentes, canto en todo el borde
        const bw = w - 2 * T - 2.6, bh = Math.max(5, fr[0].fh - 4), bd = dc - 5;          // cajas interiores en melamina blanca
        board('blanco', n * (2 * m2(bd, bh) + 2 * m2(bw, bh)), n * 2 * (bw + bd));
        u.back += m2(w - 2 * T, h - zoc - 2 * T) + n * m2(bw, bd);
        u.slides += n; u.handles += n;
        break;
      }
      case 'cajon': {
        const t = Math.min(1.5, p.w / 4, p.h / 4, p.d / 4);
        board(mat, m2(p.w, p.h) + 2 * m2(p.d - t, p.h - 1) + m2(p.w - 2 * t, p.h - 1) + m2(p.w - 2 * t, p.d - t), 2 * (p.w + p.h));
        u.slides += 1; u.handles += 1;
        break;
      }
      default:
        // tablas: se compra la cara mayor; canto en los dos bordes largos y uno corto (los visibles)
        board(mat, m2(a, b), 2 * a + b);
    }
  }
  return u;
}

/* ---------- costos ---------- */

export interface BudgetLine { label: string; qty: number; unit: string; price: number; total: number; group: 'material' | 'herraje' }
export interface Budget { lines: BudgetLine[]; materials: number; hardware: number; labor: number; total: number }

export function budget(pieces: Piece[], prices: PriceList, matFor?: (p: Piece) => MatKey): Budget {
  const u = usage(pieces, matFor), lines: BudgetLine[] = [];
  const waste = 1 + prices.waste / 100;
  for (const [k, area] of Object.entries(u.area) as [MatKey, number][]) {
    if (!area) continue;
    const qty = area * waste, price = prices.mats[k] ?? 0;
    lines.push({ label: MATS[k].name, qty, unit: 'm²', price, total: qty * price, group: 'material' });
  }
  const edge = Object.values(u.edge).reduce((s, v) => s + (v ?? 0), 0);
  if (edge > 0) lines.push({ label: 'Canto PVC', qty: edge, unit: 'm', price: prices.edge, total: edge * prices.edge, group: 'material' });
  if (u.back > 0) lines.push({ label: 'Fondos MDF 6 mm', qty: u.back * waste, unit: 'm²', price: prices.back, total: u.back * waste * prices.back, group: 'material' });
  if (u.slides) lines.push({ label: 'Correderas (pares)', qty: u.slides, unit: 'u', price: prices.slide, total: u.slides * prices.slide, group: 'herraje' });
  if (u.handles) lines.push({ label: 'Tiradores', qty: u.handles, unit: 'u', price: prices.handle, total: u.handles * prices.handle, group: 'herraje' });
  if (u.legs) lines.push({ label: 'Patas metálicas', qty: u.legs, unit: 'u', price: prices.leg, total: u.legs * prices.leg, group: 'herraje' });
  if (u.tube > 0) lines.push({ label: 'Perfil metálico', qty: u.tube * waste, unit: 'm', price: prices.tube, total: u.tube * waste * prices.tube, group: 'material' });
  for (const [k, q] of Object.entries(u.hw) as [HwKey, number][]) {
    if (!q) continue;
    const price = prices[k as Exclude<HwKey, 'slide' | 'handle'>] ?? 0;
    lines.push({ label: HW_NAMES[k], qty: q, unit: 'u', price, total: q * price, group: 'herraje' });
  }
  const materials = lines.filter((l) => l.group === 'material').reduce((s, l) => s + l.total, 0);
  const hardware = lines.filter((l) => l.group === 'herraje').reduce((s, l) => s + l.total, 0);
  const labor = (materials + hardware) * prices.labor / 100;
  return { lines, materials, hardware, labor, total: materials + hardware + labor };
}

/** Material de cada pieza si se aplicara un acabado (las piezas metálicas no cambian). */
export function finishMat(f: Finish) {
  const isTop = (p: Piece) => p.type === 'tablero' || p.type === 'tableroL' || p.type === 'estante';
  return (p: Piece): MatKey => (isMetal(p.mat) ? p.mat : isTop(p) ? f.top : f.structure);
}

export function money(n: number, currency = 'USD'): string {
  try {
    return n.toLocaleString('es', { style: 'currency', currency, maximumFractionDigits: n >= 1000 ? 0 : 2 });
  } catch {
    return '$ ' + n.toFixed(2);
  }
}
