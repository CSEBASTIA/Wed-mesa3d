// Punto de entrada: crea el estado, la escena 3D y la interfaz, y los conecta.
//
//   core/     datos y reglas (sin DOM ni three.js) → se puede probar y reutilizar en un backend
//   three/    todo lo que dibuja en 3D
//   ui/       paneles, ventanas y teclado
//   export/   lámina para el carpintero
import { store } from './core/store.js';
import { createActions } from './core/actions.js';
import { createViewport } from './three/viewport.js';
import { attachInteraction } from './three/interaction.js';
import { initCatalogPanel } from './ui/catalog-panel.js';
import { initInspector } from './ui/inspector.js';
import { initCutlistPanel } from './ui/cutlist-panel.js';
import { initToolbar } from './ui/toolbar.js';
import { initTemplateDialog } from './ui/template-dialog.js';
import { initExportDialog } from './ui/export-dialog.js';
import { $ } from './ui/dom.js';

const actions = createActions(store);
const vp = createViewport($('#view'), store);
attachInteraction(vp, store);

initCatalogPanel(actions);
initInspector(store, actions);
initCutlistPanel(store);
initToolbar(store, vp, actions);
initTemplateDialog(store, vp);
initExportDialog(store, vp);

store.init();
vp.setView('iso');

// Acceso para depurar desde la consola del navegador.
window.taller = { store, actions, vp };
