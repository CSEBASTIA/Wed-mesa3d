// Despiece: convierte cada pieza del modelo en las tablas y herrajes que fabrica el carpintero.
import { T, matOf, MATS } from './catalog.js';
import { cajoneraFronts, lRadius } from './geometry.js';
import { fmt } from '../utils/format.js';

/** Texto corto de medidas para la lista lateral. */
export function pieceLabel(p) {
  if (p.type === 'patar') return 'ø ' + fmt(p.w) + ' × ' + fmt(p.h);
  if (p.type === 'tableroL') return 'L ' + fmt(p.w) + ' × ' + fmt(p.d) + ', fondo ' + fmt(p.c);
  if (p.type === 'cajonera') return fmt(p.w) + ' × ' + fmt(p.h) + ' × ' + fmt(p.d) + ', ' + p.n + ' caj.';
  return fmt(p.w) + ' × ' + fmt(p.h) + ' × ' + fmt(p.d);
}

/** Largo × ancho × espesor (de mayor a menor). */
function md(a, b, c) {
  const s = [a, b, c].sort((x, y) => y - x);
  return fmt(s[0]) + ' × ' + fmt(s[1]) + ' × ' + fmt(s[2]);
}

export function partsOf(p) {
  const m = matOf(p.mat).name, out = [];
  const add = (name, q, txt, mat) => out.push({ name, q, txt, mat: mat || m });
  switch (p.type) {
    case 'tableroL':
      add(p.name, 1, 'En L: a ' + fmt(p.w) + ' × b ' + fmt(p.d) + ', fondo c ' + fmt(p.c) + ', esp. ' + fmt(p.h) +
        (lRadius(p) > 0.5 ? ', curva R ' + fmt(lRadius(p)) : ''));
      break;
    case 'patar':
      add(p.name, 1, 'ø ' + fmt(p.w) + ' × ' + fmt(p.h) + ' de alto');
      break;
    case 'cajonera': {
      const { w, h, d } = p, dc = d - T, fr = cajoneraFronts(p);
      add('Cajonera · costado', 2, md(h, dc, T));
      add('Cajonera · techo y base', 2, md(w - 2 * T, dc, T));
      add('Cajonera · fondo trasero', 1, md(w - 2 * T, h - p.zoc - 2 * T, 0.6), 'MDF 6 mm');
      add('Cajonera · zócalo', 1, md(w - 2 * T, p.zoc, T), MATS.negro.name);
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
export function cutList(pieces) {
  const map = {}, list = [];
  pieces.forEach((p) => {
    partsOf(p).forEach((r) => {
      const base = r.name.replace(/ (izquierd[oa]|derech[oa]|tramo [ab])$/i, '');
      const key = base + '|' + r.txt + '|' + r.mat;
      if (map[key]) map[key].q += r.q;
      else { map[key] = { name: base, q: r.q, txt: r.txt, mat: r.mat }; list.push(map[key]); }
    });
  });
  return list;
}
