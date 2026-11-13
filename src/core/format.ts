// Utilidades sin dependencias: formato de números, redondeos y nombres de archivo.

export const fmt = (n: number): string =>
  (Math.round(n * 10) / 10).toLocaleString('es', { maximumFractionDigits: 1 });

/** Redondea a medio centímetro. */
export const r5 = (n: number): number => Math.round(n * 2) / 2;

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o)) as T;

export function slug(s: string): string {
  return (s || 'escritorio').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'escritorio';
}
