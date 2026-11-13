// Lista de cortes de la columna derecha y medidas totales del mueble.
import { matOf } from '../core/catalog';
import { pieceLabel } from '../core/cutlist';
import { sceneInfo } from '../core/geometry';
import { fmt } from '../core/format';
import { store, useStoreVersion } from '../app/context';

export function CutlistPanel() {
  useStoreVersion();
  const { pieces, selId } = store;
  const size = sceneInfo(pieces).size;
  return (
    <section>
      <h2>Lista de cortes</h2>
      <table className="cuts">
        <thead><tr><th>Pieza</th><th>Ancho × alto × fondo</th></tr></thead>
        <tbody>
          {!pieces.length && (
            <tr><td colSpan={2} className="empty">Todavía no hay piezas. Usa "Escritorio a medida" o agrega un tablero.</td></tr>
          )}
          {pieces.map((q) => (
            <tr key={q.id} data-id={q.id} className={q.id === selId ? 'sel' : undefined} onClick={() => store.select(q.id)}>
              <td><span className="dot" style={{ background: matOf(q.mat).base }} title={matOf(q.mat).name} />{q.name}</td>
              <td className="n">{pieceLabel(q)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pieces.length > 0 && (
        <p className="total">
          {pieces.length} {pieces.length === 1 ? 'pieza' : 'piezas'}. Medidas totales del mueble:{' '}
          <b>{fmt(size[0])} × {fmt(size[1])} × {fmt(size[2])} cm</b>
        </p>
      )}
    </section>
  );
}
