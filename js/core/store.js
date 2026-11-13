// Estado único de la aplicación + historial + guardado + eventos.
// Toda modificación del modelo pasa por aquí; la vista 3D y la interfaz solo escuchan eventos.
//
// Eventos:
//   reset            el modelo completo cambió (cargar, plantilla, deshacer)
//   added (p)        se agregó una pieza
//   removed (id)     se eliminó una pieza
//   rebuilt (p)      cambió la forma o el material de una pieza
//   moved (p)        cambió solo la posición de una pieza
//   select           cambió la pieza seleccionada
//   history          se guardó un paso (actualiza lista de cortes, deshacer/rehacer)
import { DEFAULT_CFG, genTemplate } from './templates.js';
import { clone } from '../utils/format.js';

const KEY = 'taller-escritorios-v2';
const OLD_KEY = 'taller-escritorios-v1';
const MAX_HISTORY = 80;

function readSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw); if (d && Array.isArray(d.pieces)) return d; }
    const old = localStorage.getItem(OLD_KEY);
    if (old) { const o = JSON.parse(old); if (Array.isArray(o)) return { pieces: o }; }
  } catch (e) { /* almacenamiento bloqueado: se arranca con la plantilla */ }
  return null;
}

function createStore() {
  const listeners = {};
  let history = [], hIndex = -1, nextId = 1;

  const store = {
    pieces: [],
    selId: null,
    room: null,                        // { w, d, corner } o null
    cfg: clone(DEFAULT_CFG),           // última configuración de "Escritorio a medida"
    proj: { name: 'Escritorio en L', client: '', notes: '', chair: true },
    snapOn: true,
    vertOn: false,

    /* ---- eventos ---- */
    on(evt, fn) {
      (listeners[evt] = listeners[evt] || []).push(fn);
      return () => { listeners[evt] = listeners[evt].filter((f) => f !== fn); };
    },
    emit(evt, data) { (listeners[evt] || []).forEach((fn) => fn(data)); },

    /* ---- lectura ---- */
    newId() { return 'p' + nextId++; },
    byId(id) { return this.pieces.find((p) => p.id === id) || null; },
    selected() { return this.byId(this.selId); },
    get canUndo() { return hIndex > 0; },
    get canRedo() { return hIndex < history.length - 1; },

    /* ---- ciclo de vida ---- */
    init() {
      const saved = readSaved();
      if (saved) {
        this.pieces = saved.pieces;
        this.room = saved.room || null;
        if (saved.cfg) Object.assign(this.cfg, saved.cfg);
        if (saved.proj) Object.assign(this.proj, saved.proj);
        this.pieces.forEach((p) => { const n = parseInt(String(p.id).slice(1), 10); if (n >= nextId) nextId = n + 1; });
      } else {
        this.pieces = genTemplate(this.cfg, () => this.newId());
      }
      this.emit('reset');
      this.commit();
    },
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ pieces: this.pieces, room: this.room, cfg: this.cfg, proj: this.proj }));
      } catch (e) { /* sin almacenamiento: el diseño vive solo en esta pestaña */ }
    },
    commit() {
      history = history.slice(0, hIndex + 1);
      history.push(JSON.stringify({ pieces: this.pieces, room: this.room }));
      if (history.length > MAX_HISTORY) history.shift();
      hIndex = history.length - 1;
      this.save();
      this.emit('history');
    },
    restore(i) {
      hIndex = i;
      const snap = JSON.parse(history[i]);
      this.pieces = snap.pieces; this.room = snap.room;
      if (!this.byId(this.selId)) this.selId = null;
      this.emit('reset'); this.emit('select');
      this.save(); this.emit('history');
    },
    undo() { if (this.canUndo) this.restore(hIndex - 1); },
    redo() { if (this.canRedo) this.restore(hIndex + 1); },

    /* ---- cambios ---- */
    replaceAll(pieces, room) {
      this.pieces = pieces; this.room = room || null; this.selId = null;
      this.emit('reset'); this.emit('select'); this.commit();
    },
    add(p) {
      this.pieces.push(p); this.selId = p.id;
      this.emit('added', p); this.emit('select'); this.commit();
    },
    remove(id) {
      this.pieces = this.pieces.filter((p) => p.id !== id);
      if (this.selId === id) this.selId = null;
      this.emit('removed', id); this.emit('select'); this.commit();
    },
    /**
     * Cambia propiedades de una pieza.
     * @param {object} opts geometry:false si solo cambia la posición; commit:false durante un arrastre
     */
    update(id, patch, opts = {}) {
      const p = this.byId(id); if (!p) return;
      Object.assign(p, patch);
      this.emit(opts.geometry === false ? 'moved' : 'rebuilt', p);
      if (opts.commit !== false) this.commit();
    },
    select(id) {
      if (this.selId === id) return;
      this.selId = id; this.emit('select');
    },
    setProj(patch) { Object.assign(this.proj, patch); this.save(); }
  };
  return store;
}

export const store = createStore();
