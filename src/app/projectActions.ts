// Acciones de proyecto que usan la interfaz: guardar, abrir, nuevo, importar y exportar.
import { DEFAULT_CFG } from '../core/templates';
import { clone, slug } from '../core/format';
import { loadProject, newProjectId, parseProject, projectToJson, saveProject, type ProjectFile } from '../core/projects';
import type { Viewport } from '../three/viewport';
import { store } from './context';
import { toast } from './toast';

/**
 * Guarda el diseño actual. Sin `asNew`, reemplaza el proyecto abierto (si hay uno).
 * Devuelve false si no se pudo (por ejemplo, sin espacio en el navegador).
 */
export function saveCurrent(vp: Viewport | null, name: string, asNew = false): boolean {
  const id = !asNew && store.projectId ? store.projectId : newProjectId();
  const prev = !asNew && store.projectId ? loadProject(store.projectId) : null;
  const now = Date.now();
  const clean = name.trim() || store.proj.name || 'Proyecto sin nombre';
  const data = store.snapshot();
  data.proj = { ...data.proj, name: clean };
  const file: ProjectFile = {
    app: 'taller-escritorios', version: 1, id, name: clean,
    createdAt: prev?.createdAt ?? now, updatedAt: now,
    pieces: data.pieces.length, thumb: vp ? vp.thumbnail() : prev?.thumb, data
  };
  try {
    saveProject(file);
  } catch (e) {
    toast((e as Error).message);
    return false;
  }
  store.markSaved(id, clean);
  toast(`Proyecto «${clean}» guardado.`);
  return true;
}

export function openProject(id: string, vp: Viewport | null): boolean {
  const file = loadProject(id);
  if (!file) { toast('No se encontró ese proyecto.'); return false; }
  store.loadDesign(file.data, file.id);
  vp?.setView('iso');
  toast(`Abriste «${file.name}».`);
  return true;
}

/** Empieza un diseño vacío, sin habitación. */
export function newProject(vp: Viewport | null): void {
  store.loadDesign({
    pieces: [], room: null, kits: {}, cfg: clone(DEFAULT_CFG),
    proj: { name: 'Proyecto nuevo', client: '', notes: '', chair: true }
  }, null);
  vp?.setView('iso');
  toast('Proyecto nuevo. Empieza creando el entorno o un escritorio a medida.');
}

/** Descarga un proyecto (guardado o el diseño actual) como archivo .json. */
export function exportProject(file: ProjectFile): void {
  const blob = new Blob([projectToJson(file)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = slug(file.name) + '.taller.json';
  document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(`Archivo «${a.download}» descargado.`);
}

/** El diseño actual como archivo de proyecto (aunque no esté guardado). */
export function currentAsFile(): ProjectFile {
  const now = Date.now(), data = store.snapshot();
  return {
    app: 'taller-escritorios', version: 1, id: store.projectId ?? newProjectId(), name: store.proj.name || 'Proyecto',
    createdAt: now, updatedAt: now, pieces: data.pieces.length, data
  };
}

/** Importa un archivo .json: lo guarda como proyecto nuevo y lo abre. */
export async function importProject(fileInput: File, vp: Viewport | null): Promise<boolean> {
  try {
    const parsed = parseProject(await fileInput.text());
    const now = Date.now();
    const file: ProjectFile = { ...parsed, id: newProjectId(), updatedAt: now };
    saveProject(file);
    store.loadDesign(file.data, file.id);
    vp?.setView('iso');
    toast(`Importaste «${file.name}».`);
    return true;
  } catch (e) {
    toast((e as Error).message);
    return false;
  }
}
