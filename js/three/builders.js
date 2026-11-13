// Convierte una pieza del modelo en un grupo de mallas de three.js.
// El grupo queda centrado en la pieza; viewport.place() lo ubica en el mundo.
import { T } from '../core/catalog.js';
import { lShape, cajoneraFronts } from '../core/geometry.js';
import { material, edgeMat } from './materials.js';

const THREE = window.THREE;

function part(w, h, d, mat, x = 0, y = 0, z = 0) {
  const geo = new THREE.BoxGeometry(Math.max(w, 0.1), Math.max(h, 0.1), Math.max(d, 0.1));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
  return m;
}

const builders = {
  patar(g, p, mat) {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(p.w / 2, p.w / 2, p.h, 28), mat);
    cyl.castShadow = true; cyl.receiveShadow = true; g.add(cyl);
  },

  tableroL(g, p, mat) {
    const shape = new THREE.Shape(lShape(p).map(([x, z]) => new THREE.Vector2(x, z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: p.h, bevelEnabled: false, curveSegments: 4 });
    geo.rotateX(Math.PI / 2); geo.translate(0, p.h / 2, 0);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 120, uv.getY(i) / 120);
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat));
    g.add(mesh);
  },

  cajonera(g, p, mat) {
    const { w, h, d, zoc } = p, dc = d - T, zc = -T / 2;
    g.add(part(T, h, dc, mat, -(w / 2 - T / 2), 0, zc));
    g.add(part(T, h, dc, mat, w / 2 - T / 2, 0, zc));
    g.add(part(w - 2 * T, T, dc, mat, 0, h / 2 - T / 2, zc));
    g.add(part(w - 2 * T, T, dc, mat, 0, -h / 2 + zoc + T / 2, zc));
    g.add(part(w - 2 * T, h - zoc - 2 * T, 0.6, mat, 0, zoc / 2, zc - dc / 2 + 0.3));
    g.add(part(w - 2 * T, zoc, T, material('negro'), 0, -h / 2 + zoc / 2, d / 2 - T - 3));
    cajoneraFronts(p).forEach((f) => {
      g.add(part(w - 0.4, f.fh, T, mat, 0, f.cy, d / 2 - T / 2));
      g.add(part(Math.min(w * 0.35, 14), 1.2, 2.2, material('metal'), 0, f.cy + f.fh * 0.25, d / 2 + 1.1));
    });
  },

  cajon(g, p, mat, prev) {
    const t = Math.min(1.5, p.w / 4, p.h / 4, p.d / 4), slide = new THREE.Group();
    slide.add(part(p.w - 2 * t, t, p.d - t, mat, 0, -p.h / 2 + t / 2, -t / 2));
    slide.add(part(t, p.h - 1, p.d - t, mat, -p.w / 2 + t / 2, -0.5, -t / 2));
    slide.add(part(t, p.h - 1, p.d - t, mat, p.w / 2 - t / 2, -0.5, -t / 2));
    slide.add(part(p.w - 2 * t, p.h - 1, t, mat, 0, -0.5, -p.d / 2 + t / 2));
    slide.add(part(p.w, p.h, t, mat, 0, 0, p.d / 2 - t / 2));
    slide.add(part(Math.min(p.w * 0.35, 14), 1.2, 2.2, material('metal'), 0, 0, p.d / 2 + 1.1));
    slide.userData.open = p.open ? p.d * 0.7 : 0;
    // conserva la posición actual para que abrir/cerrar se anime
    slide.position.z = prev && prev.userData.slide ? prev.userData.slide.position.z : slide.userData.open;
    g.add(slide); g.userData.slide = slide;
  },

  default(g, p, mat) { g.add(part(p.w, p.h, p.d, mat)); }
};

/** @param prev grupo anterior de la misma pieza (para conservar animaciones) */
export function buildPiece(p, prev) {
  const g = new THREE.Group();
  (builders[p.type] || builders.default)(g, p, material(p.mat), prev);
  g.userData.id = p.id;
  return g;
}
