// Utilidades sin dependencias: formato de números, redondeos y nombres de archivo.

export const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('es', { maximumFractionDigits: 1 });

/** Redondea a medio centímetro. */
export const r5 = (n) => Math.round(n * 2) / 2;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const clone = (o) => JSON.parse(JSON.stringify(o));

export function slug(s) {
  return (s || 'escritorio').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'escritorio';
}
