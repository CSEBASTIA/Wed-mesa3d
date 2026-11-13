// Mueve la cámara con WASD (adelante, izquierda, atrás, derecha), Q/E (bajar, subir) y Shift (más rápido).
import { useEffect } from 'react';
import { MOVE_KEYS, type MoveKey, type Viewport } from '../three/viewport';

const isMoveKey = (code: string): code is MoveKey => (MOVE_KEYS as readonly string[]).includes(code);
const isTyping = (t: EventTarget | null) => {
  const tag = (t as HTMLElement | null)?.tagName ?? '';
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

export function useCameraKeys(viewport: Viewport | null, enabled: boolean): void {
  useEffect(() => {
    if (!viewport) return;
    if (!enabled) { viewport.releaseKeys(); return; }
    const onDown = (e: KeyboardEvent) => {
      if (!isMoveKey(e.code) || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (!e.code.startsWith('Shift')) e.preventDefault();
      viewport.setKey(e.code, true);
    };
    const onUp = (e: KeyboardEvent) => { if (isMoveKey(e.code)) viewport.setKey(e.code, false); };
    const release = () => viewport.releaseKeys();
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', release);
      release();
    };
  }, [viewport, enabled]);
}
