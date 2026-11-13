// Composición de la pantalla: barra, catálogo, escena 3D, ficha y ventanas.
import { useCallback, useState } from 'react';
import type { Viewport } from './three/viewport';
import { store } from './app/context';
import { toast } from './app/toast';
import { useShortcuts } from './app/useShortcuts';
import { Toolbar } from './components/Toolbar';
import { CatalogPanel } from './components/CatalogPanel';
import { Stage } from './components/Stage';
import { Inspector } from './components/Inspector';
import { CutlistPanel } from './components/CutlistPanel';
import { TemplateDialog } from './components/TemplateDialog';
import { ExportDialog } from './components/ExportDialog';

type Dialog = 'template' | 'export' | null;

export function App() {
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = useCallback(() => setDialog(null), []);
  const onReady = useCallback((vp: Viewport | null) => setViewport(vp), []);
  useShortcuts(dialog === null);

  const openExport = () => {
    if (!store.pieces.length) { toast('Agrega piezas o crea un escritorio a medida antes de exportar.'); return; }
    setDialog('export');
  };

  return (
    <>
      <Toolbar viewport={viewport} onOpenTemplate={() => setDialog('template')} onOpenExport={openExport} />
      <div className="work">
        <CatalogPanel />
        <Stage onReady={onReady} />
        <aside className="side">
          <Inspector />
          <CutlistPanel />
        </aside>
      </div>
      {dialog === 'template' && <TemplateDialog viewport={viewport} onClose={close} />}
      {dialog === 'export' && viewport && <ExportDialog viewport={viewport} onClose={close} />}
    </>
  );
}
