// Panel izquierdo: entorno, escritorio a medida y biblioteca de piezas sueltas.
import { TYPES, PIECE_TYPES } from '../core/catalog';
import { pieceLabel } from '../core/cutlist';
import { ROOM_PRESETS } from '../core/room';
import { fmt } from '../core/format';
import { store, actions, useStoreVersion } from '../app/context';
import { toast } from '../app/toast';
import { PieceIcon } from './PieceIcon';
import { Icon } from './Icon';

interface LibraryPanelProps { onTemplate: () => void; onEnvironment: () => void; onCollapse: () => void }

export function LibraryPanel({ onTemplate, onEnvironment, onCollapse }: LibraryPanelProps) {
  useStoreVersion();
  const room = store.room;
  const roomName = room ? (ROOM_PRESETS.find((p) => p.kind === room.kind)?.name ?? 'Habitación') : null;
  return (
    <aside className="panel left float edge-l" aria-label="Biblioteca">
      <div className="panel-head">
        <h2>Biblioteca</h2>
        <button className="icon-btn sm" title="Minimizar panel" aria-label="Minimizar biblioteca" onClick={onCollapse}>
          <Icon name="hideLeft" size={17} />
        </button>
      </div>
      <div className="panel-body">
        <p className="eyebrow" style={{ marginTop: 2 }}>Entorno</p>
        <button className="feature" onClick={onEnvironment}>
          <PieceIcon type="room" />
          <div>
            <b>{roomName ? roomName : 'Crear entorno'}</b>
            <span className={roomName ? 'num' : undefined}>
              {room ? `${fmt(room.w)} × ${fmt(room.d)} cm · editar` : 'Cuarto, sala u oficina'}
            </span>
          </div>
        </button>

        <p className="eyebrow">Muebles</p>
        <button className="feature" onClick={onTemplate}>
          <PieceIcon type="deskL" />
          <div>
            <b>Escritorio a medida</b>
            <span>En L o recto, listo en segundos</span>
          </div>
        </button>

        <p className="eyebrow">Piezas sueltas</p>
        <div className="tiles">
          {PIECE_TYPES.map((type) => {
            const t = TYPES[type];
            return (
              <button key={type} className="tile" title={'Agregar ' + t.name.toLowerCase()}
                onClick={() => { actions.addPiece(type); toast(t.name + ' agregado. Arrástralo a su sitio.'); }}>
                <PieceIcon type={type} />
                <b>{t.name}</b>
                <small className="num">{pieceLabel({ ...t, type }).replace(/, .*$/, '')}</small>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
