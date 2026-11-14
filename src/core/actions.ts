// Acciones de alto nivel que usan la interfaz y el teclado (agregar, duplicar, girar, apoyar...).
import { TYPES, EXTRA_KEYS } from './catalog';
import { box, bounds, overlapXZ } from './geometry';
import { constrainMove, fitsInRoom, pointInPolygon } from './collide';
import { normalizeRoom, roomBounds } from './room';
import { r5, clone } from './format';
import type { Store } from './store';
import type { Piece, PieceType } from './types';

/** Deja el giro entre 0 y 4 cuartos de vuelta, redondeado a décimas de grado. */
export const normRot = (r: number): number => {
  const q = ((r % 4) + 4) % 4;
  return Math.round(q * 900) / 900;
};

export function createActions(store: Store) {
  /** ¿Este cambio haría que la pieza atraviese una pared? (si ya estaba fuera, no se bloquea) */
  const blockedByWall = (p: Piece, patch: Partial<Piece>) =>
    !!store.room && pointInPolygon(normalizeRoom(store.room).points, [p.x, p.z]) && !fitsInRoom(store.room, { ...p, ...patch });
  return {
    addPiece(type: PieceType): Piece {
      const t = TYPES[type];
      const p: Piece = { id: store.newId(), type, name: t.name, w: t.w, h: t.h, d: t.d, x: 0, y: 0, z: 0, rot: 0, mat: t.mat };
      for (const k of EXTRA_KEYS) if (t[k] != null) p[k] = t[k];
      const free = (q: Piece) => {
        const b = box(q);
        return !store.pieces.some((o) => { const ob = box(o); return overlapXZ(b, ob) && ob.y0 < b.y1; });
      };
      if (store.room) {
        // con habitación: el hueco libre más cercano al centro, dentro de las paredes
        const rb = roomBounds(store.room), cx = (rb.x0 + rb.x1) / 2, cz = (rb.z0 + rb.z1) / 2;
        const spots: [number, number][] = [];
        for (let x = rb.x0; x <= rb.x1; x += 10) for (let z = rb.z0; z <= rb.z1; z += 10) spots.push([x, z]);
        spots.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz));
        const spot = spots.find(([x, z]) => { const q = { ...p, x, z }; return fitsInRoom(store.room!, q) && free(q); })
          ?? spots.find(([x, z]) => fitsInRoom(store.room!, { ...p, x, z }));
        if (spot) { p.x = r5(spot[0]); p.z = r5(spot[1]); }
      } else {
        // sin habitación: delante del mueble, en un hueco libre
        const B = bounds(store.pieces);
        if (B) { p.z = r5(B.z1 + 15 + p.d / 2); p.x = r5(B.x0 + p.w / 2); }
        for (let i = 0; i < 40 && !free(p); i++) p.x += 10;
      }
      store.add(p);
      return p;
    },
    removeSelected(): void { if (store.selId) store.remove(store.selId); },
    duplicateSelected(): void {
      const p = store.selected(); if (!p) return;
      const c = clone(p); c.id = store.newId(); c.open = false;
      const to = constrainMove(store.room, c, c.x + 10, c.z + 10);
      c.x = to.x; c.z = to.z;
      store.add(c);
    },
    /** Gira la pieza seleccionada los grados indicados (por defecto 90°). No gira si atravesaría una pared. */
    rotateSelected(deg = 90): boolean {
      const p = store.selected(); if (!p) return false;
      const rot = normRot(p.rot + deg / 90);
      if (blockedByWall(p, { rot })) return false;
      store.update(p.id, { rot });
      return true;
    },
    /** Fija el giro en grados. */
    setAngle(deg: number): boolean {
      const p = store.selected(); if (!p) return false;
      const rot = normRot(deg / 90);
      if (blockedByWall(p, { rot })) return false;
      store.update(p.id, { rot });
      return true;
    },
    /** Lleva la pieza seleccionada a una posición, sin atravesar paredes. */
    moveSelectedTo(x: number, z: number, commit = true): void {
      const p = store.selected(); if (!p) return;
      store.update(p.id, constrainMove(store.room, p, x, z), { geometry: false, commit });
    },
    /** Baja la pieza hasta el piso o hasta la pieza que tenga debajo. */
    dropSelected(): void {
      const p = store.selected(); if (!p) return;
      const b = box(p); let y = 0;
      for (const o of store.pieces) {
        if (o === p) continue;
        const ob = box(o);
        if (overlapXZ(b, ob) && ob.y1 <= p.y + 0.05 && ob.y1 > y) y = ob.y1;
      }
      store.update(p.id, { y }, { geometry: false });
    },
    toggleDrawer(): void { const p = store.selected(); if (p?.type === 'cajon') store.update(p.id, { open: !p.open }); },
    flipCorner(): void { const p = store.selected(); if (p?.type === 'tableroL') store.update(p.id, { flip: !p.flip }); },
    nudgeSelected(dx: number, dy: number, dz: number): void {
      const p = store.selected(); if (!p) return;
      const to = constrainMove(store.room, p, p.x + dx, p.z + dz);
      store.update(p.id, { ...to, y: Math.max(0, p.y + dy) }, { geometry: false });
    },
    clearAll(): void { if (store.pieces.length) store.replaceAll([], null); }
  };
}

export type Actions = ReturnType<typeof createActions>;
