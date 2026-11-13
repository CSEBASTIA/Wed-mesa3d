// Barra superior y atajos de teclado.
import { $, toast, closeModal, anyModalOpen } from './dom.js';

export function initToolbar(store, vp, actions) {
  const undo = $('#b-undo'), redo = $('#b-redo');
  undo.addEventListener('click', () => store.undo());
  redo.addEventListener('click', () => store.redo());
  store.on('history', () => { undo.disabled = !store.canUndo; redo.disabled = !store.canRedo; });

  $('#b-vert').addEventListener('click', function () { store.vertOn = !store.vertOn; this.setAttribute('aria-pressed', String(store.vertOn)); });
  $('#b-snap').addEventListener('click', function () { store.snapOn = !store.snapOn; this.setAttribute('aria-pressed', String(store.snapOn)); });
  $('#b-iso').addEventListener('click', () => vp.setView('iso'));
  $('#b-front').addEventListener('click', () => vp.setView('front'));
  $('#b-top').addEventListener('click', () => vp.setView('top'));
  $('#b-clear').addEventListener('click', () => {
    if (!store.pieces.length) return;
    actions.clearAll();
    toast('Diseño vaciado. Deshacer recupera las piezas.');
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { document.querySelectorAll('.modal').forEach(closeModal); return; }
    if (anyModalOpen()) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) store.redo(); else store.undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); store.redo(); return; }
    if (!store.selected()) return;
    if (mod && k === 'd') { e.preventDefault(); actions.duplicateSelected(); return; }
    if (k === 'delete' || k === 'backspace') { e.preventDefault(); actions.removeSelected(); return; }
    if (k === 'r') { actions.rotateSelected(); return; }
    const step = e.shiftKey ? 10 : 1;
    const moves = {
      arrowleft: [-step, 0, 0], arrowright: [step, 0, 0], arrowup: [0, 0, -step], arrowdown: [0, 0, step],
      pageup: [0, step, 0], pagedown: [0, -step, 0]
    };
    if (moves[k]) { e.preventDefault(); actions.nudgeSelected(...moves[k]); }
  });
}
