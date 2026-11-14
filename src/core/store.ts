// Estado único de la aplicación + historial + guardado + eventos.
// Toda modificación del modelo pasa por aquí; la vista 3D y React solo escuchan.
import { DEFAULT_CFG, buildKit } from './templates';
import { normalizeRoom, roomBounds } from './room';
import { clone } from './format';
import { defaultPrices, mergePrices, type PriceList } from './budget';
import type { CameraSettings, DeskConfig, Kit, MatKey, Piece, Project, Room } from './types';

export const DEFAULT_CAMERA: CameraSettings = { move: 90, rotate: 0.5, zoom: 0.6 };
/** Versión de los ajustes de cámara: al cambiar los valores por defecto se descartan los guardados. */
const CAM_VERSION = 2;

const KEY = 'taller-escritorios-v2';
const OLD_KEY = 'taller-escritorios-v1';
const MAX_HISTORY = 80;

/** Eventos del modelo y lo que llevan. */
export interface StoreEvents {
  /** El modelo completo cambió (cargar, plantilla, deshacer). */
  reset: void;
  added: Piece;
  removed: string;
  /** Cambió la forma o el material de una pieza. */
  rebuilt: Piece;
  /** Cambió solo la posición o el nombre de una pieza. */
  moved: Piece;
  select: void;
  /** Se guardó un paso del historial. */
  history: void;
  /** Cambió una opción de la interfaz (imán, mover en altura, proyecto). */
  options: void;
  /** Cambió el entorno (habitación). */
  room: void;
}
type EventName = keyof StoreEvents;
type Listener<E extends EventName> = (data: StoreEvents[E]) => void;

interface Saved {
  pieces: Piece[];
  room?: Room | null;
  cfg?: Partial<DeskConfig>;
  proj?: Partial<Project>;
  cam?: Partial<CameraSettings>;
  camV?: number;
  kits?: Record<string, Kit>;
  prices?: Partial<PriceList>;
}

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw) as Saved; if (d && Array.isArray(d.pieces)) return d; }
    const old = localStorage.getItem(OLD_KEY);
    if (old) { const o = JSON.parse(old); if (Array.isArray(o)) return { pieces: o as Piece[] }; }
  } catch { /* almacenamiento bloqueado: se arranca con la plantilla */ }
  return null;
}

export interface UpdateOptions {
  /** false si solo cambia la posición (no hace falta reconstruir la malla). */
  geometry?: boolean;
  /** false durante un arrastre: se guarda al soltar. */
  commit?: boolean;
}

export class Store {
  pieces: Piece[] = [];
  selId: string | null = null;
  room: Room | null = null;
  cfg: DeskConfig = clone(DEFAULT_CFG);
  proj: Project = { name: 'Escritorio en L', client: '', notes: '', chair: true };
  snapOn = true;
  vertOn = false;
  cam: CameraSettings = { ...DEFAULT_CAMERA };
  /** Escritorios agrupados (generados por "Escritorio a medida"). */
  kits: Record<string, Kit> = {};
  /** Precios del presupuesto (por material y extras). */
  prices: PriceList = defaultPrices();

  /** Aumenta con cada evento: React lo usa para saber cuándo volver a dibujar. */
  version = 0;

  private listeners: { [E in EventName]?: Listener<E>[] } = {};
  private anyListeners = new Set<() => void>();
  private history: string[] = [];
  private hIndex = -1;
  private nextId = 1;

  /* ---- eventos ---- */
  on<E extends EventName>(evt: E, fn: Listener<E>): () => void {
    const list = (this.listeners[evt] ??= []) as Listener<E>[];
    list.push(fn);
    return () => { this.listeners[evt] = list.filter((f) => f !== fn) as never; };
  }
  /** Se llama con cualquier evento (para React). */
  subscribe = (fn: () => void): (() => void) => {
    this.anyListeners.add(fn);
    return () => { this.anyListeners.delete(fn); };
  };
  getVersion = (): number => this.version;

  private emit<E extends EventName>(evt: E, ...data: StoreEvents[E] extends void ? [] : [StoreEvents[E]]): void {
    (this.listeners[evt] as Listener<E>[] | undefined)?.forEach((fn) => fn(data[0] as StoreEvents[E]));
    this.version++;
    this.anyListeners.forEach((fn) => fn());
  }

  /* ---- lectura ---- */
  newId(): string { return 'p' + this.nextId++; }
  byId(id: string | null): Piece | null { return id ? this.pieces.find((p) => p.id === id) ?? null : null; }
  selected(): Piece | null { return this.byId(this.selId); }
  get canUndo(): boolean { return this.hIndex > 0; }
  get canRedo(): boolean { return this.hIndex < this.history.length - 1; }

  /* ---- ciclo de vida ---- */
  init(): void {
    const saved = readSaved();
    if (saved) {
      this.pieces = saved.pieces;
      this.room = saved.room ?? null;
      if (saved.cfg) Object.assign(this.cfg, saved.cfg);
      if (saved.proj) Object.assign(this.proj, saved.proj);
      if (saved.cam && saved.camV === CAM_VERSION) Object.assign(this.cam, saved.cam);
      if (saved.kits) this.kits = saved.kits;
      if (saved.prices) this.prices = mergePrices(saved.prices);
      for (const id of [...this.pieces.map((p) => p.id), ...Object.keys(this.kits)]) {
        const n = parseInt(String(id).slice(1), 10);
        if (n >= this.nextId) this.nextId = n + 1;
      }
    } else {
      const kit: Kit = { id: this.newKitId(), cfg: clone(this.cfg), ox: 0, oz: 0 };
      this.kits = { [kit.id]: kit };
      this.pieces = buildKit(kit);
    }
    this.recenter();
    this.emit('reset');
    this.commit();
  }

  /**
   * Lleva la habitación al centro de la escena (origen) y mueve con ella las piezas y escritorios,
   * para que todo conserve su lugar dentro del cuarto.
   */
  private recenter(): boolean {
    if (!this.room) return false;
    const r = normalizeRoom(this.room), b = roomBounds(r);
    const cx = Math.round((b.x0 + b.x1) / 2), cz = Math.round((b.z0 + b.z1) / 2);
    if (!cx && !cz) return false;
    this.room = { ...this.room, points: r.points.map(([x, z]): [number, number] => [x - cx, z - cz]) };
    this.pieces = this.pieces.map((p) => ({ ...p, x: p.x - cx, z: p.z - cz }));
    this.kits = Object.fromEntries(Object.entries(this.kits).map(([k, v]) => [k, { ...v, ox: v.ox - cx, oz: v.oz - cz }]));
    return true;
  }
  save(): void {
    try {
      const data: Saved = { pieces: this.pieces, room: this.room, cfg: this.cfg, proj: this.proj, cam: this.cam, camV: CAM_VERSION,
        kits: this.kits, prices: this.prices };
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch { /* sin almacenamiento: el diseño vive solo en esta pestaña */ }
  }
  commit(): void {
    this.history = this.history.slice(0, this.hIndex + 1);
    this.history.push(JSON.stringify({ pieces: this.pieces, room: this.room, kits: this.kits }));
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.hIndex = this.history.length - 1;
    this.save();
    this.emit('history');
  }
  private restore(i: number): void {
    this.hIndex = i;
    const snap = JSON.parse(this.history[i]) as { pieces: Piece[]; room: Room | null; kits?: Record<string, Kit> };
    this.pieces = snap.pieces; this.room = snap.room; this.kits = snap.kits ?? {};
    if (!this.byId(this.selId)) this.selId = null;
    this.emit('reset'); this.emit('select');
    this.save(); this.emit('history');
  }
  undo(): void { if (this.canUndo) this.restore(this.hIndex - 1); }
  redo(): void { if (this.canRedo) this.restore(this.hIndex + 1); }

  /* ---- cambios ---- */
  replaceAll(pieces: Piece[], room: Room | null, kits: Record<string, Kit> = {}): void {
    this.pieces = pieces; this.room = room; this.kits = kits; this.selId = null;
    this.recenter();
    this.emit('reset'); this.emit('select'); this.commit();
  }

  newKitId(): string { return 'k' + this.nextId++; }

  /** Agrega un escritorio agrupado (o reemplaza todo el diseño por él). */
  addKit(kit: Kit, opts: { replace: boolean; room: Room | null }): void {
    const pieces = buildKit(kit);
    if (opts.replace) { this.replaceAll(pieces, opts.room, { [kit.id]: kit }); return; }
    this.pieces = [...this.pieces, ...pieces];
    this.kits = { ...this.kits, [kit.id]: kit };
    this.room = opts.room;
    this.selId = pieces[0]?.id ?? null;
    this.recenter();
    this.emit('reset'); this.emit('select'); this.commit();
  }
  kitOf(p: Piece | null): Kit | null { return p?.kit ? this.kits[p.kit] ?? null : null; }

  /**
   * Cambia las medidas u opciones de un escritorio agrupado y rearma todas sus piezas.
   * Con commit:false se usa mientras se escribe (tiempo real); el paso del historial se guarda al terminar.
   */
  updateKit(id: string, patch: Partial<DeskConfig> & { ox?: number; oz?: number }, opts: { commit?: boolean } = {}): void {
    const kit = this.kits[id]; if (!kit) return;
    const { ox, oz, ...cfgPatch } = patch;
    const next: Kit = { ...kit, cfg: { ...kit.cfg, ...cfgPatch }, ox: ox ?? kit.ox, oz: oz ?? kit.oz };
    if (next.cfg.shape === 'L') next.cfg.c = Math.min(next.cfg.c, Math.min(next.cfg.a, next.cfg.b) - 15);
    this.kits = { ...this.kits, [id]: next };
    this.cfg = clone(next.cfg);
    const sel = this.selected(), wasKit = sel?.kit === id;
    this.pieces = [...this.pieces.filter((p) => p.kit !== id), ...buildKit(next)];
    // la selección se mantiene (los ids son estables); si la pieza ya no existe, se elige el tablero
    if (wasKit && !this.byId(this.selId)) this.selId = this.pieces.find((p) => p.kit === id)?.id ?? null;
    this.emit('reset'); this.emit('select');
    if (opts.commit !== false) this.commit(); else this.save();
  }
  add(p: Piece): void {
    this.pieces.push(p); this.selId = p.id;
    this.emit('added', p); this.emit('select'); this.commit();
  }
  remove(id: string): void {
    this.pieces = this.pieces.filter((p) => p.id !== id);
    if (this.selId === id) this.selId = null;
    this.emit('removed', id); this.emit('select'); this.commit();
  }
  update(id: string, patch: Partial<Piece>, opts: UpdateOptions = {}): void {
    const p = this.byId(id); if (!p) return;
    Object.assign(p, patch);
    if (opts.geometry === false) this.emit('moved', p); else this.emit('rebuilt', p);
    if (opts.commit !== false) this.commit();
  }
  select(id: string | null): void {
    if (this.selId === id) return;
    this.selId = id; this.emit('select');
  }
  setProj(patch: Partial<Project>): void { Object.assign(this.proj, patch); this.save(); this.emit('options'); }
  setCfg(cfg: DeskConfig): void { this.cfg = cfg; this.save(); }
  toggle(key: 'snapOn' | 'vertOn'): void { this[key] = !this[key]; this.emit('options'); }
  /** Cambia el entorno sin tocar las piezas. */
  setRoom(room: Room | null, opts: { commit?: boolean } = {}): void {
    this.room = room;
    // si al centrar se movieron las piezas, se redibuja todo; si no, solo la habitación
    if (this.recenter()) this.emit('reset'); else this.emit('room');
    if (opts.commit !== false) this.commit(); else this.save();
  }
  setCam(patch: Partial<CameraSettings>): void { Object.assign(this.cam, patch); this.save(); this.emit('options'); }
  setPrices(prices: PriceList): void { this.prices = prices; this.save(); this.emit('options'); }
  /** Aplica un acabado: tableros con un material, estructura con otro (también en los escritorios agrupados). */
  applyFinish(top: MatKey, structure: MatKey): void {
    const isTop = (p: Piece) => p.type === 'tablero' || p.type === 'tableroL' || p.type === 'estante';
    for (const k of Object.values(this.kits)) k.cfg = { ...k.cfg, mt: top, ms: structure };
    this.pieces = this.pieces.map((p) => (p.mat === 'metal' ? p : { ...p, mat: isTop(p) ? top : structure }));
    this.cfg = { ...this.cfg, mt: top, ms: structure };
    this.emit('reset'); this.commit();
  }
}

export const store = new Store();
