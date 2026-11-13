// Ayudas de DOM compartidas por la interfaz.

export const $ = (s, root = document) => root.querySelector(s);

let toastTimer = 0;
export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

export function openModal(m) {
  m.hidden = false;
  const f = m.querySelector('select, input, button');
  if (f) f.focus();
}
export const closeModal = (m) => { m.hidden = true; };
export const anyModalOpen = () => Array.from(document.querySelectorAll('.modal')).some((m) => !m.hidden);

/** Cierra al hacer clic fuera de la ventana. */
export function dismissOnBackdrop(m) {
  m.addEventListener('click', (e) => { if (e.target === m) closeModal(m); });
}
