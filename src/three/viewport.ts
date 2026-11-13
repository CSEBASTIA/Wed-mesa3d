// Escena 3D: renderizador, cámara, luces, piezas, paredes y selección.
// Escucha los eventos del store y mantiene la escena sincronizada con el modelo.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { box, sceneInfo, bounds, cornerSide, addVec } from '../core/geometry';
import type { Store } from '../core/store';
import type { Dim, Piece, Vec2, Vec3 } from '../core/types';
import { buildPiece } from './builders';
import { edgeMat, wallMat } from './materials';

export type ViewKind = 'iso' | 'front' | 'top';

/** Teclas de movimiento de cámara (por posición física, así funciona igual en teclados QWERTY o AZERTY). */
export const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'] as const;
export type MoveKey = typeof MOVE_KEYS[number];
const FAST = 2.5;

export interface ProjectedDim { k: string; v: number; txt: string; a: Vec2; b: Vec2; ao: Vec2; bo: Vec2 }
export interface Snapshot { img: HTMLCanvasElement; dims: ProjectedDim[] }
export interface PickHit { id: string; point: THREE.Vector3 }

const V = (a: Vec3) => new THREE.Vector3(a[0], a[1], a[2]);

export class Viewport {
  readonly el: HTMLCanvasElement;
  readonly camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
  readonly controls: OrbitControls;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly floor: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial>;
  private readonly walls = new THREE.Group();
  private readonly outline: THREE.LineSegments;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pr = Math.min(window.devicePixelRatio || 1, 2);
  private grid: THREE.GridHelper | null = null;
  private groups = new Map<string, THREE.Group>();
  private frame = 0;
  private lastTime = performance.now();
  private keys = new Set<MoveKey>();
  private cleanups: (() => void)[] = [];

  constructor(private readonly host: HTMLElement, private readonly store: Store) {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(this.pr);
    r.outputEncoding = THREE.sRGBEncoding;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(r.domElement);
    this.el = r.domElement;

    this.camera.position.set(170, 150, 230);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.75);
    sun.position.set(140, 300, 180); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, near: 10, far: 900 });
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShadowMaterial({ opacity: 0.22 }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.receiveShadow = true;
    this.scene.add(this.floor, this.walls);

    this.outline = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf2b705, depthTest: false }));
    this.outline.renderOrder = 10; this.outline.visible = false;
    this.scene.add(this.outline);

    this.controls = new OrbitControls(this.camera, this.el);
    this.controls.enableDamping = true; this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; this.controls.minDistance = 40; this.controls.maxDistance = 1200;

    this.applyTheme();
    this.watchTheme();
    this.watchSize();
    this.listen();
    // si el modelo ya estaba cargado (la vista se volvió a montar), dibujarlo
    this.syncAll(); this.buildWalls(); this.refreshOutline();
    this.loop();
  }

  /* ---------- sincronización con el modelo ---------- */
  private listen(): void {
    const s = this.store;
    this.cleanups.push(
      s.on('reset', () => { this.syncAll(); this.buildWalls(); this.refreshOutline(); this.applyCamera(); }),
      s.on('options', () => this.applyCamera()),
      s.on('added', (p) => { this.syncPiece(p); this.refreshOutline(); }),
      s.on('rebuilt', (p) => { this.syncPiece(p); this.refreshOutline(); }),
      s.on('moved', (p) => { const g = this.groups.get(p.id); if (g) this.place(g, p); this.refreshOutline(); }),
      s.on('removed', (id) => { const g = this.groups.get(id); if (g) { this.dispose(g); this.groups.delete(id); } this.refreshOutline(); }),
      s.on('select', () => this.refreshOutline())
    );
  }

  private place(g: THREE.Object3D, p: Piece): void {
    g.position.set(p.x, p.y + p.h / 2, p.z);
    g.rotation.y = p.rot * Math.PI / 2;
  }
  private dispose(g: THREE.Object3D): void {
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    this.scene.remove(g);
  }
  private syncPiece(p: Piece): void {
    const prev = this.groups.get(p.id), g = buildPiece(p, prev);
    this.place(g, p);
    if (prev) this.dispose(prev);
    this.groups.set(p.id, g); this.scene.add(g);
  }
  private syncAll(): void {
    this.groups.forEach((g) => this.dispose(g));
    this.groups.clear();
    this.store.pieces.forEach((p) => this.syncPiece(p));
  }

  private buildWalls(): void {
    for (const m of [...this.walls.children] as THREE.Mesh[]) { m.geometry.dispose(); this.walls.remove(m); }
    const room = this.store.room; if (!room) return;
    const s = room.corner === 'der' ? -1 : 1, W = 6, HH = 120;
    const back = new THREE.Mesh(new THREE.BoxGeometry(room.w + W, HH, W), wallMat);
    back.position.set(s * (room.w - W) / 2, HH / 2, -W / 2);
    const side = new THREE.Mesh(new THREE.BoxGeometry(W, HH, room.d), wallMat);
    side.position.set(-s * W / 2, HH / 2, room.d / 2);
    for (const m of [back, side]) { m.receiveShadow = true; this.walls.add(m); }
  }

  private refreshOutline(): void {
    const p = this.store.selected();
    this.outline.visible = !!p;
    if (!p) return;
    const b = box(p);
    this.outline.geometry.dispose();
    this.outline.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(b.sx + 0.8, p.h + 0.8, b.sz + 0.8));
    this.outline.position.set(p.x, p.y + p.h / 2, p.z);
  }

  /* ---------- tema y tamaño ---------- */
  private applyTheme = (): void => {
    const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    this.scene.background = new THREE.Color(css('--scene-bg') || '#dfe5ea');
    if (this.grid) { this.scene.remove(this.grid); this.grid.geometry.dispose(); (this.grid.material as THREE.Material).dispose(); }
    this.grid = new THREE.GridHelper(600, 60, new THREE.Color(css('--grid-a') || '#aab5c0'), new THREE.Color(css('--grid-b') || '#c9d1d9'));
    this.grid.position.y = 0.02; this.scene.add(this.grid);
  };
  private watchTheme(): void {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', this.applyTheme);
    const mo = new MutationObserver(this.applyTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.cleanups.push(() => mq.removeEventListener('change', this.applyTheme), () => mo.disconnect());
  }
  private resize = (): void => {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  };
  private watchSize(): void {
    const ro = new ResizeObserver(this.resize);
    ro.observe(this.host);
    this.cleanups.push(() => ro.disconnect());
    this.resize();
  }

  /* ---------- cámara ---------- */
  /** Aplica la sensibilidad guardada al giro, zoom y desplazamiento con el mouse. */
  private applyCamera(): void {
    const { rotate, zoom } = this.store.cam;
    this.controls.rotateSpeed = rotate;
    this.controls.zoomSpeed = zoom;
    this.controls.panSpeed = rotate;
  }

  /** Marca una tecla de movimiento como pulsada o suelta. */
  setKey(code: MoveKey, down: boolean): void {
    if (down) this.keys.add(code); else this.keys.delete(code);
  }
  releaseKeys(): void { this.keys.clear(); }

  /** Mueve cámara y punto de mira juntos, en el plano del piso, según las teclas pulsadas. */
  private moveWithKeys(dt: number): void {
    const k = this.keys;
    const fwd = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
    const side = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    const up = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);
    if (!fwd && !side && !up) return;

    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1); // vista desde arriba: "adelante" es hacia el fondo
    dir.normalize();
    const right = new THREE.Vector3().crossVectors(dir, this.camera.up).normalize();

    const fast = k.has('ShiftLeft') || k.has('ShiftRight') ? FAST : 1;
    const step = this.store.cam.move * fast * dt;
    const delta = dir.multiplyScalar(fwd * step).add(right.multiplyScalar(side * step));
    delta.y = up * step;
    // no dejar que el punto de mira baje del piso
    if (this.controls.target.y + delta.y < 0) delta.y = -this.controls.target.y;
    this.camera.position.add(delta);
    this.controls.target.add(delta);
  }

  setView(kind: ViewKind): void {
    const s = sceneInfo(this.store.pieces), c = V(s.center), k = s.r * 2.1, sd = cornerSide(this.store.pieces);
    const dir = kind === 'front' ? new THREE.Vector3(0, 0.05, 1)
      : kind === 'top' ? new THREE.Vector3(0, 1, 0.001)
      : new THREE.Vector3(0.62 * sd, 0.55, 0.82);
    this.camera.position.copy(c).add(dir.normalize().multiplyScalar(k));
    this.controls.target.copy(c); this.controls.update();
  }

  /* ---------- puntero ---------- */
  rayFromEvent(e: PointerEvent | MouseEvent): THREE.Raycaster {
    const r = this.el.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster;
  }
  pick(e: PointerEvent | MouseEvent): PickHit | null {
    const hits = this.rayFromEvent(e).intersectObjects([...this.groups.values()], true);
    for (const h of hits) {
      if ((h.object as THREE.LineSegments).isLineSegments) continue;
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.id) o = o.parent;
      if (o) return { id: o.userData.id as string, point: h.point };
    }
    return null;
  }

  /** Foto limpia para la exportación (fondo blanco, bordes marcados) y cotas proyectadas a la imagen. */
  snapshot(w: number, h: number, dims: Dim[]): Snapshot {
    const { camera, controls, scene, renderer } = this;
    const saved = { pos: camera.position.clone(), tgt: controls.target.clone(), aspect: camera.aspect, bg: scene.background,
      size: renderer.getSize(new THREE.Vector2()) };
    const B = bounds(this.store.pieces)!, sd = cornerSide(this.store.pieces);
    const ctr = new THREE.Vector3((B.x0 + B.x1) / 2, B.y1 / 2, (B.z0 + B.z1) / 2);
    const R = 0.5 * Math.hypot(B.sx + 30, B.y1 + 15, B.sz + 30);
    const dir = new THREE.Vector3(0.62 * sd, 0.75, 0.85).normalize();
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.position.copy(ctr).add(dir.multiplyScalar(R / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.82));
    camera.lookAt(ctr);
    scene.background = new THREE.Color('#ffffff');
    if (this.grid) this.grid.visible = false;
    this.outline.visible = false; this.walls.visible = false;
    edgeMat.opacity = 0.75; edgeMat.color.set(0x2a2e33); this.floor.material.opacity = 0.08;
    renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    renderer.render(scene, camera);

    const img = document.createElement('canvas'); img.width = w; img.height = h;
    img.getContext('2d')!.drawImage(this.el, 0, 0, w, h);
    const proj = (a: Vec3): Vec2 => { const q = V(a).project(camera); return [(q.x + 1) / 2 * w, (1 - q.y) / 2 * h]; };
    const projected = dims.map((d): ProjectedDim => ({
      k: d.k, v: d.v, txt: d.txt, a: proj(d.p1), b: proj(d.p2), ao: proj(addVec(d.p1, d.o)), bo: proj(addVec(d.p2, d.o))
    }));

    renderer.setPixelRatio(this.pr); renderer.setSize(saved.size.x, saved.size.y, false);
    camera.aspect = saved.aspect; camera.updateProjectionMatrix();
    camera.position.copy(saved.pos); controls.target.copy(saved.tgt); controls.update();
    scene.background = saved.bg;
    if (this.grid) this.grid.visible = true;
    this.walls.visible = true;
    edgeMat.opacity = 0.22; edgeMat.color.set(0x000000); this.floor.material.opacity = 0.22;
    this.refreshOutline();
    return { img, dims: projected };
  }

  /* ---------- dibujo ---------- */
  private loop = (): void => {
    this.frame = requestAnimationFrame(this.loop);
    const now = performance.now(), dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.moveWithKeys(dt);
    this.groups.forEach((g) => {
      const s = g.userData.slide as THREE.Group | undefined;
      const open = s?.userData.open as number | undefined;
      if (s && open != null && Math.abs(s.position.z - open) > 0.01) s.position.z += (open - s.position.z) * 0.18;
    });
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.cleanups.forEach((f) => f());
    this.controls.dispose();
    this.renderer.dispose();
    this.el.remove();
  }
}
