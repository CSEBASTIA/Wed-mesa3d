// Composición de la pantalla: escena a pantalla completa con la interfaz flotando encima.
import { useCallback, useState } from 'react';
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

type Dialog = 'template' | 'export' | 'camera' | null;

export function App() {
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = useCallback(() => setDialog(null), []);
  const onReady = useCallback((vp: Viewport | null) => setViewport(vp), []);
  useShortcuts(dialog === null);
  // con la ventana de cámara abierta se puede probar el movimiento mientras se ajusta
  useCameraKeys(viewport, dialog === null || dialog === 'camera');
  useViewInsets(viewport);

  const openExport = () => {
    if (!store.pieces.length) { toast('Agrega piezas o crea un escritorio a medida antes de exportar.'); return; }
    setDialog('export');
  };
  const openCamera = () => setDialog('camera');

  return (
    <div className="app">
      <Stage onReady={onReady} />
      <TopBar onExport={openExport} onCamera={openCamera} />
      <LibraryPanel onTemplate={() => setDialog('template')} />
      <SidePanel onExport={openExport} />
      <BottomBar viewport={viewport} onCamera={openCamera} />
      {dialog === 'template' && <TemplateDialog viewport={viewport} onClose={close} />}
      {dialog === 'export' && viewport && <ExportDialog viewport={viewport} onClose={close} />}
      {dialog === 'camera' && <CameraDialog onClose={close} />}
    </div>
  );
}
