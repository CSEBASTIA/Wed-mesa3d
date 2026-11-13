// Escena 3D: renderizador, cámara, luces, piezas, paredes y selección.
// Escucha los eventos del store y mantiene la escena sincronizada con el modelo.
import { box, sceneInfo, bounds, cornerSide, addVec } from '../core/geometry.js';
import { buildPiece } from './builders.js';
import { edgeMat, wallMat } from './materials.js';

const THREE = window.THREE;
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export function createViewport(host, store) {
  const PR = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(PR);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
  camera.position.set(170, 150, 230);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 0.75));
  const sun = new THREE.DirectionalLight(0xffffff, 0.75);
  sun.position.set(140, 300, 180); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -300, right: 300, top: 300, bottom: -300, near: 10, far: 900 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.ShadowMaterial({ opacity: 0.22 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  /* ---- tema claro/oscuro ---- */
  let grid = null;
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function applyTheme() {
    scene.background = new THREE.Color(cssVar('--scene-bg') || '#dfe5ea');
    if (grid) { scene.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.GridHelper(600, 60, new THREE.Color(cssVar('--grid-a') || '#aab5c0'), new THREE.Color(cssVar('--grid-b') || '#c9d1d9'));
    grid.position.y = 0.02; scene.add(grid);
  }
  applyTheme();
  const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (mq) (mq.addEventListener ? mq.addEventListener('change', applyTheme) : mq.addListener(applyTheme));
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
  window.addEventListener('resize', resize);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.12;
  controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 40; controls.maxDistance = 1200;

  /* ---- piezas ---- */
  let groups = {};
  function place(g, p) { g.position.set(p.x, p.y + p.h / 2, p.z); g.rotation.y = p.rot * Math.PI / 2; }
  function dispose(g) { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); scene.remove(g); }
  function syncPiece(p) {
    const prev = groups[p.id], g = buildPiece(p, prev);
    place(g, p);
    if (prev) dispose(prev);
    groups[p.id] = g; scene.add(g);
  }
  function syncAll() {
    Object.values(groups).forEach(dispose); groups = {};
    store.pieces.forEach(syncPiece);
  }

  /* ---- paredes ---- */
  const walls = new THREE.Group(); scene.add(walls);
  function buildWalls() {
    walls.children.slice().forEach((m) => { m.geometry.dispose(); walls.remove(m); });
    const room = store.room; if (!room) return;
    const s = room.corner === 'der' ? -1 : 1, W = 6, HH = 120;
    const back = new THREE.Mesh(new THREE.BoxGeometry(room.w + W, HH, W), wallMat);
    back.position.set(s * (room.w - W) / 2, HH / 2, -W / 2);
    const side = new THREE.Mesh(new THREE.BoxGeometry(W, HH, room.d), wallMat);
    side.position.set(-s * W / 2, HH / 2, room.d / 2);
    [back, side].forEach((m) => { m.receiveShadow = true; walls.add(m); });
  }

  /* ---- selección ---- */
  const outline = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xf2b705, depthTest: false }));
  outline.renderOrder = 10; outline.visible = false; scene.add(outline);
  function refreshOutline() {
    const p = store.selected();
    outline.visible = !!p;
    if (!p) return;
    const b = box(p);
    outline.geometry.dispose();
    outline.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(b.sx + 0.8, p.h + 0.8, b.sz + 0.8));
    outline.position.set(p.x, p.y + p.h / 2, p.z);
  }

  /* ---- eventos del modelo ---- */
  store.on('reset', () => { syncAll(); buildWalls(); refreshOutline(); });
  store.on('added', (p) => { syncPiece(p); refreshOutline(); });
  store.on('rebuilt', (p) => { syncPiece(p); refreshOutline(); });
  store.on('moved', (p) => { if (groups[p.id]) place(groups[p.id], p); refreshOutline(); });
  store.on('removed', (id) => { if (groups[id]) { dispose(groups[id]); delete groups[id]; } refreshOutline(); });
  store.on('select', refreshOutline);

  /* ---- cámara ---- */
  function setView(kind) {
    const s = sceneInfo(store.pieces), c = V(s.center), k = s.r * 2.1, sd = cornerSide(store.pieces);
    const dir = kind === 'front' ? new THREE.Vector3(0, 0.05, 1)
      : kind === 'top' ? new THREE.Vector3(0, 1, 0.001)
      : new THREE.Vector3(0.62 * sd, 0.55, 0.82);
    camera.position.copy(c).add(dir.normalize().multiplyScalar(k));
    controls.target.copy(c); controls.update();
  }

  /* ---- selección con el puntero ---- */
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function rayFromEvent(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster;
  }
  function pick(e) {
    const hits = rayFromEvent(e).intersectObjects(Object.values(groups), true);
    for (const h of hits) {
      let o = h.object;
      if (o.isLineSegments) continue;
      while (o && !o.userData.id) o = o.parent;
      if (o) return { id: o.userData.id, point: h.point };
    }
    return null;
  }

  /**
   * Foto limpia del modelo para la exportación (fondo blanco, bordes marcados)
   * y proyección de las cotas a coordenadas de la imagen.
   */
  function snapshot(w, h, dims) {
    const saved = { pos: camera.position.clone(), tgt: controls.target.clone(), aspect: camera.aspect, bg: scene.background,
      size: renderer.getSize(new THREE.Vector2()) };
    const B = bounds(store.pieces), sd = cornerSide(store.pieces);
    const ctr = new THREE.Vector3((B.x0 + B.x1) / 2, B.y1 / 2, (B.z0 + B.z1) / 2);
    const R = 0.5 * Math.hypot(B.x1 - B.x0 + 30, B.y1 + 15, B.z1 - B.z0 + 30);
    const dir = new THREE.Vector3(0.62 * sd, 0.75, 0.85).normalize();
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.position.copy(ctr).add(dir.multiplyScalar(R / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.82));
    camera.lookAt(ctr);
    scene.background = new THREE.Color('#ffffff');
    grid.visible = false; outline.visible = false; walls.visible = false;
    edgeMat.opacity = 0.75; edgeMat.color.set(0x2a2e33); floor.material.opacity = 0.08;
    renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    renderer.render(scene, camera);

    const img = document.createElement('canvas'); img.width = w; img.height = h;
    img.getContext('2d').drawImage(renderer.domElement, 0, 0, w, h);
    const proj = (a) => { const q = V(a).project(camera); return [(q.x + 1) / 2 * w, (1 - q.y) / 2 * h]; };
    const projected = dims.map((d) => ({
      k: d.k, v: d.v, txt: d.txt, a: proj(d.p1), b: proj(d.p2), ao: proj(addVec(d.p1, d.o)), bo: proj(addVec(d.p2, d.o))
    }));

    renderer.setPixelRatio(PR); renderer.setSize(saved.size.x, saved.size.y, false);
    camera.aspect = saved.aspect; camera.updateProjectionMatrix();
    camera.position.copy(saved.pos); controls.target.copy(saved.tgt); controls.update();
    scene.background = saved.bg; grid.visible = true; walls.visible = true;
    edgeMat.opacity = 0.22; edgeMat.color.set(0x000000); floor.material.opacity = 0.22;
    refreshOutline();
    return { img, dims: projected };
  }

  /* ---- bucle de dibujo ---- */
  (function loop() {
    requestAnimationFrame(loop);
    Object.values(groups).forEach((g) => {
      const s = g.userData.slide;
      if (s && Math.abs(s.position.z - s.userData.open) > 0.01) s.position.z += (s.userData.open - s.position.z) * 0.18;
    });
    controls.update();
    renderer.render(scene, camera);
  })();

  resize();
  return { el: renderer.domElement, camera, controls, setView, pick, rayFromEvent, snapshot, resize };
}
