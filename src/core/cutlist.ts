// Despiece: convierte cada pieza del modelo en las tablas y herrajes que fabrica el carpintero.
import { T, matOf, MATS } from './catalog';
import { cajoneraFronts, lRadius } from './geometry';
import { fmt } from './format';
import type { CutRow, Piece, PieceTemplate } from './types';

/** Texto corto de medidas para listas. */
export function pieceLabel(p: Piece | (PieceTemplate & { type: Piece['type'] })): string {
  if (p.type === 'patar') return 'ø ' + fmt(p.w) + ' × ' + fmt(p.h);
  if (p.type === 'tableroL') return 'L ' + fmt(p.w) + ' × ' + fmt(p.d) + ', fondo ' + fmt(p.c ?? 60);
  if (p.type === 'cajonera') return fmt(p.w) + ' × ' + fmt(p.h) + ' × ' + fmt(p.d) + ', ' + (p.n ?? 3) + ' caj.';
  return fmt(p.w) + ' × ' + fmt(p.h) + ' × ' + fmt(p.d);
}

/** Largo × ancho × espesor (de mayor a menor). */
function md(a: number, b: number, c: number): string {
  const s = [a, b, c].sort((x, y) => y - x);
  return fmt(s[0]) + ' × ' + fmt(s[1]) + ' × ' + fmt(s[2]);
}

export function partsOf(p: Piece): CutRow[] {
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
