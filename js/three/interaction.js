// Arrastrar piezas con el mouse o el dedo, con imán a las caras de las demás piezas.
import { box } from '../core/geometry.js';
import { r5, clamp } from '../utils/format.js';

const THREE = window.THREE;
const MAGNET = 2.5; // cm

/** Pega la cara lo/hi de la pieza a las caras a/b de las demás si están cerca. */
function magnet(v, lo, hi, others, a, b) {
  let best = MAGNET, out = v;
  others.forEach((o) => {
    [o[a], o[b]].forEach((edge) => {
      [lo, hi].forEach((mine) => {
        const dlt = edge - (v + mine);
        if (Math.abs(dlt) < best) { best = Math.abs(dlt); out = v + dlt; }
      });
    });
  });
  return out;
}

export function attachInteraction(vp, store) {
  const el = vp.el, plane = new THREE.Plane(), hit = new THREE.Vector3();
  let drag = null, down = null;

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    down = { x: e.clientX, y: e.clientY };
    const h = vp.pick(e);
    if (!h) return;
    const p = store.byId(h.id);
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
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
  }, true);

  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    if (!vp.rayFromEvent(e).ray.intersectPlane(plane, hit)) return;
    const p = store.byId(drag.id); if (!p) return;
    const b = box(p);
    const others = store.snapOn ? store.pieces.filter((o) => o.id !== p.id).map(box) : [];
    const patch = {};
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
  });

  function end(e) {
    if (drag) {
      const moved = drag.moved;
      try { el.releasePointerCapture(drag.pid); } catch (err) { /* nada */ }
      drag = null; vp.controls.enabled = true;
      if (moved) store.commit();
    } else if (down && e && Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) < 5) {
      store.select(null); // clic en el fondo: deseleccionar
    }
    down = null;
  }
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => end(null));

  el.addEventListener('dblclick', (e) => {
    const h = vp.pick(e); if (!h) return;
    const p = store.byId(h.id);
    if (p.type === 'cajon') store.update(p.id, { open: !p.open });
  });
}
