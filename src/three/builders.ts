// Convierte una pieza del modelo en un grupo de mallas de three.js, centrado en la pieza.
import * as THREE from 'three';
import { T } from '../core/catalog';
import { lShape, cajoneraFronts } from '../core/geometry';
import type { Piece, PieceType } from '../core/types';
import { material, edgeMat } from './materials';
import { compose, partMat } from '../core/parts';

function part(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0): THREE.Mesh {
  const geo = new THREE.BoxGeometry(Math.max(w, 0.1), Math.max(h, 0.1), Math.max(d, 0.1));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
  return m;
}

type Builder = (g: THREE.Group, p: Piece, mat: THREE.Material, prev?: THREE.Group) => void;

const builders: Partial<Record<PieceType, Builder>> = {
  patar(g, p, mat) {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(p.w / 2, p.w / 2, p.h, 28), mat);
    cyl.castShadow = true; cyl.receiveShadow = true; g.add(cyl);
  },

  tableroL(g, p, mat) {
    const shape = new THREE.Shape(lShape(p).map(([x, z]) => new THREE.Vector2(x, z)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: p.h, bevelEnabled: false, curveSegments: 4 });
    geo.rotateX(Math.PI / 2); geo.translate(0, p.h / 2, 0);
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 120, uv.getY(i) / 120);
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat));
    g.add(mesh);
  },

  cajonera(g, p, mat) {
    const { w, h, d } = p, zoc = p.zoc ?? 8, dc = d - T, zc = -T / 2;
    g.add(part(T, h, dc, mat, -(w / 2 - T / 2), 0, zc));
    g.add(part(T, h, dc, mat, w / 2 - T / 2, 0, zc));
    g.add(part(w - 2 * T, T, dc, mat, 0, h / 2 - T / 2, zc));
    g.add(part(w - 2 * T, T, dc, mat, 0, -h / 2 + zoc + T / 2, zc));
    g.add(part(w - 2 * T, h - zoc - 2 * T, 0.6, mat, 0, zoc / 2, zc - dc / 2 + 0.3));
    g.add(part(w - 2 * T, zoc, T, material('negro'), 0, -h / 2 + zoc / 2, d / 2 - T - 3));
    for (const f of cajoneraFronts(p)) {
      g.add(part(w - 0.4, f.fh, T, mat, 0, f.cy, d / 2 - T / 2));
      g.add(part(Math.min(w * 0.35, 14), 1.2, 2.2, material('metal'), 0, f.cy + f.fh * 0.25, d / 2 + 1.1));
    }
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
    const prevSlide = prev?.userData.slide as THREE.Group | undefined;
    slide.position.z = prevSlide ? prevSlide.position.z : slide.userData.open;
    g.add(slide); g.userData.slide = slide;
  }
};

const fallback: Builder = (g, p, mat) => { g.add(part(p.w, p.h, p.d, mat)); };

/** Piezas compuestas (core/parts.ts): cada parte es una caja, un cilindro o un cono. */
function buildComposed(g: THREE.Group, p: Piece): boolean {
  const comp = compose(p);
  if (!comp) return false;
  for (const part of comp.parts) {
    const mat = material(partMat(part, p));
    const [w, h, d] = part.size;
    let mesh: THREE.Mesh;
    if (part.shape === 'cyl' || part.shape === 'cone') {
      const geo = new THREE.CylinderGeometry(w / 2, (part.shape === 'cone' ? part.d2 ?? w : w) / 2, h, 28);
      mesh = new THREE.Mesh(geo, mat);
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 40), edgeMat));
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.position.set(...part.at);
    } else {
      mesh = part3(w, h, d, mat, part.at);
    }
    if (part.rot) mesh.rotation.set(...part.rot);
    g.add(mesh);
  }
  return true;
}
const part3 = (w: number, h: number, d: number, mat: THREE.Material, at: [number, number, number]) => part(w, h, d, mat, at[0], at[1], at[2]);

/** @param prev grupo anterior de la misma pieza (para conservar animaciones) */
export function buildPiece(p: Piece, prev?: THREE.Group): THREE.Group {
  const g = new THREE.Group();
  if (!buildComposed(g, p)) (builders[p.type] ?? fallback)(g, p, material(p.mat), prev);
  g.userData.id = p.id;
  return g;
}
