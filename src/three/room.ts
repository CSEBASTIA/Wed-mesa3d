// Habitación en 3D, cuidando el aspecto:
// - piso con textura (tablas con variación y vetas, porcelanato con veteado, alfombra, cemento),
// - paredes con textura de yeso, rodapiés, canto superior y sombra de contacto en la unión con el piso,
// - puertas con molduras, hoja con tableros, manija y umbral; ventanas con marco, travesaños, vidrio con cielo y alféizar,
// - luz interior cálida,
// - vista "casa de muñecas": las paredes entre la cámara y el interior se recortan a un zócalo.
import * as THREE from 'three';
import { FLOORS, WALL_T, normalizeRoom, walls, wallSegments, clampOpening, onWallPoint, roomBounds, type Wall } from '../core/room';
import type { FloorKind, Opening, Room } from '../core/types';

const CUT_H = 14;      // alto de la pared recortada
const BASE_H = 8;      // alto del rodapié
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

interface WallView { full: THREE.Group; cut: THREE.Group; out: THREE.Vector2; at: THREE.Vector2 }

/* ---------------------------------------------------------------- texturas */

function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, srgb = true): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.encoding = THREE.sRGBEncoding;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

/** Variación de un color en ±pct de luminosidad. */
function vary(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16), f = 1 + rnd(-pct, pct);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}

const floorCache = new Map<FloorKind, THREE.CanvasTexture>();
/** Textura de piso: 1024 px = 120 cm. */
function floorTexture(kind: FloorKind): THREE.CanvasTexture {
  const hit = floorCache.get(kind); if (hit) return hit;
  const f = FLOORS[kind];
  const t = canvasTex(1024, (g, S) => {
    g.fillStyle = f.base; g.fillRect(0, 0, S, S);
    if (kind === 'madera' || kind === 'roble-claro') {
      const rows = 6, ph = S / rows; // tablas de 20 cm de ancho
      for (let r = 0; r < rows; r++) {
        const y = r * ph;
        let x = -rnd(0, S * 0.6);
        while (x < S) {
          const len = rnd(S * 0.55, S * 1.1);
          g.fillStyle = vary(f.base, 0.09); g.fillRect(x, y, len, ph);
          // vetas
          g.save(); g.beginPath(); g.rect(x, y, len, ph); g.clip();
          g.strokeStyle = f.line;
          for (let i = 0; i < 9; i++) {
            const yy = y + rnd(4, ph - 4), amp = rnd(1, 4), fr = rnd(60, 160);
            g.globalAlpha = rnd(0.12, 0.32); g.lineWidth = rnd(0.6, 1.8);
            g.beginPath(); g.moveTo(x, yy);
            for (let xx = x; xx <= x + len; xx += 12) g.lineTo(xx, yy + Math.sin(xx / fr) * amp);
            g.stroke();
          }
          if (Math.random() < 0.25) { // nudo
            g.globalAlpha = 0.35; g.fillStyle = f.line;
            g.beginPath(); g.ellipse(x + rnd(20, len - 20), y + rnd(10, ph - 10), rnd(5, 10), rnd(2, 4), 0, 0, Math.PI * 2); g.fill();
          }
          g.restore(); g.globalAlpha = 1;
          // junta de testa
          g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x, y, 2, ph);
          x += len;
        }
        // junta longitudinal con bisel
        g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, y, S, 2);
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, y + 2, S, 1);
      }
    } else if (kind === 'ceramica') {
      const n = 2, ts = S / n; // porcelanato de 60 × 60 cm
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        g.fillStyle = vary(f.base, 0.035); g.fillRect(i * ts, j * ts, ts, ts);
        g.save(); g.beginPath(); g.rect(i * ts, j * ts, ts, ts); g.clip();
        for (let k = 0; k < 5; k++) { // veteado suave
          g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.22)' : 'rgba(90,92,96,.12)';
          g.lineWidth = rnd(1, 3);
          g.beginPath(); g.moveTo(i * ts + rnd(0, ts), j * ts);
          g.bezierCurveTo(i * ts + rnd(0, ts), j * ts + rnd(0, ts), i * ts + rnd(0, ts), j * ts + rnd(0, ts), i * ts + rnd(0, ts), j * ts + ts);
          g.stroke();
        }
        g.restore();
      }
      g.fillStyle = '#e4e4e1';
      for (let i = 0; i <= n; i++) { g.fillRect(i * ts - 2, 0, 4, S); g.fillRect(0, i * ts - 2, S, 4); }
    } else if (kind === 'alfombra') {
      for (let i = 0; i < 60000; i++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${rnd(0.03, 0.11)})`;
        g.fillRect(rnd(0, S), rnd(0, S), rnd(1, 2.5), rnd(1, 2.5));
      }
    } else {
      for (let i = 0; i < 70; i++) { // nubes del llaneado
        const x = rnd(0, S), y = rnd(0, S), r = rnd(60, 220), grd = g.createRadialGradient(x, y, 0, x, y, r);
        const tone = Math.random() < 0.5 ? '0,0,0' : '255,255,255';
        grd.addColorStop(0, `rgba(${tone},${rnd(0.03, 0.07)})`); grd.addColorStop(1, `rgba(${tone},0)`);
        g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${rnd(0.02, 0.06)})`; g.fillRect(rnd(0, S), rnd(0, S), 1.5, 1.5); }
    }
  });
  floorCache.set(kind, t);
  return t;
}

let plasterTex: THREE.CanvasTexture | null = null;
/** Yeso: gris muy claro con grano; el color de la pared lo pone el material (multiplica). */
function plaster(): THREE.CanvasTexture {
  if (plasterTex) return plasterTex;
  plasterTex = canvasTex(512, (g, S) => {
    g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 40; i++) {
      const x = rnd(0, S), y = rnd(0, S), r = rnd(30, 120), grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, `rgba(0,0,0,${rnd(0.015, 0.035)})`); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(0,0,0,${rnd(0.01, 0.04)})`; g.fillRect(rnd(0, S), rnd(0, S), 1, 1); }
  });
  return plasterTex;
}

let aoTex: THREE.CanvasTexture | null = null;
/** Degradado para la sombra de contacto en la unión pared-piso (oscuro arriba = junto a la pared). */
function contactShadow(): THREE.CanvasTexture {
  if (aoTex) return aoTex;
  aoTex = canvasTex(64, (g, S) => {
    const grd = g.createLinearGradient(0, 0, 0, S);
    grd.addColorStop(0, 'rgba(0,0,0,0.42)'); grd.addColorStop(0.35, 'rgba(0,0,0,0.14)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
  }, false);
  return aoTex;
}

let skyTex: THREE.CanvasTexture | null = null;
function sky(): THREE.CanvasTexture {
  if (skyTex) return skyTex;
  skyTex = canvasTex(128, (g, S) => {
    const grd = g.createLinearGradient(0, 0, 0, S);
    grd.addColorStop(0, '#8fbbe0'); grd.addColorStop(0.6, '#cfe3f2'); grd.addColorStop(1, '#eef4f6');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 10; // reflejo diagonal
    g.beginPath(); g.moveTo(S * 0.15, S); g.lineTo(S * 0.75, 0); g.stroke();
  });
  return skyTex;
}

/* ---------------------------------------------------------------- materiales */

const M = {
  trim: new THREE.MeshStandardMaterial({ color: 0xf6f5f1, roughness: 0.45 }),          // rodapiés y molduras (laca satinada)
  frame: new THREE.MeshStandardMaterial({ color: 0xf2f1ed, roughness: 0.5 }),
  door: new THREE.MeshStandardMaterial({ color: 0xa47851, roughness: 0.6 }),
  threshold: new THREE.MeshStandardMaterial({ color: 0x6b4a33, roughness: 0.6 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xc2c8ce, roughness: 0.3, metalness: 0.85 }),
  glass: new THREE.MeshBasicMaterial({ map: null, transparent: true, opacity: 0.6, depthWrite: false }),
  cap: new THREE.MeshStandardMaterial({ color: 0x33373d, roughness: 0.9 })
};

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, shadow = true): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 0.1), Math.max(h, 0.1), Math.max(d, 0.1)), mat);
  m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

/** Caja "a lo largo de la pared" (cualquier ángulo): u = posición a lo largo, v = altura, n = hacia afuera (0 = cara interior). */
function onWall(w: Wall, len: number, h: number, thick: number, u: number, v: number, n: number,
  mat: THREE.Material, shadow = true): THREE.Mesh {
  const [x, z] = onWallPoint(w, u, n);
  const m = box(len, h, thick, mat, x, v, z, shadow);
  m.rotation.y = Math.atan2(-w.dir[1], w.dir[0]);
  return m;
}

/* ---------------------------------------------------------------- puertas y ventanas */

/** Moldura (tapajuntas) alrededor del vano, por la cara indicada (n < 0 interior, n > WALL_T exterior). */
function casing(w: Wall, o: Opening, n: number): THREE.Mesh[] {
  const C = 7, t = 1.5, top = o.sill + o.height;
  const parts = [
    onWall(w, C, o.height + C, t, o.pos - C / 2, o.sill + (o.height + C) / 2 - (o.sill > 0 ? C / 2 : 0), n, M.trim, false),
    onWall(w, C, o.height + C, t, o.pos + o.width + C / 2, o.sill + (o.height + C) / 2 - (o.sill > 0 ? C / 2 : 0), n, M.trim, false),
    onWall(w, o.width + 2 * C, C, t, o.pos + o.width / 2, top + C / 2, n, M.trim, false)
  ];
  if (o.sill > 0) parts.push(onWall(w, o.width + 2 * C, C, t, o.pos + o.width / 2, o.sill - C / 2, n, M.trim, false));
  return parts;
}

function buildDoor(w: Wall, o: Opening): THREE.Group {
  const g = new THREE.Group(), F = 4, D = WALL_T + 1, { pos, width: W, height: H } = o, mid = pos + W / 2;
  g.add(onWall(w, F, H, D, pos + F / 2, H / 2, WALL_T / 2, M.frame));
  g.add(onWall(w, F, H, D, pos + W - F / 2, H / 2, WALL_T / 2, M.frame));
  g.add(onWall(w, W, F, D, mid, H - F / 2, WALL_T / 2, M.frame));
  for (const m of casing(w, o, -0.75)) g.add(m);
  for (const m of casing(w, o, WALL_T + 0.75)) g.add(m);
  // hoja con dos tableros en relieve
  const lw = W - 2 * F, lh = H - F - 1;
  g.add(onWall(w, lw, lh, 4, mid, 1 + lh / 2, 2, M.door));
  const pw = lw - 18, phh = lh / 2 - 16;
  g.add(onWall(w, pw, phh, 0.8, mid, 1 + lh * 0.27, -0.3, M.door));
  g.add(onWall(w, pw, phh, 0.8, mid, 1 + lh * 0.73, -0.3, M.door));
  // manija: roseta y palanca hacia la bisagra
  const hu = pos + W - F - 7;
  const rose = onWall(w, 5, 5, 1, hu, 100, -0.6, M.metal, false); g.add(rose);
  g.add(onWall(w, 12, 1.6, 1.6, hu - 5, 100, -2.2, M.metal, false));
  // umbral
  g.add(onWall(w, W, 1, WALL_T, mid, 0.5, WALL_T / 2, M.threshold, false));
  return g;
}

function buildWindow(w: Wall, o: Opening): THREE.Group {
  const g = new THREE.Group(), F = 6, D = 8, { pos, width: W, height: H, sill } = o, mid = pos + W / 2, n = WALL_T / 2;
  g.add(onWall(w, F, H, D, pos + F / 2, sill + H / 2, n, M.frame));
  g.add(onWall(w, F, H, D, pos + W - F / 2, sill + H / 2, n, M.frame));
  g.add(onWall(w, W, F, D, mid, sill + H - F / 2, n, M.frame));
  g.add(onWall(w, W, F, D, mid, sill + F / 2, n, M.frame));
  if (W > 90) g.add(onWall(w, 4, H - 2 * F, 6, mid, sill + H / 2, n, M.frame));            // parteluz
  if (H > 100) g.add(onWall(w, W - 2 * F, 4, 6, mid, sill + H * 0.66, n, M.frame));       // travesaño
  // vidrio con reflejo de cielo
  if (!M.glass.map) { M.glass.map = sky(); M.glass.needsUpdate = true; }
  g.add(onWall(w, W - 2 * F, H - 2 * F, 0.4, mid, sill + H / 2, n, M.glass, false));
  // alféizar interior y molduras
  g.add(onWall(w, W + 16, 2.5, 10, mid, sill - 1.25, -3, M.trim));
  for (const m of casing(w, { ...o, sill: sill + 0.01 }, -0.75)) g.add(m);
  return g;
}

/* ---------------------------------------------------------------- habitación */

export class RoomView {
  readonly group = new THREE.Group();
  private walls: WallView[] = [];
  private wallMat = new THREE.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.95, map: null });

  /** Vuelve a construir la habitación (o la quita si es null). */
  build(input: Room | null): void {
    this.clear();
    if (!input) return;
    const room = normalizeRoom(input);
    const openings = room.openings.map((o) => clampOpening(room, o));
    const ws = walls(room);
    const b = roomBounds(room);

    // piso con la forma exacta del contorno (la textura cubre 120 cm)
    const shape = new THREE.Shape(room.points.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(shape);
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 120, uv.getY(i) / 120);
    geo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(room.floor), roughness: room.floor === 'ceramica' ? 0.35 : 0.8 });
    const floor = new THREE.Mesh(geo, floorMat);
    floor.userData.ownMat = true;
    floor.position.y = 0.08; floor.receiveShadow = true;
    this.group.add(floor);

    // paredes
    this.wallMat.color.set(room.wall);
    if (!this.wallMat.map) { this.wallMat.map = plaster(); this.wallMat.needsUpdate = true; }
    const trim = new THREE.Group();
    const aoMat = new THREE.MeshBasicMaterial({ map: contactShadow(), transparent: true, depthWrite: false });
    for (const w of ws) {
      const full = new THREE.Group(), cut = new THREE.Group();
      for (const [a, c, lo, hi] of wallSegments(room, w.i)) {
        full.add(onWall(w, c - a, hi - lo, WALL_T, (a + c) / 2, (lo + hi) / 2, WALL_T / 2, this.wallMat));
        if (lo < CUT_H) {
          const top = Math.min(hi, CUT_H);
          cut.add(onWall(w, c - a, top - lo, WALL_T, (a + c) / 2, (lo + top) / 2, WALL_T / 2, this.wallMat, false));
        }
      }
      const span = w.len + w.extA + w.extB, um = (w.len + w.extB - w.extA) / 2;
      cut.add(onWall(w, span, 0.6, WALL_T, um, CUT_H + 0.3, WALL_T / 2, M.cap, false));                       // corte oscuro
      full.add(onWall(w, span, 0.6, WALL_T, um, room.h + 0.3, WALL_T / 2, M.trim, false));                    // canto superior

      const mine = openings.filter((q) => q.wall === w.i);
      for (const o of mine) full.add(o.type === 'puerta' ? buildDoor(w, o) : buildWindow(w, o));

      // rodapié por dentro, interrumpido en las puertas
      const doors = mine.filter((o) => o.type === 'puerta').sort((p, q) => p.pos - q.pos);
      let from = 0;
      for (const d of [...doors, null]) {
        const to = d ? d.pos - 7 : w.len;
        if (to - from > 2) trim.add(onWall(w, to - from, BASE_H, 1.2, (from + to) / 2, BASE_H / 2, -0.6, M.trim, false));
        if (d) from = d.pos + d.width + 7;
      }

      // sombra de contacto en el piso, junto a la pared
      const aoGeo = new THREE.PlaneGeometry(w.len, 26); aoGeo.rotateX(-Math.PI / 2);
      const ao = new THREE.Mesh(aoGeo, aoMat);
      const [ax, az] = onWallPoint(w, w.len / 2, -13);
      ao.position.set(ax, 0.12, az); ao.rotation.y = Math.atan2(-w.dir[1], w.dir[0]); ao.renderOrder = 1;
      trim.add(ao);

      const mid = onWallPoint(w, w.len / 2, 0);
      this.walls.push({ full, cut, out: new THREE.Vector2(w.out[0], w.out[1]), at: new THREE.Vector2(mid[0], mid[1]) });
      this.group.add(full, cut);
    }
    this.group.add(trim);

    // luz interior cálida (sin sombras, para que sea liviana)
    const glow = new THREE.PointLight(0xffe4c4, 0.28, Math.max(room.w, room.d) * 2.2, 1.5);
    glow.position.set((b.x0 + b.x1) / 2, room.h - 25, (b.z0 + b.z1) / 2);
    this.group.add(glow);

  }

  /** Recorta las paredes que tapan la vista desde la posición de la cámara. */
  update(camera: THREE.Camera): void {
    const c = new THREE.Vector2(camera.position.x, camera.position.z);
    for (const w of this.walls) {
      const outside = c.clone().sub(w.at).dot(w.out) > 0;
      w.full.visible = !outside; w.cut.visible = outside;
    }
  }

  /** Para la foto del plano se oculta la habitación entera. */
  setVisible(v: boolean): void { this.group.visible = v; }

  private clear(): void {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.userData?.ownMat) (m.material as THREE.Material).dispose();
    });
    this.group.clear();
    this.walls = [];
  }
}
