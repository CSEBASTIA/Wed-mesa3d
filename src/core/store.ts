// Estado único de la aplicación + historial + guardado + eventos.
// Toda modificación del modelo pasa por aquí; la vista 3D y React solo escuchan.
import { DEFAULT_CFG, genTemplate } from './templates';
import { clone } from './format';
import type { CameraSettings, DeskConfig, Piece, Project, Room } from './types';

export const DEFAULT_CAMERA: CameraSettings = { move: 120, rotate: 1, zoom: 1 };

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
}
type EventName = keyof StoreEvents;
type Listener<E extends EventName> = (data: StoreEvents[E]) => void;

interface Saved {
  pieces: Piece[];
  room?: Room | null;
  cfg?: Partial<DeskConfig>;
  proj?: Partial<Project>;
  cam?: Partial<CameraSettings>;
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
      if (saved.cam) Object.assign(this.cam, saved.cam);
      for (const p of this.pieces) {
        const n = parseInt(String(p.id).slice(1), 10);
        if (n >= this.nextId) this.nextId = n + 1;
      }
    } else {
      this.pieces = genTemplate(this.cfg, () => this.newId());
    }
    this.emit('reset');
    this.commit();
  }
  save(): void {
    try {
      const data: Saved = { pieces: this.pieces, room: this.room, cfg: this.cfg, proj: this.proj, cam: this.cam };
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch { /* sin almacenamiento: el diseño vive solo en esta pestaña */ }
  }
  commit(): void {
    this.history = this.history.slice(0, this.hIndex + 1);
    this.history.push(JSON.stringify({ pieces: this.pieces, room: this.room }));
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.hIndex = this.history.length - 1;
    this.save();
    this.emit('history');
  }
  private restore(i: number): void {
    this.hIndex = i;
    const snap = JSON.parse(this.history[i]) as { pieces: Piece[]; room: Room | null };
    this.pieces = snap.pieces; this.room = snap.room;
    if (!this.byId(this.selId)) this.selId = null;
    this.emit('reset'); this.emit('select');
    this.save(); this.emit('history');
  }
  undo(): void { if (this.canUndo) this.restore(this.hIndex - 1); }
  redo(): void { if (this.canRedo) this.restore(this.hIndex + 1); }

  /* ---- cambios ---- */
  replaceAll(pieces: Piece[], room: Room | null): void {
    this.pieces = pieces; this.room = room; this.selId = null;
    this.emit('reset'); this.emit('select'); this.commit();
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
  setCam(patch: Partial<CameraSettings>): void { Object.assign(this.cam, patch); this.save(); this.emit('options'); }
}

export const store = new Store();
