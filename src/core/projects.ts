// Proyectos guardados: cada diseño se guarda con nombre, fecha y miniatura en el navegador (localStorage),
// y se puede exportar e importar como archivo .json para respaldarlo o pasarlo a otra computadora.
import type { DeskConfig, Kit, Piece, Project, Room } from './types';
import type { PriceList } from './budget';

/** Todo lo que define un diseño. */
export interface DesignData {
  pieces: Piece[];
  room: Room | null;
  kits: Record<string, Kit>;
  cfg: DeskConfig;
  proj: Project;
  prices?: PriceList;
}

/** Datos de la lista (livianos, sin el diseño completo). */
export interface ProjectMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  pieces: number;
  /** Miniatura en JPEG (data URL). */
  thumb?: string;
}

/** Archivo de proyecto: el formato de guardado y de exportación. */
export interface ProjectFile extends ProjectMeta {
  app: 'taller-escritorios';
  version: 1;
  data: DesignData;
}

const INDEX_KEY = 'taller-proyectos';
const fileKey = (id: string) => 'taller-proyecto-' + id;

export const newProjectId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Lista de proyectos guardados, del más reciente al más antiguo. */
export function listProjects(): ProjectMeta[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const list = raw ? (JSON.parse(raw) as ProjectMeta[]) : [];
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

function writeIndex(list: ProjectMeta[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

/**
 * Guarda (o reemplaza) un proyecto. Lanza un error con un mensaje claro si el navegador
 * no tiene espacio (las miniaturas son lo que más ocupa).
 */
export function saveProject(file: ProjectFile): void {
  const { data: _data, app: _app, version: _v, ...meta } = file;
  try {
    localStorage.setItem(fileKey(file.id), JSON.stringify(file));
    writeIndex([meta, ...listProjects().filter((p) => p.id !== file.id)]);
  } catch {
    // sin espacio: reintentar sin miniatura
    try {
      const lean = { ...file, thumb: undefined };
      localStorage.setItem(fileKey(file.id), JSON.stringify(lean));
      writeIndex([{ ...meta, thumb: undefined }, ...listProjects().filter((p) => p.id !== file.id)]);
    } catch {
      throw new Error('No hay espacio en el navegador para guardar. Exporta y borra algunos proyectos.');
    }
  }
}

export function loadProject(id: string): ProjectFile | null {
  try {
    const raw = localStorage.getItem(fileKey(id));
    return raw ? parseProject(raw) : null;
  } catch {
    return null;
  }
}

export function deleteProject(id: string): void {
  try {
    localStorage.removeItem(fileKey(id));
    writeIndex(listProjects().filter((p) => p.id !== id));
  } catch { /* nada */ }
}

export function renameProject(id: string, name: string): void {
  const file = loadProject(id); if (!file) return;
  saveProject({ ...file, name, updatedAt: Date.now() });
}

/** Copia de un proyecto con otro nombre e identificador. */
export function duplicateProject(id: string): ProjectFile | null {
  const file = loadProject(id); if (!file) return null;
  const now = Date.now();
  const copy: ProjectFile = { ...file, id: newProjectId(), name: file.name + ' (copia)', createdAt: now, updatedAt: now };
  saveProject(copy);
  return copy;
}

/** Lee un archivo de proyecto y comprueba que tenga lo necesario. */
export function parseProject(text: string): ProjectFile {
  let f: Partial<ProjectFile>;
  try { f = JSON.parse(text); } catch { throw new Error('El archivo no es un proyecto válido (no es JSON).'); }
  if (!f || f.app !== 'taller-escritorios' || !f.data || !Array.isArray(f.data.pieces)) {
    throw new Error('El archivo no es un proyecto del Taller de Escritorios.');
  }
  const now = Date.now();
  return {
    app: 'taller-escritorios', version: 1,
    id: typeof f.id === 'string' ? f.id : newProjectId(),
    name: typeof f.name === 'string' && f.name.trim() ? f.name : 'Proyecto importado',
    createdAt: typeof f.createdAt === 'number' ? f.createdAt : now,
    updatedAt: typeof f.updatedAt === 'number' ? f.updatedAt : now,
    pieces: f.data.pieces.length,
    thumb: typeof f.thumb === 'string' ? f.thumb : undefined,
    data: f.data as DesignData
  };
}

/** Texto del archivo para exportar (sin la miniatura, que se regenera al guardar). */
export const projectToJson = (file: ProjectFile): string => JSON.stringify({ ...file, thumb: undefined }, null, 2);

export function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'hace un momento';
  const m = Math.round(s / 60); if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  return new Date(ts).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
