// Ventana "Exportar plano": vista previa de la lámina y descarga en JPG o PNG.
import { makeSheet } from '../export/sheet.js';
import { slug } from '../utils/format.js';
import { $, toast, openModal, closeModal, dismissOnBackdrop } from './dom.js';

export function initExportDialog(store, vp) {
  const modal = $('#m-exp'), img = $('#e-img');
  const EF = { name: $('#e-name'), client: $('#e-client'), notes: $('#e-notes'), chair: $('#e-chair') };
  let sheet = null, timer = 0;

  function refresh() {
    if (!store.pieces.length) { img.removeAttribute('src'); sheet = null; return; }
    sheet = makeSheet(store, vp);
    img.src = sheet.toDataURL('image/jpeg', 0.9);
  }
  const later = () => { clearTimeout(timer); timer = setTimeout(refresh, 300); };

  ['name', 'client', 'notes'].forEach((k) => EF[k].addEventListener('input', () => { store.setProj({ [k]: EF[k].value }); later(); }));
  EF.chair.addEventListener('change', () => { store.setProj({ chair: EF.chair.checked }); refresh(); });

  $('#b-export').addEventListener('click', () => {
    if (!store.pieces.length) { toast('Agrega piezas o crea un escritorio a medida antes de exportar.'); return; }
    const p = store.proj;
    EF.name.value = p.name || ''; EF.client.value = p.client || ''; EF.notes.value = p.notes || ''; EF.chair.checked = p.chair !== false;
    openModal(modal);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(refresh);
  });

  function download(type) {
    if (!sheet) refresh();
    if (!sheet) return;
    const ext = type === 'image/png' ? 'png' : 'jpg';
    sheet.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = slug(store.proj.name) + '-plano.' + ext;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('Plano descargado como ' + ext.toUpperCase() + '.');
    }, type, 0.92);
  }
  $('#e-jpg').addEventListener('click', () => download('image/jpeg'));
  $('#e-png').addEventListener('click', () => download('image/png'));
  $('#e-close').addEventListener('click', () => closeModal(modal));
  dismissOnBackdrop(modal);
}
