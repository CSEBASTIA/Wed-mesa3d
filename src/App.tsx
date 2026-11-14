// Composición de la pantalla: escena a pantalla completa con la interfaz flotando encima.
import { useCallback, useEffect, useState } from 'react';
import type { Viewport } from './three/viewport';
import { store } from './app/context';
import { toast } from './app/toast';
import { useShortcuts } from './app/useShortcuts';
import { useCameraKeys } from './app/useCameraKeys';
import { useViewInsets } from './app/useViewInsets';
import { Stage } from './components/Stage';
import { TopBar } from './components/TopBar';
import { LibraryPanel } from './components/LibraryPanel';
import { SidePanel } from './components/SidePanel';
import { BottomBar } from './components/BottomBar';
import { TemplateDialog } from './components/TemplateDialog';
import { ExportDialog } from './components/ExportDialog';
import { CameraDialog } from './components/CameraDialog';
import { EnvironmentDialog } from './components/EnvironmentDialog';
import { Icon } from './components/Icon';
import { Tour, tutorialSeen } from './components/Tour';
import { ProjectsDialog } from './components/ProjectsDialog';
import { saveCurrent } from './app/projectActions';

type Dialog = 'template' | 'export' | 'camera' | 'environment' | 'tour' | 'projects' | null;

const PANELS_KEY = 'taller-paneles';
function readPanels(): { left: boolean; right: boolean } {
  try { const v = JSON.parse(localStorage.getItem(PANELS_KEY) || ''); if (v && typeof v.left === 'boolean') return v; } catch { /* nada */ }
  return { left: true, right: true };
}

export function App() {
  const [viewport, setViewport] = useState<Viewport | null>(null);
  // la primera vez se abre el tutorial
  const [dialog, setDialog] = useState<Dialog>(() => (tutorialSeen() ? null : 'tour'));
  const [panels, setPanels] = useState(readPanels);
  const close = useCallback(() => setDialog(null), []);
  const onReady = useCallback((vp: Viewport | null) => setViewport(vp), []);
  useShortcuts(dialog === null);

  // Guardar: si el proyecto ya existe, se guarda directo; si no, se abre la ventana para ponerle nombre
  const save = useCallback(() => {
    if (store.projectId) saveCurrent(viewport, store.proj.name);
    else setDialog('projects');
  }, [viewport]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save]);
  // con la ventana de cámara abierta se puede probar el movimiento mientras se ajusta
  useCameraKeys(viewport, dialog === null || dialog === 'camera');
  useViewInsets(viewport, panels);
  useEffect(() => { try { localStorage.setItem(PANELS_KEY, JSON.stringify(panels)); } catch { /* nada */ } }, [panels]);

  const openExport = () => {
    if (!store.pieces.length) { toast('Agrega piezas o crea un escritorio a medida antes de exportar.'); return; }
    setDialog('export');
  };
  const openCamera = () => setDialog('camera');
  const toggle = (side: 'left' | 'right') => setPanels((p) => ({ ...p, [side]: !p[side] }));

  return (
    <div className={'app' + (panels.left ? '' : ' no-left') + (panels.right ? '' : ' no-right')}>
      <Stage onReady={onReady} />
      <TopBar onExport={openExport} onCamera={openCamera} onEnvironment={() => setDialog('environment')}
        onHelp={() => { setPanels({ left: true, right: true }); setDialog('tour'); }}
        onProjects={() => setDialog('projects')} onSave={save} />
      {panels.left
        ? <LibraryPanel onTemplate={() => setDialog('template')} onEnvironment={() => setDialog('environment')} onCollapse={() => toggle('left')} />
        : <button className="panel-tab float left" title="Mostrar biblioteca" aria-label="Mostrar biblioteca" onClick={() => toggle('left')}>
            <Icon name="showLeft" /><span>Biblioteca</span>
          </button>}
      {panels.right
        ? <SidePanel onExport={openExport} onCollapse={() => toggle('right')} />
        : <button className="panel-tab float right" title="Mostrar detalle" aria-label="Mostrar panel de detalle" onClick={() => toggle('right')}>
            <Icon name="showRight" /><span>Detalle</span>
          </button>}
      <BottomBar viewport={viewport} onCamera={openCamera} />
      {dialog === 'template' && <TemplateDialog viewport={viewport} onClose={close} />}
      {dialog === 'export' && viewport && <ExportDialog viewport={viewport} onClose={close} />}
      {dialog === 'camera' && <CameraDialog onClose={close} />}
      {dialog === 'environment' && <EnvironmentDialog viewport={viewport} onClose={close} />}
      {dialog === 'tour' && <Tour onClose={close} />}
      {dialog === 'projects' && <ProjectsDialog viewport={viewport} onClose={close} />}
    </div>
  );
}
