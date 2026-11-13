// Columna izquierda: botones para agregar cada tipo de pieza.
import { TYPES } from '../core/catalog.js';
import { pieceLabel } from '../core/cutlist.js';
import { $, toast } from './dom.js';

export function initCatalogPanel(actions) {
  const host = $('#catalog');
  Object.entries(TYPES).forEach(([type, t]) => {
    const b = document.createElement('button');
    b.className = 'piece-btn'; b.type = 'button';
    const name = document.createElement('b'), size = document.createElement('small');
    name.textContent = t.name; size.textContent = pieceLabel(t) + ' cm';
    b.append(name, size);
    b.addEventListener('click', () => {
      actions.addPiece(type);
      toast(t.name + ' agregado. Arrástralo a su sitio.');
    });
    host.appendChild(b);
  });
}
