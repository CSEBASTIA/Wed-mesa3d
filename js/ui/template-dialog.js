// Ventana "Escritorio a medida": formulario de medidas que genera el escritorio completo.
import { MATS } from '../core/catalog.js';
import { DEFAULT_CFG, PRESETS, genTemplate, roomFromCfg, projectName } from '../core/templates.js';
import { clamp, clone } from '../utils/format.js';
import { $, toast, openModal, closeModal, dismissOnBackdrop } from './dom.js';

export function initTemplateDialog(store, vp) {
  const modal = $('#m-tpl');
  const TF = {};
  ['shape', 'corner', 'a', 'b', 'c', 'd', 't', 'r', 'caj', 'n', 'mt', 'ms', 'room', 'rw', 'rd']
    .forEach((k) => { TF[k] = $('#t-' + k); });

  [TF.mt, TF.ms].forEach((s) => Object.entries(MATS).forEach(([k, m]) => s.add(new Option(m.name, k))));

  function cajOptions(shape) {
    const cur = TF.caj.value, opts = [['izq', 'Izquierda'], ['der', 'Derecha']];
    if (shape === 'recto') opts.push(['ambas', 'Ambos lados']);
    opts.push(['no', 'Sin cajonera']);
    TF.caj.textContent = '';
    opts.forEach(([v, l]) => TF.caj.add(new Option(l, v)));
    TF.caj.value = opts.some(([v]) => v === cur) ? cur : 'izq';
  }
  function sync() {
    const L = TF.shape.value === 'L';
    $('#w-corner').hidden = !L; $('#w-b').hidden = !L; $('#w-r').hidden = !L;
    $('#tl-a').textContent = L ? 'a · Largo trasero' : 'a · Largo';
    $('#w-room').hidden = !TF.room.checked;
    TF.n.disabled = TF.caj.value === 'no';
  }
  function toForm(c) {
    TF.shape.value = c.shape; cajOptions(c.shape);
    ['corner', 'caj', 'mt', 'ms', 'a', 'b', 'c', 'd', 't', 'r', 'n', 'rw', 'rd'].forEach((k) => { TF[k].value = c[k]; });
    TF.room.checked = !!c.room; sync();
  }
  function fromForm() {
    const num = (k, lo, hi, def) => { const v = parseFloat(TF[k].value); return isFinite(v) ? clamp(v, lo, hi) : def; };
    const c = {
      shape: TF.shape.value, corner: TF.corner.value, caj: TF.caj.value, mt: TF.mt.value, ms: TF.ms.value, room: TF.room.checked,
      a: num('a', 40, 400, 120), b: num('b', 40, 400, 160), c: num('c', 30, 120, 60), d: num('d', 40, 120, 75),
      t: num('t', 1, 6, 2.5), r: num('r', 0, 80, 20), n: Math.round(num('n', 1, 6, 3)), rw: num('rw', 60, 1000, 200), rd: num('rd', 60, 1000, 200)
    };
    if (c.shape === 'L') c.c = Math.min(c.c, Math.min(c.a, c.b) - 15);
    return c;
  }

  PRESETS.forEach((pr) => {
    const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = pr.label;
    b.addEventListener('click', () => {
      const c = Object.assign(clone(DEFAULT_CFG), pr.cfg, { mt: TF.mt.value, ms: TF.ms.value });
      toForm(c);
    });
    $('#presets').appendChild(b);
  });
  TF.shape.addEventListener('change', () => { cajOptions(TF.shape.value); sync(); });
  TF.room.addEventListener('change', sync);
  TF.caj.addEventListener('change', sync);

  $('#b-tpl').addEventListener('click', () => { toForm(store.cfg); openModal(modal); });
  $('#t-cancel').addEventListener('click', () => closeModal(modal));
  $('#t-go').addEventListener('click', () => {
    const cfg = fromForm();
    store.cfg = cfg;
    store.setProj({ name: projectName(cfg) });
    store.replaceAll(genTemplate(cfg, () => store.newId()), roomFromCfg(cfg));
    vp.setView('iso');
    closeModal(modal);
    toast('Escritorio creado. Deshacer recupera el diseño anterior.');
  });
  dismissOnBackdrop(modal);
}
