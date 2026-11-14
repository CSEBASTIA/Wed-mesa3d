// Barra superior: marca y proyecto, herramientas de edición, cámara y exportación.
import { store, actions, useStoreVersion } from '../app/context';
import { toast } from '../app/toast';
import { Icon, BrandMark, type IconName } from './Icon';

interface TopBarProps {
  onExport: () => void;
  onCamera: () => void;
  onEnvironment: () => void;
  onHelp: () => void;
  onProjects: () => void;
  onSave: () => void;
}

function Tool({ icon, label, onClick, pressed, disabled, danger }: {
  icon: IconName; label: string; onClick: () => void; pressed?: boolean; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button className={'icon-btn' + (danger ? ' danger' : '')} title={label} aria-label={label}
      aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      <Icon name={icon} />
    </button>
  );
}

export function TopBar({ onExport, onCamera, onEnvironment, onHelp, onProjects, onSave }: TopBarProps) {
  useStoreVersion();
  const clear = () => {
    if (!store.pieces.length) return;
    actions.clearAll();
    toast('Diseño vaciado. Deshacer recupera las piezas.');
  };
  return (
    <header className="topbar">
      <div className="brand float">
        <button className="brand-btn" onClick={onProjects} title="Proyectos: guardar y abrir diseños">
          <div className="brand-mark"><BrandMark /></div>
          <div className="brand-text">
            <b>Taller de Escritorios</b>
            <span>
              {store.proj.name || 'Sin nombre'}
              {store.dirty && <em className="unsaved-dot" title="Cambios sin guardar"> · sin guardar</em>}
            </span>
          </div>
        </button>
        <button className="icon-btn" title={store.projectId ? 'Guardar cambios (Ctrl+S)' : 'Guardar proyecto (Ctrl+S)'}
          aria-label="Guardar proyecto" onClick={onSave}>
          <Icon name="save" />
        </button>
      </div>

      <div className="toolgroup float" role="toolbar" aria-label="Edición">
        <Tool icon="undo" label="Deshacer (Ctrl+Z)" disabled={!store.canUndo} onClick={() => store.undo()} />
        <Tool icon="redo" label="Rehacer (Ctrl+Y)" disabled={!store.canRedo} onClick={() => store.redo()} />
        <span className="div" />
        <Tool icon="magnet" label="Imán: pegar a las caras de otras piezas" pressed={store.snapOn} onClick={() => store.toggle('snapOn')} />
        <Tool icon="moveV" label="Mover en altura al arrastrar (o mantén Shift)" pressed={store.vertOn} onClick={() => store.toggle('vertOn')} />
        <span className="div" />
        <Tool icon="trash" label="Vaciar el diseño" danger disabled={!store.pieces.length} onClick={clear} />
      </div>

      <div className="actions-r">
        <button className="icon-btn float" title="Tutorial" aria-label="Ver el tutorial" onClick={onHelp}>
          <Icon name="help" />
        </button>
        <button className="icon-btn float" title="Entorno: cuarto, sala u oficina" aria-label="Entorno" onClick={onEnvironment}>
          <Icon name="home" />
        </button>
        <button className="icon-btn float" title="Cámara y sensibilidad" aria-label="Cámara y sensibilidad" onClick={onCamera}>
          <Icon name="sliders" />
        </button>
        <button className="btn primary lg" data-tour="export" onClick={onExport}>
          <Icon name="download" /><span className="lbl">Exportar plano</span>
        </button>
      </div>
    </header>
  );
}
