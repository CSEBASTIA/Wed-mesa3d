// Ficha de la pieza seleccionada: nombre, medidas, posición, material y acciones.
import { MATS, TYPES, EXTRA_FIELDS, limitValue } from '../core/catalog.js';
import { pieceLabel } from '../core/cutlist.js';
import { $ } from './dom.js';

export function initInspector(store, actions) {
  const F = {
    name: $('#f-name'), w: $('#f-w'), h: $('#f-h'), d: $('#f-d'),
    x: $('#f-x'), y: $('#f-y'), z: $('#f-z'), e1: $('#f-e1'), e2: $('#f-e2')
  };
  const swatches = $('#swatches');

  Object.entries(MATS).forEach(([key, m]) => {
    const b = document.createElement('button');
    b.className = 'sw'; b.type = 'button'; b.title = m.name; b.setAttribute('aria-label', m.name);
    b.style.background = m.base; b.dataset.mat = key;
    b.addEventListener('click', () => { const p = store.selected(); if (p) store.update(p.id, { mat: key }); });
    swatches.appendChild(b);
  });

  const setVal = (inp, v) => { if (document.activeElement !== inp && v != null) inp.value = Math.round(v * 10) / 10; };

  function fill() {
    const p = store.selected(); if (!p) return;
    ['w', 'h', 'd', 'x', 'y', 'z'].forEach((k) => setVal(F[k], p[k]));
    const ex = EXTRA_FIELDS[p.type];
    if (ex) { setVal(F.e1, p[ex[0][0]]); setVal(F.e2, p[ex[1][0]]); }
    if (document.activeElement !== F.name) F.name.value = p.name;
    $('#badge').textContent = pieceLabel(p) + ' cm';
  }

  function render() {
    const p = store.selected();
    $('#empty').hidden = !!p; $('#form').hidden = !p; $('#badge').hidden = !p;
    if (!p) return;
    const isL = p.type === 'tableroL';
    $('#l-w').textContent = p.type === 'patar' ? 'Diámetro' : isL ? 'a · Largo X' : 'Ancho';
    $('#l-h').textContent = isL ? 'Grosor' : 'Alto';
    $('#l-d').textContent = isL ? 'b · Largo Z' : 'Fondo';
    $('#wrap-d').hidden = p.type === 'patar';
    const ex = EXTRA_FIELDS[p.type];
    $('#extra').hidden = !ex;
    if (ex) { $('#l-e1').textContent = ex[0][1]; $('#l-e2').textContent = ex[1][1]; }
    $('#a-open').hidden = p.type !== 'cajon';
    $('#a-open').textContent = p.open ? 'Cerrar cajón' : 'Abrir cajón';
    $('#a-flip').hidden = !isL;
    Array.from(swatches.children).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mat === p.mat)));
    fill();
  }

  ['w', 'h', 'd', 'x', 'y', 'z', 'e1', 'e2'].forEach((k) => {
    F[k].addEventListener('change', () => {
      const p = store.selected(); if (!p) return;
      const raw = parseFloat(F[k].value);
      if (!isFinite(raw)) { fill(); return; }
      let key = k;
      if (k === 'e1' || k === 'e2') { const ex = EXTRA_FIELDS[p.type]; if (!ex) return; key = ex[k === 'e1' ? 0 : 1][0]; }
      const patch = { [key]: limitValue(p, key, raw) };
      if (p.type === 'patar' && key === 'w') patch.d = patch.w;
      store.update(p.id, patch, { geometry: !['x', 'y', 'z'].includes(key) });
    });
  });
  F.name.addEventListener('change', () => {
    const p = store.selected(); if (!p) return;
    store.update(p.id, { name: F.name.value.trim() || TYPES[p.type].name }, { geometry: false });
  });

  $('#a-rot').addEventListener('click', actions.rotateSelected);
  $('#a-drop').addEventListener('click', actions.dropSelected);
  $('#a-dup').addEventListener('click', actions.duplicateSelected);
  $('#a-del').addEventListener('click', actions.removeSelected);
  $('#a-open').addEventListener('click', actions.toggleDrawer);
  $('#a-flip').addEventListener('click', actions.flipCorner);

  ['select', 'reset', 'rebuilt'].forEach((e) => store.on(e, render));
  store.on('moved', fill);
}
