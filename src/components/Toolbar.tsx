// Barra superior.
import { store, actions, useStoreVersion } from '../app/context';
import { toast } from '../app/toast';
import type { Viewport } from '../three/viewport';

interface ToolbarProps {
  viewport: Viewport | null;
  onOpenTemplate: () => void;
  onOpenExport: () => void;
}

export function Toolbar({ viewport, onOpenTemplate, onOpenExport }: ToolbarProps) {
  useStoreVersion();
  const clear = () => {
    if (!store.pieces.length) return;
    actions.clearAll();
    toast('Diseño vaciado. Deshacer recupera las piezas.');
  };
  return (
    <header className="bar">
      <h1 className="brand"><span />Taller de Escritorios</h1>
      <div className="tools">
        <button className="btn primary" onClick={onOpenTemplate}>Escritorio a medida</button>
        <button className="btn primary" onClick={onOpenExport}>Exportar plano</button>
        <span className="sep" />
        <button className="btn" title="Ctrl+Z" disabled={!store.canUndo} onClick={() => store.undo()}>Deshacer</button>
        <button className="btn" title="Ctrl+Y" disabled={!store.canRedo} onClick={() => store.redo()}>Rehacer</button>
        <span className="sep" />
        <button className="btn" aria-pressed={store.vertOn} title="Al arrastrar, la pieza sube y baja (o mantén Shift)"
          onClick={() => store.toggle('vertOn')}>Mover en altura</button>
        <button className="btn" aria-pressed={store.snapOn} title="Las piezas se pegan a las caras de las demás"
          onClick={() => store.toggle('snapOn')}>Imán</button>
        <span className="sep" />
        <button className="btn" onClick={() => viewport?.setView('iso')}>Vista 3D</button>
        <button className="btn" onClick={() => viewport?.setView('front')}>Frente</button>
        <button className="btn" onClick={() => viewport?.setView('top')}>Arriba</button>
        <span className="sep" />
        <button className="btn danger" onClick={clear}>Vaciar</button>
      </div>
    </header>
  );
}
