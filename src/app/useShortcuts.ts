// Atajos de teclado del editor.
import { useEffect } from 'react';
import { store, actions } from './context';
import { toast } from './toast';

const MOVES: Record<string, [number, number, number]> = {
  arrowleft: [-1, 0, 0], arrowright: [1, 0, 0], arrowup: [0, 0, -1], arrowdown: [0, 0, 1],
  pageup: [0, 1, 0], pagedown: [0, -1, 0]
};

export function useShortcuts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) store.redo(); else store.undo(); return; }
      if (mod && k === 'y') { e.preventDefault(); store.redo(); return; }
      if (!store.selected()) return;
      if (mod && k === 'd') { e.preventDefault(); actions.duplicateSelected(); return; }
      if (k === 'delete' || k === 'backspace') { e.preventDefault(); actions.removeSelected(); return; }
      // R gira 90°, Shift+R gira 15°
      if (k === 'r' && !mod) { if (!actions.rotateSelected(e.shiftKey ? 15 : 90)) toast('No se puede girar ahí: chocaría con una pared.'); return; }
      const m = MOVES[k];
      if (m) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        actions.nudgeSelected(m[0] * step, m[1] * step, m[2] * step);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
