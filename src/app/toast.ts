// Avisos cortos que aparecen arriba de la escena.
import { useSyncExternalStore } from 'react';

let message: string | null = null;
let timer = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function toast(msg: string): void {
  message = msg; notify();
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { message = null; notify(); }, 2800);
}

export function useToast(): string | null {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
    () => message
  );
}
