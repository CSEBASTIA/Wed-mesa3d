// Habitación en 3D: piso con textura, paredes con huecos para puertas y ventanas y vista "casa de muñecas":
// las paredes que quedan entre la cámara y el interior se recortan a un zócalo para poder ver adentro.
import * as THREE from 'three';
import { FLOORS, WALL_SIDES, WALL_T, normalizeRoom, roomBounds, wallFrame, wallLength, wallSegments, clampOpening } from '../core/room';
import type { FloorKind, Opening, Room, WallSide } from '../core/types';

const CUT_H = 14; // alto de la pared recortada

interface WallView { side: WallSide; full: THREE.Group; cut: THREE.Group; out: THREE.Vector2; at: THREE.Vector2 }

const floorCache = new Map<FloorKind, THREE.CanvasTexture>();

function floorTexture(kind: FloorKind): THREE.CanvasTexture {
  const hit = floorCache.get(kind); if (hit) return hit;
  const f = FLOORS[kind], c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = f.base; g.fillRect(0, 0, 512, 512);
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  if (kind === 'madera' || kind === 'roble-claro') {
    // tablas de 128 px de ancho (≈ 15 cm) con juntas desplazadas y vetas
    for (let row = 0; row < 4; row++) {
      const y = row * 128, off = rnd(0, 512);
      for (let k = -1; k < 2; k++) {
        const x = off + k * 512;
        g.fillStyle = `rgba(0,0,0,${rnd(0, 0.08)})`; g.fillRect(x, y, 512, 128);
        g.fillStyle = f.line; g.fillRect(x, y, 2, 128);
      }
      g.fillStyle = f.line; g.fillRect(0, y, 512, 2);
      g.strokeStyle = f.line; g.globalAlpha = 0.35;
      for (let i = 0; i < 10; i++) {
        const yy = y + rnd(8, 120); g.lineWidth = rnd(0.5, 1.5);
        g.beginPath(); g.moveTo(0, yy);
        for (let x = 0; x <= 512; x += 32) g.lineTo(x, yy + Math.sin(x / rnd(30, 60)) * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
  } else if (kind === 'ceramica') {
    g.fillStyle = f.line;
    for (let i = 0; i <= 4; i++) { g.fillRect(i * 128 - 1, 0, 3, 512); g.fillRect(0, i * 128 - 1, 512, 3); }
    for (let i = 0; i < 16; i++) { g.fillStyle = `rgba(255,255,255,${rnd(0, 0.06)})`; g.fillRect((i % 4) * 128 + 2, Math.floor(i / 4) * 128 + 2, 124, 124); }
  } else {
    // alfombra o cemento: textura de grano
    const n = kind === 'alfombra' ? 9000 : 2500;
    for (let i = 0; i < n; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${rnd(0.02, kind === 'alfombra' ? 0.12 : 0.06)})`;
      const s = kind === 'alfombra' ? rnd(1, 2.5) : rnd(2, 12);
      g.fillRect(rnd(0, 512), rnd(0, 512), s, s);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  floorCache.set(kind, t);
  return t;
}

const frameMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.6 });
const doorMat = new THREE.MeshStandardMaterial({ color: 0x8a6446, roughness: 0.7 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0xb5bcc4, roughness: 0.35, metalness: 0.8 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xbcd6e6, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false });

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.1), Math.max(h, 0.1), Math.max(d, 0.1)), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

/** Coloca una caja definida "a lo largo de la pared": u = posición a lo largo, v = altura, n = hacia afuera. */
function onWall(room: Room, side: WallSide, len: number, h: number, thick: number, u: number, v: number, n: number,
  mat: THREE.Material, shadow = true): THREE.Mesh {
  const fr = wallFrame(room, side);
  const x = fr.start[0] + fr.dir[0] * u + fr.out[0] * n, z = fr.start[1] + fr.dir[1] * u + fr.out[1] * n;
  const alongX = fr.dir[0] !== 0;
  return box(alongX ? len : thick, h, alongX ? thick : len, mat, x, v, z, shadow);
}

function buildOpening(room: Room, o: Opening): THREE.Group {
  const g = new THREE.Group(), side = o.wall, F = 5, D = WALL_T + 2;
  const { pos, width: w, height: h, sill } = o, mid = pos + w / 2, n = WALL_T / 2;
  // marco
  g.add(onWall(room, side, F, h, D, pos + F / 2, sill + h / 2, n, frameMat));
  g.add(onWall(room, side, F, h, D, pos + w - F / 2, sill + h / 2, n, frameMat));
  g.add(onWall(room, side, w, F, D, mid, sill + h - F / 2, n, frameMat));
  if (o.type === 'puerta') {
    g.add(onWall(room, side, w - 2 * F, h - F, 4, mid, (h - F) / 2, 2, doorMat));
    const hx = o.pos + w - F - 9;
    g.add(onWall(room, side, 12, 2, 3, hx, 100, -1, metalMat));
  } else {
    g.add(onWall(room, side, w, F, D, mid, sill + F / 2, n, frameMat));
    g.add(onWall(room, side, w - 2 * F, h - 2 * F, 1, mid, sill + h / 2, n, glassMat, false));
    if (w > 100) g.add(onWall(room, side, 4, h - 2 * F, 6, mid, sill + h / 2, n, frameMat));
    g.add(onWall(room, side, w + 10, 3, 8, mid, sill - 1.5, -3, frameMat)); // alféizar interior
  }
  return g;
}

export class RoomView {
  readonly group = new THREE.Group();
  private walls: WallView[] = [];
  private wallMat = new THREE.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.95 });
  private wallTopMat = new THREE.MeshStandardMaterial({ color: 0x3a3e44, roughness: 0.9 });

  /** Vuelve a construir la habitación (o la quita si es null). */
  build(input: Room | null): void {
    this.clear();
    if (!input) return;
    const room = normalizeRoom(input);
    room.openings = room.openings.map((o) => clampOpening(room, o));
    const { x0, x1, z0, z1 } = roomBounds(room);

    // piso
    const tex = floorTexture(room.floor).clone(); tex.needsUpdate = true;
    tex.repeat.set(room.w / 120, room.d / 120);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(room.w, room.d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set((x0 + x1) / 2, 0.08, (z0 + z1) / 2); floor.receiveShadow = true;
    this.group.add(floor);

    this.wallMat.color.set(room.wall);
    for (const side of WALL_SIDES) {
      const full = new THREE.Group(), cut = new THREE.Group();
      for (const [a, b, lo, hi] of wallSegments(room, side)) {
        full.add(onWall(room, side, b - a, hi - lo, WALL_T, (a + b) / 2, (lo + hi) / 2, WALL_T / 2, this.wallMat));
        if (lo < CUT_H) {
          const top = Math.min(hi, CUT_H);
          cut.add(onWall(room, side, b - a, top - lo, WALL_T, (a + b) / 2, (lo + top) / 2, WALL_T / 2, this.wallMat, false));
        }
      }
      // canto superior oscuro en la pared recortada: se lee como "corte" de plano
      cut.add(onWall(room, side, wallLength(room, side) + 2 * WALL_T, 0.6, WALL_T, wallLength(room, side) / 2, CUT_H + 0.3, WALL_T / 2, this.wallTopMat, false));
      for (const o of room.openings.filter((q) => q.wall === side)) full.add(buildOpening(room, o));
      const fr = wallFrame(room, side), L = wallLength(room, side);
      this.walls.push({
        side, full, cut,
        out: new THREE.Vector2(fr.out[0], fr.out[1]),
        at: new THREE.Vector2(fr.start[0] + fr.dir[0] * L / 2, fr.start[1] + fr.dir[1] * L / 2)
      });
      this.group.add(full, cut);
    }
  }

  /** Recorta las paredes que tapan la vista desde la posición de la cámara. */
  update(camera: THREE.Camera): void {
    const c = new THREE.Vector2(camera.position.x, camera.position.z);
    for (const w of this.walls) {
      const outside = c.clone().sub(w.at).dot(w.out) > 0;
      w.full.visible = !outside; w.cut.visible = outside;
    }
  }

  /** Muestra todas las paredes enteras (para la foto del plano se oculta la habitación entera). */
  setVisible(v: boolean): void { this.group.visible = v; }

  private clear(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.MeshStandardMaterial | undefined;
      if (mat && mat.map && mat !== this.wallMat) { mat.map.dispose(); mat.dispose(); }
    });
    this.group.clear();
    this.walls = [];
  }
}
