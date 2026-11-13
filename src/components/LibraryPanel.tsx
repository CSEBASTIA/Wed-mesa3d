// Panel izquierdo: escritorio a medida y biblioteca de piezas sueltas.
import { TYPES, PIECE_TYPES } from '../core/catalog';
import { pieceLabel } from '../core/cutlist';
import { actions } from '../app/context';
import { toast } from '../app/toast';
import { PieceIcon } from './PieceIcon';

export function LibraryPanel({ onTemplate }: { onTemplate: () => void }) {
  return (
    <aside className="panel left float edge-l" aria-label="Biblioteca">
      <div className="panel-head"><h2>Biblioteca</h2></div>
      <div className="panel-body">
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
