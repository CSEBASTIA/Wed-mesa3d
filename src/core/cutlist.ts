// Despiece: convierte cada pieza del modelo en las tablas y herrajes que fabrica el carpintero.
import { T, matOf, MATS } from './catalog';
import { cajoneraFronts, lRadius } from './geometry';
import { fmt } from './format';
import { compose, partMat, HW_NAMES, type HwKey } from './parts';
import type { CutRow, Piece, PieceTemplate } from './types';

/** Texto corto de medidas para listas. */
export function pieceLabel(p: Piece | (PieceTemplate & { type: Piece['type'] })): string {
  if (p.type === 'patar' || p.type === 'pataConica' || p.type === 'pataTorneada') return 'ø ' + fmt(p.w) + ' × ' + fmt(p.h);
  if (p.type === 'pasacables') return 'ø ' + fmt(p.w);
  if ((p.type === 'cajoneraMovil') && p.n) return fmt(p.w) + ' × ' + fmt(p.h) + ' × ' + fmt(p.d) + ', ' + p.n + ' caj.';
  if (p.type === 'tableroL') return 'L ' + fmt(p.w) + ' × ' + fmt(p.d) + ', fondo ' + fmt(p.c ?? 60);
  if (p.type === 'cajonera') return fmt(p.w) + ' × ' + fmt(p.h) + ' × ' + fmt(p.d) + ', ' + (p.n ?? 3) + ' caj.';
  return fmt(p.w) + ' × ' + fmt(p.h) + ' × ' + fmt(p.d);
}

/** Largo × ancho × espesor (de mayor a menor). */
function md(a: number, b: number, c: number): string {
  const s = [a, b, c].sort((x, y) => y - x);
  return fmt(s[0]) + ' × ' + fmt(s[1]) + ' × ' + fmt(s[2]);
}

/** Despiece de una pieza compuesta: tablas, tubos, piezas torneadas y herrajes. */
function composedRows(p: Piece): CutRow[] | null {
  const comp = compose(p);
  if (!comp) return null;
  const out: CutRow[] = [];
  for (const part of comp.parts) {
    if (part.cut === false) continue;
    const mat = matOf(partMat(part, p)), [w, h, d] = part.size;
    const name = p.name + ' · ' + part.name.toLowerCase();
    if (part.shape === 'cyl' || part.shape === 'cone') {
      out.push({ name, q: 1, txt: (part.shape === 'cone' ? 'Cónica ø ' + fmt(w) + '→' + fmt(part.d2 ?? w) : 'ø ' + fmt(w)) + ' × ' + fmt(h) + ' de largo', mat: mat.name });
    } else if (mat.family === 'metal') {
      const s = [w, h, d].sort((x, y) => y - x);
      const txt = s[2] < 1
        ? 'Chapa ' + fmt(s[1]) + ' cm × ' + fmt(s[2] * 10) + ' mm, largo ' + fmt(s[0]) + ' cm'
        : 'Perfil ' + fmt(s[1] * 10) + '×' + fmt(s[2] * 10) + ' mm, largo ' + fmt(s[0]) + ' cm';
      out.push({ name, q: 1, txt, mat: mat.name });
    } else {
      out.push({ name, q: 1, txt: md(w, h, d), mat: mat.name });
    }
  }
  for (const [k, q] of Object.entries(comp.hw ?? {}) as [HwKey, number][]) {
    if (q) out.push({ name: HW_NAMES[k], q, txt: 'Herraje estándar', mat: 'Herraje' }); // se suman entre piezas
  }
  return out;
}

export function partsOf(p: Piece): CutRow[] {
  const composed = composedRows(p);
  if (composed) return composed;
  const m = matOf(p.mat).name, out: CutRow[] = [];
  const add = (name: string, q: number, txt: string, mat?: string) => out.push({ name, q, txt, mat: mat ?? m });
  switch (p.type) {
    case 'tableroL':
      add(p.name, 1, 'En L: a ' + fmt(p.w) + ' × b ' + fmt(p.d) + ', fondo c ' + fmt(p.c ?? 60) + ', esp. ' + fmt(p.h) +
        (lRadius(p) > 0.5 ? ', curva R ' + fmt(lRadius(p)) : ''));
      break;
    case 'patar':
      add(p.name, 1, 'ø ' + fmt(p.w) + ' × ' + fmt(p.h) + ' de alto');
      break;
    case 'cajonera': {
      const { w, h, d } = p, zoc = p.zoc ?? 8, dc = d - T, fr = cajoneraFronts(p);
      add('Cajonera · costado', 2, md(h, dc, T));
      add('Cajonera · techo y base', 2, md(w - 2 * T, dc, T));
      add('Cajonera · fondo trasero', 1, md(w - 2 * T, h - zoc - 2 * T, 0.6), 'MDF 6 mm');
      add('Cajonera · zócalo', 1, md(w - 2 * T, zoc, T), MATS.negro.name);
      add('Cajonera · frente de cajón', fr.length, md(w - 0.4, fr[0].fh, T));
      add('Cajonera · caja interior de cajón', fr.length,
        fmt(w - 2 * T - 2.6) + ' ancho × ' + fmt(Math.max(5, fr[0].fh - 4)) + ' alto × ' + fmt(dc - 5) + ' fondo');
      add('Correderas', fr.length, 'pares de ' + fmt(Math.floor((dc - 5) / 5) * 5) + ' cm', 'Herraje');
      add('Tiradores', fr.length, fmt(Math.min(w * 0.35, 14)) + ' cm', 'Herraje');
      break;
    }
    case 'cajon': {
      const t = Math.min(1.5, p.w / 4, p.h / 4, p.d / 4);
      add('Cajón · frente', 1, md(p.w, p.h, t));
      add('Cajón · costado', 2, md(p.d - t, p.h - 1, t));
      add('Cajón · trasera', 1, md(p.w - 2 * t, p.h - 1, t));
      add('Cajón · fondo', 1, md(p.w - 2 * t, p.d - t, t));
      break;
    }
    default:
      add(p.name, 1, md(p.w, p.h, p.d));
  }
  return out;
}

/** Despiece agrupado: piezas iguales se suman en una sola fila. */
export function cutList(pieces: Piece[]): CutRow[] {
  const map = new Map<string, CutRow>();
  for (const p of pieces) {
    for (const r of partsOf(p)) {
      const name = r.name.replace(/ (izquierd[oa]|derech[oa]|tramo [ab])$/i, '');
      const key = name + '|' + r.txt + '|' + r.mat;
      const row = map.get(key);
      if (row) row.q += r.q; else map.set(key, { ...r, name });
    }
  }
  return [...map.values()];
}
