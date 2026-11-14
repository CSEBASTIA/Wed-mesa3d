// Escena 3D: renderizador, cámara, luces, piezas, entorno, selección y aro de giro.
// Escucha los eventos del store y mantiene la escena sincronizada con el modelo.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { sceneInfo, bounds, cornerSide, addVec } from '../core/geometry';
import { roomBounds } from '../core/room';
import type { Store } from '../core/store';
import type { Dim, Piece, Vec2, Vec3 } from '../core/types';
import { buildPiece } from './builders';
import { edgeMat } from './materials';
import { RoomView } from './room';

export type ViewKind = 'iso' | 'front' | 'top';

/** Teclas de movimiento de cámara (por posición física, así funciona igual en teclados QWERTY o AZERTY). */
export const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'] as const;
export type MoveKey = typeof MOVE_KEYS[number];
const FAST = 2.5;
/** Qué tan rápido la cámara alcanza la velocidad pedida o frena (1/s). Más alto = más brusco. */
const ACCEL = 9;

export interface ProjectedDim { k: string; v: number; txt: string; a: Vec2; b: Vec2; ao: Vec2; bo: Vec2 }
export interface Snapshot { img: HTMLCanvasElement; dims: ProjectedDim[] }

/** Vistas ortogonales del plano. */
export type OrthoView = 'front' | 'back' | 'top' | 'bottom';
/** Foto ortogonal: imagen, escala (px por cm) y medidas del mueble en esa vista (ancho y alto en pantalla, cm). */
export interface OrthoShot { img: HTMLCanvasElement; k: number; across: number; tall: number }
export interface PickHit { id: string; point: THREE.Vector3 }

const V = (a: Vec3) => new THREE.Vector3(a[0], a[1], a[2]);

/** Fondo "estudio" cuando no hay habitación: cian grisáceo suave (menos brillante que el blanco), cuadrícula con poco contraste. */
const STUDIO = { bg: '#cfe1e5', gridA: '#a9c3ca', gridB: '#bed4d9' };

export class Viewport {
  readonly el: HTMLCanvasElement;
  readonly camera = new THREE.PerspectiveCamera(40, 1, 1, 6000);
  readonly controls: OrbitControls;
  /** Aro para girar la pieza seleccionada (lo usa interaction.ts). */
  readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly floor: THREE.Mesh<THREE.PlaneGeometry, THREE.ShadowMaterial>;
  private readonly room = new RoomView();
  private readonly outline: THREE.LineSegments;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pr = Math.min(window.devicePixelRatio || 1, 2);
  private grid: THREE.GridHelper | null = null;
  private groups = new Map<string, THREE.Group>();
  private frame = 0;
  private lastTime = performance.now();
  private keys = new Set<MoveKey>();
  private velocity = new THREE.Vector3();
  /** Espacio tapado por la interfaz flotante en cada borde (px); el mueble se centra en el resto. */
  private insets = { l: 0, r: 0, t: 0, b: 0 };
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
    sun.position.set(160, 380, 220); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -450, right: 450, top: 450, bottom: -450, near: 10, far: 1200 });
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.22 }));
    this.floor.rotation.x = -Math.PI / 2; this.floor.receiveShadow = true;
    this.scene.add(this.floor, this.room.group);

    this.outline = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xa8682f, depthTest: false }));
    this.outline.renderOrder = 10; this.outline.visible = false;
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.1, 64),
      new THREE.MeshBasicMaterial({ color: 0xa8682f, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthTest: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.renderOrder = 11; this.ring.visible = false;
    this.scene.add(this.outline, this.ring);

    // Controles de órbita con inercia: el giro sigue un poco y se detiene suave.
    this.controls = new OrbitControls(this.camera, this.el);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.075;
    this.controls.screenSpacePanning = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.03;
    this.controls.minDistance = 50; this.controls.maxDistance = 1800;

    this.applyTheme();
    this.watchTheme();
    this.watchSize();
    this.listen();
    // si el modelo ya estaba cargado (la vista se volvió a montar), dibujarlo
    this.syncAll(); this.room.build(this.store.room); this.refreshOutline(); this.applyCamera();
    this.loop();
  }

  /* ---------- sincronización con el modelo ---------- */
  private listen(): void {
    const s = this.store;
    this.cleanups.push(
      s.on('reset', () => { this.syncAll(); this.room.build(s.room); this.refreshOutline(); this.applyCamera(); this.applyTheme(); }),
      s.on('room', () => { this.room.build(s.room); this.applyTheme(); }),
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

  /** Contorno girado con la pieza y aro de giro en el piso. */
  private refreshOutline(): void {
    const p = this.store.selected();
    this.outline.visible = this.ring.visible = !!p;
    if (!p) return;
    this.outline.geometry.dispose();
    this.outline.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(p.w + 0.8, p.h + 0.8, p.d + 0.8));
    this.outline.position.set(p.x, p.y + p.h / 2, p.z);
    this.outline.rotation.y = p.rot * Math.PI / 2;
    const rad = Math.hypot(p.w, p.d) / 2 + 10;
    this.ring.geometry.dispose();
    this.ring.geometry = new THREE.RingGeometry(rad, rad + 4, 72);
    this.ring.position.set(p.x, Math.max(0.5, p.y) + 0.4, p.z);
  }
  /** Resalta el aro cuando el puntero está encima. */
  hoverRing(on: boolean): void { this.ring.material.opacity = on ? 0.95 : 0.55; }

  /* ---------- tema y tamaño ---------- */
  private applyTheme = (): void => {
    const css = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    // Sin habitación: estudio gris muy claro con cuadrícula suave (cómodo para la vista en cualquier tema).
    // Con habitación: el fondo del tema, para que el cuarto resalte.
    const studio = !this.store.room;
    this.scene.background = new THREE.Color(studio ? STUDIO.bg : css('--scene-bg') || '#dfe5ea');
    if (this.grid) { this.scene.remove(this.grid); this.grid.geometry.dispose(); (this.grid.material as THREE.Material).dispose(); }
    this.grid = studio
      ? new THREE.GridHelper(1000, 100, new THREE.Color(STUDIO.gridA), new THREE.Color(STUDIO.gridB))
      : new THREE.GridHelper(1000, 100, new THREE.Color(css('--grid-a') || '#aab5c0'), new THREE.Color(css('--grid-b') || '#c9d1d9'));
    this.grid.position.y = 0.02; this.scene.add(this.grid);
    this.floor.material.opacity = studio ? 0.16 : 0.22;
    const accent = css('--accent') || '#a8682f';
    (this.outline.material as THREE.LineBasicMaterial).color.set(accent);
    this.ring.material.color.set(accent);
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
    this.camera.aspect = w / h;
    this.applyOffset();
  };

  /** Indica qué parte del lienzo tapan los paneles para centrar la vista en el área libre. */
  setInsets(i: { l: number; r: number; t: number; b: number }): void {
    this.insets = i;
    this.applyOffset();
  }
  private applyOffset(): void {
    const w = this.host.clientWidth, h = this.host.clientHeight, { l, r, t, b } = this.insets;
    if (!w || !h || (!l && !r && !t && !b)) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, (r - l) / 2, (b - t) / 2, w, h);
    this.camera.updateProjectionMatrix();
  }
  /** Cuánto más lejos hay que poner la cámara para que el mueble quepa en el área libre. */
  private freeScale(): number {
    const w = this.host.clientWidth, h = this.host.clientHeight, { l, r, t, b } = this.insets;
    if (!w || !h) return 1;
    return Math.max(1, Math.min(2, Math.max(w / Math.max(1, w - l - r), h / Math.max(1, h - t - b))));
  }
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
    this.controls.panSpeed = Math.max(0.3, rotate * 1.4);
  }

  /** Marca una tecla de movimiento como pulsada o suelta. */
  setKey(code: MoveKey, down: boolean): void {
    if (down) this.keys.add(code); else this.keys.delete(code);
  }
  releaseKeys(): void { this.keys.clear(); }

  /**
   * Mueve cámara y punto de mira juntos según las teclas, con aceleración y frenado suaves.
   * La velocidad crece con la distancia al punto de mira: de cerca se mueve fino, de lejos recorre más.
   */
  private moveWithKeys(dt: number): void {
    const k = this.keys;
    const fwd = (k.has('KeyW') ? 1 : 0) - (k.has('KeyS') ? 1 : 0);
    const side = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    const up = (k.has('KeyE') ? 1 : 0) - (k.has('KeyQ') ? 1 : 0);

    const want = new THREE.Vector3();
    if (fwd || side || up) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      dir.y = 0;
      if (dir.lengthSq() < 1e-6) dir.set(0, 0, -1); // vista desde arriba: "adelante" es hacia el fondo
      dir.normalize();
      const right = new THREE.Vector3().crossVectors(dir, this.camera.up).normalize();
      const dist = this.camera.position.distanceTo(this.controls.target);
      const fast = k.has('ShiftLeft') || k.has('ShiftRight') ? FAST : 1;
      const speed = this.store.cam.move * fast * THREE.MathUtils.clamp(dist / 300, 0.35, 3);
      want.addScaledVector(dir, fwd).addScaledVector(right, side);
      if (want.lengthSq() > 0) want.normalize();
      want.y = up;
      want.multiplyScalar(speed);
    }
    // acercarse a la velocidad deseada de forma exponencial (independiente de los fps)
    this.velocity.lerp(want, 1 - Math.exp(-ACCEL * dt));
    if (this.velocity.lengthSq() < 0.01 && !want.lengthSq()) { this.velocity.set(0, 0, 0); return; }
    const delta = this.velocity.clone().multiplyScalar(dt);
    if (this.controls.target.y + delta.y < 0) { delta.y = -this.controls.target.y; this.velocity.y = 0; }
    this.camera.position.add(delta);
    this.controls.target.add(delta);
  }

  setView(kind: ViewKind): void {
    const s = sceneInfo(this.store.pieces);
    let c = V(s.center), r = s.r;
    if (this.store.room) {
      // con entorno, encuadrar la habitación completa
      const rb = roomBounds(this.store.room);
      c = new THREE.Vector3((rb.x0 + rb.x1) / 2, 60, (rb.z0 + rb.z1) / 2);
      r = Math.max(rb.x1 - rb.x0, rb.z1 - rb.z0) * 0.9;
    }
    const k = r * 2.1 * this.freeScale(), sd = cornerSide(this.store.pieces);
    const dir = kind === 'front' ? new THREE.Vector3(0, 0.05, 1)
      : kind === 'top' ? new THREE.Vector3(0, 1, 0.001)
      : new THREE.Vector3(0.62 * sd, 0.62, 0.82);
    this.velocity.set(0, 0, 0);
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
  /** ¿El puntero está sobre el aro de giro? */
  pickRing(e: PointerEvent | MouseEvent): boolean {
    return this.ring.visible && this.rayFromEvent(e).intersectObject(this.ring, false).length > 0;
  }

  /**
   * Miniatura del diseño para la lista de proyectos: vista 3D encuadrada (la habitación entera si hay),
   * sin selección ni aro, en JPEG. No mueve la cámara del usuario.
   */
  thumbnail(w = 320, h = 200): string {
    const { camera, scene, renderer } = this;
    const saved = { pos: camera.position.clone(), quat: camera.quaternion.clone(), aspect: camera.aspect,
      size: renderer.getSize(new THREE.Vector2()), outline: this.outline.visible, ring: this.ring.visible };
    let c: THREE.Vector3, r: number;
    if (this.store.room) {
      const rb = roomBounds(this.store.room);
      c = new THREE.Vector3((rb.x0 + rb.x1) / 2, 60, (rb.z0 + rb.z1) / 2);
      r = Math.max(rb.x1 - rb.x0, rb.z1 - rb.z0) * 0.62;
    } else {
      const si = sceneInfo(this.store.pieces);
      c = V(si.center); r = Math.max(si.r * 0.75, 60);
    }
    const dir = new THREE.Vector3(0.62 * cornerSide(this.store.pieces), 0.7, 0.82).normalize();
    camera.clearViewOffset();
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.position.copy(c).add(dir.multiplyScalar(r / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
    camera.lookAt(c); camera.updateMatrixWorld();
    this.outline.visible = false; this.ring.visible = false;
    this.room.update(camera);
    renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    renderer.render(scene, camera);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d')!.drawImage(this.el, 0, 0, w, h);
    const url = cv.toDataURL('image/jpeg', 0.72);
    // restaurar la vista del usuario
    renderer.setPixelRatio(this.pr); renderer.setSize(saved.size.x, saved.size.y, false);
    camera.aspect = saved.aspect; this.applyOffset();
    camera.position.copy(saved.pos); camera.quaternion.copy(saved.quat); camera.updateMatrixWorld();
    this.outline.visible = saved.outline; this.ring.visible = saved.ring;
    this.room.update(camera);
    return url;
  }

  /**
   * Vista ortogonal limpia del mueble (sin perspectiva), para el plano: frente, atrás, arriba o abajo.
   * El mueble queda centrado y a escala; se devuelve la escala para poder acotar sobre la imagen.
   */
  orthoSnapshot(view: OrthoView, w: number, h: number): OrthoShot {
    const { scene, renderer } = this;
    const B = bounds(this.store.pieces)!;
    const c = new THREE.Vector3((B.x0 + B.x1) / 2, B.y1 / 2, (B.z0 + B.z1) / 2);
    const plan = view === 'top' || view === 'bottom';
    const across = B.sx, tall = plan ? B.sz : B.y1;
    const k = Math.min((w * 0.74) / Math.max(across, 1), (h * 0.72) / Math.max(tall, 1));
    const cam = new THREE.OrthographicCamera(-w / 2 / k, w / 2 / k, h / 2 / k, -h / 2 / k, 1, 5000);
    const D = 2000;
    if (view === 'front') cam.position.set(c.x, c.y, c.z + D);
    if (view === 'back') cam.position.set(c.x, c.y, c.z - D);
    if (view === 'top') { cam.position.set(c.x, c.y + D, c.z); cam.up.set(0, 0, -1); }
    if (view === 'bottom') { cam.position.set(c.x, c.y - D, c.z); cam.up.set(0, 0, -1); }
    cam.lookAt(c); cam.updateProjectionMatrix(); cam.updateMatrixWorld();

    const saved = { bg: scene.background, size: renderer.getSize(new THREE.Vector2()), floor: this.floor.visible };
    scene.background = new THREE.Color('#ffffff');
    if (this.grid) this.grid.visible = false;
    this.outline.visible = false; this.ring.visible = false; this.room.setVisible(false); this.floor.visible = false;
    edgeMat.opacity = 0.8; edgeMat.color.set(0x2a2e33);
    renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    renderer.render(scene, cam);
    const img = document.createElement('canvas'); img.width = w; img.height = h;
    img.getContext('2d')!.drawImage(this.el, 0, 0, w, h);

    renderer.setPixelRatio(this.pr); renderer.setSize(saved.size.x, saved.size.y, false);
    scene.background = saved.bg;
    if (this.grid) this.grid.visible = true;
    this.room.setVisible(true); this.floor.visible = saved.floor;
    edgeMat.opacity = 0.22; edgeMat.color.set(0x000000);
    this.camera.updateProjectionMatrix();
    this.refreshOutline();
    return { img, k, across, tall };
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
    camera.clearViewOffset();
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.position.copy(ctr).add(dir.multiplyScalar(R / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.82));
    camera.lookAt(ctr);
    scene.background = new THREE.Color('#ffffff');
    if (this.grid) this.grid.visible = false;
    this.outline.visible = false; this.ring.visible = false; this.room.setVisible(false);
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
    camera.aspect = saved.aspect; this.applyOffset();
    camera.position.copy(saved.pos); controls.target.copy(saved.tgt); controls.update();
    scene.background = saved.bg;
    if (this.grid) this.grid.visible = true;
    this.room.setVisible(true);
    edgeMat.opacity = 0.22; edgeMat.color.set(0x000000); this.floor.material.opacity = this.store.room ? 0.22 : 0.16;
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
      if (s && open != null && Math.abs(s.position.z - open) > 0.01) s.position.z += (open - s.position.z) * (1 - Math.exp(-12 * dt));
    });
    this.controls.update();
    this.room.update(this.camera);
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
