// Mide cuánto tapan los paneles flotantes y se lo dice a la vista 3D, para centrar el mueble en el espacio libre.
import { useEffect } from 'react';
import type { Viewport } from '../three/viewport';

const GAP = 12;

export function useViewInsets(viewport: Viewport | null): void {
  useEffect(() => {
    if (!viewport) return;
    const measure = () => {
      const W = window.innerWidth, H = window.innerHeight;
      const left = document.querySelector('.panel.left'), right = document.querySelector('.panel.right');
      const top = document.querySelector('.topbar'), bottom = document.querySelector('.bottombar');
      const floating = left && getComputedStyle(left).position === 'absolute';
      if (!floating) { viewport.setInsets({ l: 0, r: 0, t: 0, b: 0 }); return; }
      viewport.setInsets({
        l: left ? left.getBoundingClientRect().right + GAP : 0,
        r: right ? W - right.getBoundingClientRect().left + GAP : 0,
        t: top ? top.getBoundingClientRect().bottom : 0,
        b: bottom ? H - bottom.getBoundingClientRect().top : 0
      });
    };
    measure();
    viewport.setView('iso'); // reencuadrar ya con el espacio libre real
    const ro = new ResizeObserver(measure);
    document.querySelectorAll('.panel, .topbar, .bottombar').forEach((el) => ro.observe(el));
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [viewport]);
}
