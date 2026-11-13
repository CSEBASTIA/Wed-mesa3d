// Arrastrar piezas con el mouse o el dedo, con imán a las caras de las demás piezas.
import * as THREE from 'three';
import { box } from '../core/geometry';
import { r5, clamp } from '../core/format';
import type { Store } from '../core/store';
import type { Box, Piece } from '../core/types';
import type { Viewport } from './viewport';
import { normRot } from '../core/actions';

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
interface Spin { id: string; a0: number; rot0: number; moved: boolean; pid: number }

const SNAP_DEG = 15;

/** Conecta el puntero con el modelo. Devuelve una función para desconectar. */
export function attachInteraction(vp: Viewport, store: Store): () => void {
  const el = vp.el, plane = new THREE.Plane(), hit = new THREE.Vector3();
  let drag: Drag | null = null, spin: Spin | null = null, down: { x: number; y: number } | null = null;
  let downOnPiece = false;

  /** Ángulo del puntero alrededor del centro de la pieza, en el plano del aro (mismo sentido que rotation.y). */
  const pointerAngle = (e: PointerEvent, p: Piece): number | null => {
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), vp.ring.position);
    if (!vp.rayFromEvent(e).ray.intersectPlane(plane, hit)) return null;
    return Math.atan2(-(hit.z - p.z), hit.x - p.x);
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    down = { x: e.clientX, y: e.clientY };
    // 1) el aro de giro de la pieza seleccionada tiene prioridad
    const sel = store.selected();
    if (sel && vp.pickRing(e)) {
      const a0 = pointerAngle(e, sel);
      if (a0 != null) {
        spin = { id: sel.id, a0, rot0: sel.rot, moved: false, pid: e.pointerId };
        vp.controls.enabled = false;
        try { el.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
        e.stopPropagation();
        return;
      }
    }
    // 2) solo se arrastra la pieza ya seleccionada (con doble clic). Sobre cualquier otra, la cámara gira normal.
    const h = vp.pick(e);
    downOnPiece = !!h;
    if (!h || h.id !== store.selId) return;
    const p = store.byId(h.id)!;
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
    if (spin && e.pointerId === spin.pid) {
      const p = store.byId(spin.id); if (!p) return;
      const a = pointerAngle(e, p); if (a == null) return;
      let deg = (spin.rot0 * 90) + THREE.MathUtils.radToDeg(a - spin.a0);
      // con el imán, saltos de 15°; sin imán (o con Alt), giro libre
      if (store.snapOn && !e.altKey) deg = Math.round(deg / SNAP_DEG) * SNAP_DEG;
      spin.moved = true;
      store.update(p.id, { rot: normRot(deg / 90) }, { geometry: false, commit: false });
      return;
    }
    if (!drag) {
      if (e.buttons) return; // girando la cámara
      // cursor: aro → girar; pieza seleccionada → mover; otra pieza → se puede activar con doble clic
      const overRing = !!store.selected() && vp.pickRing(e);
      vp.hoverRing(overRing);
      const h = overRing ? null : vp.pick(e);
      el.style.cursor = overRing ? 'grab' : h ? (h.id === store.selId ? 'move' : 'pointer') : '';
      return;
    }
    if (e.pointerId !== drag.pid) return;
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
      patch.x = clamp(x, -1500, 1500); patch.z = clamp(z, -1500, 1500);
    }
    drag.moved = true;
    store.update(p.id, patch, { geometry: false, commit: false });
  };

  const end = (e: PointerEvent | null) => {
    if (spin) {
      const moved = spin.moved;
      try { el.releasePointerCapture(spin.pid); } catch { /* nada */ }
      spin = null; vp.controls.enabled = true;
      if (moved) store.commit();
      down = null;
      return;
    }
    if (drag) {
      const moved = drag.moved;
      try { el.releasePointerCapture(drag.pid); } catch { /* nada */ }
      drag = null; vp.controls.enabled = true;
      if (moved) store.commit();
    } else if (down && e && !downOnPiece && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 5) {
      store.select(null); // clic en el fondo: deseleccionar
    }
    down = null; downOnPiece = false;
  };
  const onUp = (e: PointerEvent) => end(e);
  const onCancel = () => end(null);
  /** Doble clic: activa la pieza para moverla o editarla. En un cajón ya activo, lo abre o cierra. */
  const onDbl = (e: MouseEvent) => {
    const h = vp.pick(e); if (!h) return;
    const p = store.byId(h.id); if (!p) return;
    if (p.id !== store.selId) { store.select(p.id); el.style.cursor = 'move'; return; }
    if (p.type === 'cajon') store.update(p.id, { open: !p.open });
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
