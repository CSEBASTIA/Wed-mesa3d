// Catálogo de piezas y materiales. Agregar una pieza nueva empieza aquí:
// 1) declararla en TYPES, 2) construir su malla en three/builders.js, 3) su despiece en core/cutlist.js.

/** Grosor estándar de melamina / aglomerado, en cm. */
export const T = 1.8;

export const TYPES = {
  tablero:  { name: 'Tablero',        w: 120, h: 2.5,  d: 60,  mat: 'roble' },
  tableroL: { name: 'Tablero en L',   w: 160, h: 2.5,  d: 120, mat: 'roble', c: 60, r: 20 },
  lateral:  { name: 'Panel lateral',  w: 2.5, h: 72.5, d: 58,  mat: 'blanco' },
  estante:  { name: 'Estante',        w: 60,  h: 1.8,  d: 30,  mat: 'roble' },
  faldon:   { name: 'Faldón trasero', w: 110, h: 30,   d: 1.8, mat: 'blanco' },
  pata:     { name: 'Pata cuadrada',  w: 5,   h: 72.5, d: 5,   mat: 'negro' },
  patar:    { name: 'Pata redonda',   w: 5,   h: 72.5, d: 5,   mat: 'metal' },
  cajonera: { name: 'Cajonera',       w: 45,  h: 73,   d: 55,  mat: 'blanco', n: 3, zoc: 8 },
  cajon:    { name: 'Cajón suelto',   w: 40,  h: 13,   d: 45,  mat: 'roble' }
};

/** Propiedades opcionales que algunas piezas guardan además de w, h, d. */
export const EXTRA_KEYS = ['c', 'r', 'n', 'zoc'];

export const MATS = {
  roble:  { name: 'Roble', base: '#c9a26b', grain: '#a67c45', wood: true },
  nogal:  { name: 'Nogal', base: '#6e4629', grain: '#4a2d18', wood: true },
  pino:   { name: 'Pino',  base: '#e3c896', grain: '#c8a468', wood: true },
  blanco: { name: 'Melamina blanca', base: '#efefec' },
  gris:   { name: 'Melamina gris', base: '#8c9196' },
  negro:  { name: 'Negro mate', base: '#2b2d31' },
  metal:  { name: 'Metal', base: '#a3acb6', metal: true }
};

export const matOf = (key) => MATS[key] || MATS.roble;

/** Campos extra que muestra la ficha de la pieza: [clave, etiqueta]. */
export const EXTRA_FIELDS = {
  tableroL: [['c', 'c · Fondo del tablero'], ['r', 'Radio de la curva']],
  cajonera: [['n', 'Cajones'], ['zoc', 'Zócalo']]
};

/** Límites de cada propiedad editable. */
export function limitValue(p, key, v) {
  const c = (lo, hi) => Math.max(lo, Math.min(hi, v));
  switch (key) {
    case 'w': case 'h': case 'd': return c(0.5, 400);
    case 'y': return c(0, 300);
    case 'x': case 'z': return c(-400, 400);
    case 'n': return Math.round(c(1, 6));
    case 'zoc': return c(0, p.h / 3);
    case 'c': return c(10, Math.min(p.w, p.d) - 10);
    case 'r': return c(0, 100);
    default: return v;
  }
}
