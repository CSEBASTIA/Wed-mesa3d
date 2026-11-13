// Acciones de alto nivel que usan la interfaz y el teclado (agregar, duplicar, girar, apoyar...).
import { TYPES, EXTRA_KEYS } from './catalog.js';
import { box, bounds, overlapXZ } from './geometry.js';
import { r5, clone } from '../utils/format.js';

export function createActions(store) {
  return {
    addPiece(type) {
      const t = TYPES[type];
      const p = { id: store.newId(), type, name: t.name, w: t.w, h: t.h, d: t.d, x: 0, y: 0, z: 0, rot: 0, mat: t.mat };
      EXTRA_KEYS.forEach((k) => { if (t[k] != null) p[k] = t[k]; });
      // delante del mueble, en un hueco libre
      const B = bounds(store.pieces);
      if (B) { p.z = r5(B.z1 + 15 + p.d / 2); p.x = r5(B.x0 + p.w / 2); }
      for (let i = 0; i < 40; i++) {
        const b = box(p);
        if (!store.pieces.some((o) => { const ob = box(o); return overlapXZ(b, ob) && ob.y0 < b.y1; })) break;
        p.x += 10;
      }
      store.add(p);
      return p;
    },
    removeSelected() { if (store.selId) store.remove(store.selId); },
    duplicateSelected() {
      const p = store.selected(); if (!p) return;
      const c = clone(p); c.id = store.newId(); c.x += 10; c.z += 10; c.open = false;
      store.add(c);
    },
    rotateSelected() { const p = store.selected(); if (p) store.update(p.id, { rot: (p.rot + 1) % 4 }); },
    /** Baja la pieza hasta el piso o hasta la pieza que tenga debajo. */
    dropSelected() {
      const p = store.selected(); if (!p) return;
      const b = box(p); let y = 0;
      store.pieces.forEach((o) => {
        if (o === p) return;
        const ob = box(o);
        if (overlapXZ(b, ob) && ob.y1 <= p.y + 0.05 && ob.y1 > y) y = ob.y1;
      });
      store.update(p.id, { y }, { geometry: false });
    },
    toggleDrawer() { const p = store.selected(); if (p && p.type === 'cajon') store.update(p.id, { open: !p.open }); },
    flipCorner() { const p = store.selected(); if (p && p.type === 'tableroL') store.update(p.id, { flip: !p.flip }); },
    nudgeSelected(dx, dy, dz) {
      const p = store.selected(); if (!p) return;
      store.update(p.id, { x: p.x + dx, y: Math.max(0, p.y + dy), z: p.z + dz }, { geometry: false });
    },
    clearAll() { if (store.pieces.length) store.replaceAll([], null); }
  };
}
