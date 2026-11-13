// Columna izquierda: botones para agregar cada tipo de pieza.
import { TYPES, PIECE_TYPES } from '../core/catalog';
import { pieceLabel } from '../core/cutlist';
import { actions } from '../app/context';
import { toast } from '../app/toast';

export function CatalogPanel() {
  return (
    <aside className="catalog">
      <h2>Agregar pieza</h2>
      <div className="pieces">
        {PIECE_TYPES.map((type) => {
          const t = TYPES[type];
          return (
            <button key={type} className="piece-btn" type="button"
              onClick={() => { actions.addPiece(type); toast(t.name + ' agregado. Arrástralo a su sitio.'); }}>
              <b>{t.name}</b>
              <small>{pieceLabel({ ...t, type })} cm</small>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
