// Ventana "Proyectos": guardar el diseño actual y abrir, duplicar, renombrar, exportar o borrar los guardados.
import { useRef, useState } from 'react';
import { deleteProject, duplicateProject, listProjects, loadProject, renameProject, timeAgo, type ProjectMeta } from '../core/projects';
import { store, useStoreVersion } from '../app/context';
import { currentAsFile, exportProject, importProject, newProject, openProject, saveCurrent } from '../app/projectActions';
import type { Viewport } from '../three/viewport';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { PieceIcon } from './PieceIcon';

/** Acción que espera confirmación porque hay cambios sin guardar. */
type Pending = { kind: 'open'; id: string; name: string } | { kind: 'new' } | null;

export function ProjectsDialog({ viewport, onClose }: { viewport: Viewport | null; onClose: () => void }) {
  useStoreVersion();
  const [list, setList] = useState<ProjectMeta[]>(listProjects);
  const [name, setName] = useState(store.proj.name || 'Proyecto sin nombre');
  const [pending, setPending] = useState<Pending>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const refresh = () => setList(listProjects());
  const currentId = store.projectId;

  const save = (asNew = false) => { if (saveCurrent(viewport, name, asNew)) refresh(); };

  /** Ejecuta la acción; si hay cambios sin guardar, primero pregunta. */
  const guard = (p: Exclude<Pending, null>) => {
    if (store.dirty && store.pieces.length) { setPending(p); return; }
    run(p);
  };
  const run = (p: Exclude<Pending, null>) => {
    setPending(null);
    if (p.kind === 'open') { if (openProject(p.id, viewport)) onClose(); }
    else { newProject(viewport); onClose(); }
  };

  return (
    <Modal title="Proyectos" wide onClose={onClose}
      subtitle="Tus diseños se guardan en este navegador. Exporta un archivo para respaldarlos o abrirlos en otra computadora.">

      {/* proyecto actual */}
      <div className="current-project">
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor="pj-name">
            {currentId ? 'Proyecto abierto' : 'Diseño actual (sin guardar)'}
            {store.dirty && currentId && <span className="unsaved">· cambios sin guardar</span>}
          </label>
          <div className="input">
            <input id="pj-name" type="text" maxLength={60} value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') save(); }} />
          </div>
        </div>
        <div className="current-actions">
          <button className="btn primary" onClick={() => save()} title="Ctrl+S">
            <Icon name="save" size={16} />{currentId ? 'Guardar cambios' : 'Guardar proyecto'}
          </button>
          {currentId && <button className="btn" onClick={() => save(true)}>Guardar como nuevo</button>}
        </div>
      </div>

      {pending && (
        <div className="confirm-bar" role="alertdialog" aria-label="Cambios sin guardar">
          <span>Tienes cambios sin guardar en «{store.proj.name}». ¿Qué hacemos antes de {pending.kind === 'new' ? 'empezar uno nuevo' : `abrir «${pending.name}»`}?</span>
          <div>
            <button className="btn primary" onClick={() => { if (saveCurrent(viewport, name)) run(pending); }}>Guardar y continuar</button>
            <button className="btn" onClick={() => run(pending)}>Continuar sin guardar</button>
            <button className="btn ghost" onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="projects-toolbar">
        <h4>Guardados <span className="num">{list.length}</span></h4>
        <div className="row-actions" style={{ marginTop: 0 }}>
          <button className="btn" onClick={() => guard({ kind: 'new' })}><Icon name="plus" size={16} />Nuevo proyecto</button>
          <button className="btn" onClick={() => fileInput.current?.click()}><Icon name="upload" size={16} />Importar archivo</button>
          <button className="btn" onClick={() => exportProject(currentAsFile())}><Icon name="download" size={16} />Exportar el actual</button>
          <input ref={fileInput} type="file" accept=".json,application/json" hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = '';
              if (f && await importProject(f, viewport)) { refresh(); onClose(); }
            }} />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <PieceIcon type="deskL" />
          <b>Todavía no guardaste proyectos</b>
          <p>Ponle nombre arriba y pulsa "Guardar proyecto". También puedes usar Ctrl+S en cualquier momento.</p>
        </div>
      ) : (
        <div className="project-grid">
          {list.map((p) => (
            <div key={p.id} className={'project-card' + (p.id === currentId ? ' current' : '')}>
              <button className="project-thumb" onClick={() => p.id !== currentId && guard({ kind: 'open', id: p.id, name: p.name })}
                title={p.id === currentId ? 'Es el proyecto abierto' : 'Abrir'}>
                {p.thumb ? <img src={p.thumb} alt="" /> : <PieceIcon type="deskL" />}
                {p.id === currentId && <span className="badge-open">Abierto</span>}
              </button>
              <div className="project-info">
                {renaming === p.id ? (
                  <div className="input">
                    <input autoFocus aria-label="Nuevo nombre" value={renameText} maxLength={60}
                      onChange={(e) => setRenameText(e.target.value)}
                      onBlur={() => { if (renameText.trim()) { renameProject(p.id, renameText.trim()); if (p.id === currentId) store.markSaved(p.id, renameText.trim()); } setRenaming(null); refresh(); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setRenaming(null); }} />
                  </div>
                ) : (
                  <b title={p.name}>{p.name}</b>
                )}
                <small>{p.pieces} {p.pieces === 1 ? 'pieza' : 'piezas'} · {timeAgo(p.updatedAt)}</small>
              </div>
              {confirmDelete === p.id ? (
                <div className="project-actions danger-zone">
                  <span>¿Eliminar?</span>
                  <button className="btn danger" onClick={() => {
                    deleteProject(p.id); setConfirmDelete(null); refresh();
                    if (p.id === currentId) store.detachProject();
                  }}>Sí, eliminar</button>
                  <button className="btn ghost" onClick={() => setConfirmDelete(null)}>No</button>
                </div>
              ) : (
                <div className="project-actions">
                  <button className="btn primary" disabled={p.id === currentId}
                    onClick={() => guard({ kind: 'open', id: p.id, name: p.name })}>Abrir</button>
                  <button className="icon-btn" title="Renombrar" aria-label="Renombrar" onClick={() => { setRenaming(p.id); setRenameText(p.name); }}><Icon name="pencil" size={16} /></button>
                  <button className="icon-btn" title="Duplicar" aria-label="Duplicar" onClick={() => { duplicateProject(p.id); refresh(); }}><Icon name="copy" size={16} /></button>
                  <button className="icon-btn" title="Exportar archivo" aria-label="Exportar archivo" onClick={() => { const f = loadProject(p.id); if (f) exportProject(f); }}><Icon name="download" size={16} /></button>
                  <button className="icon-btn danger" title="Eliminar" aria-label="Eliminar" onClick={() => setConfirmDelete(p.id)}><Icon name="trash" size={16} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
