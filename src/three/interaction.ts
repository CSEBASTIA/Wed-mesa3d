// Arrastrar piezas con el mouse o el dedo, con imán a las caras de las demás piezas.
import * as THREE from 'three';
import { box } from '../core/geometry';
import { r5, clamp } from '../core/format';
import type { Store } from '../core/store';
import type { Box, Piece } from '../core/types';
import type { Viewport } from './viewport';

const MAGNET = 2.5; // cm

type Edge = 'x0' | 'x1' | 'y0' | 'y1' | 'z0' | 'z1';

/** Pega la cara lo/hi de la pieza a las caras a/b de las demás si están cerca. */
function magnet(v: number, lo: number, hi: number, others: Box[], a: Edge, b: Edge): number {
  let best = MAGNET, out = v;
  for (const o of others) {
    for (const edge of [o[a], o[b]]) {
      for (const mine of [lo, hi]) {
        const dlt = edge - (v + mine);
        if (Math.abs(dlt) < best) { best = Math.abs(dlt); out = v + dlt; }
      }
    }
  }
  return out;
}

interface Drag { id: string; vertical: boolean; ox: number; oy: number; oz: number; moved: boolean; pid: number }

/** Conecta el puntero con el modelo. Devuelve una función para desconectar. */
export function attachInteraction(vp: Viewport, store: Store): () => void {
  const el = vp.el, plane = new THREE.Plane(), hit = new THREE.Vector3();
  let drag: Drag | null = null, down: { x: number; y: number } | null = null;

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    down = { x: e.clientX, y: e.clientY };
    const h = vp.pick(e);
    if (!h) return;
    const p = store.byId(h.id)!;
    store.select(h.id);
    const vertical = store.vertOn || e.shiftKey;
    if (vertical) {
      const n = new THREE.Vector3(); vp.camera.getWorldDirection(n); n.y = 0;
      if (n.lengthSq() < 1e-4) n.set(0, 0, -1);
      plane.setFromNormalAndCoplanarPoint(n.normalize(), h.point);
    } else {
      plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), h.point);
    }
    drag = { id: h.id, vertical, ox: p.x - h.point.x, oy: p.y - h.point.y, oz: p.z - h.point.z, moved: false, pid: e.pointerId };
    vp.controls.enabled = false;
    try { el.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!vp.rayFromEvent(e).ray.intersectPlane(plane, hit)) return;
    const p = store.byId(drag.id); if (!p) return;
    const b = box(p);
    const others = store.snapOn ? store.pieces.filter((o) => o.id !== p.id).map(box) : [];
    const patch: Partial<Piece> = {};
    if (drag.vertical) {
      let y = hit.y + drag.oy;
      if (store.snapOn) y = magnet(r5(y), 0, p.h, others, 'y0', 'y1');
      patch.y = Math.max(0, y);
    } else {
      let x = hit.x + drag.ox, z = hit.z + drag.oz;
      if (store.snapOn) {
        x = magnet(r5(x), -b.sx / 2, b.sx / 2, others, 'x0', 'x1');
        z = magnet(r5(z), -b.sz / 2, b.sz / 2, others, 'z0', 'z1');
      }
      patch.x = clamp(x, -400, 400); patch.z = clamp(z, -400, 400);
    }
    drag.moved = true;
    store.update(p.id, patch, { geometry: false, commit: false });
  };

  const end = (e: PointerEvent | null) => {
    if (drag) {
      const moved = drag.moved;
      try { el.releasePointerCapture(drag.pid); } catch { /* nada */ }
      drag = null; vp.controls.enabled = true;
      if (moved) store.commit();
    } else if (down && e && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 5) {
      store.select(null); // clic en el fondo: deseleccionar
    }
    down = null;
  };
  const onUp = (e: PointerEvent) => end(e);
  const onCancel = () => end(null);
  const onDbl = (e: MouseEvent) => {
    const h = vp.pick(e); if (!h) return;
    const p = store.byId(h.id);
    if (p?.type === 'cajon') store.update(p.id, { open: !p.open });
  };

  el.addEventListener('pointerdown', onDown, true);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onCancel);
  el.addEventListener('dblclick', onDbl);
  return () => {
    el.removeEventListener('pointerdown', onDown, true);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onCancel);
    el.removeEventListener('dblclick', onDbl);
  };
}
