// Lista de cortes de la columna derecha y medidas totales del mueble.
import { matOf } from '../core/catalog.js';
import { pieceLabel } from '../core/cutlist.js';
import { sceneInfo } from '../core/geometry.js';
import { fmt } from '../utils/format.js';
import { $ } from './dom.js';

export function initCutlistPanel(store) {
  const tb = $('#cuts'), total = $('#total');

  function render() {
    tb.textContent = '';
    if (!store.pieces.length) {
      const tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 2; td.className = 'empty';
      td.textContent = 'Todavía no hay piezas. Usa "Escritorio a medida" o agrega un tablero.';
      tr.appendChild(td); tb.appendChild(tr);
    }
    store.pieces.forEach((q) => {
      const tr = document.createElement('tr');
      tr.dataset.id = q.id; if (q.id === store.selId) tr.className = 'sel';
      const a = document.createElement('td'), dot = document.createElement('span');
      dot.className = 'dot'; dot.style.background = matOf(q.mat).base; dot.title = matOf(q.mat).name;
      a.append(dot, document.createTextNode(q.name));
      const b = document.createElement('td'); b.className = 'n'; b.textContent = pieceLabel(q);
      tr.append(a, b);
      tr.addEventListener('click', () => store.select(q.id));
      tb.appendChild(tr);
    });
    total.textContent = '';
    if (store.pieces.length) {
      const s = sceneInfo(store.pieces), n = store.pieces.length;
      total.append(n + (n === 1 ? ' pieza' : ' piezas') + '. Medidas totales del mueble: ');
      const bb = document.createElement('b');
      bb.textContent = fmt(s.size[0]) + ' × ' + fmt(s.size[1]) + ' × ' + fmt(s.size[2]) + ' cm';
      total.appendChild(bb);
    }
  }

  store.on('history', render);
  store.on('select', render);
}
