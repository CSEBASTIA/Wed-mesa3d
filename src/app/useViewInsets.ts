// Mide cuánto tapan los paneles flotantes y se lo dice a la vista 3D, para centrar el mueble en el espacio libre.
import { useEffect, useRef } from 'react';
import type { Viewport } from '../three/viewport';

const GAP = 12;

export function useViewInsets(viewport: Viewport | null, panels: { left: boolean; right: boolean }): void {
  const framed = useRef(false);
  useEffect(() => {
    if (!viewport) return;
    const measure = () => {
      const W = window.innerWidth, H = window.innerHeight;
      const left = document.querySelector('.panel.left') ?? document.querySelector('.panel-tab.left');
      const right = document.querySelector('.panel.right') ?? document.querySelector('.panel-tab.right');
      const top = document.querySelector('.topbar'), bottom = document.querySelector('.bottombar');
      const floating = !left || getComputedStyle(left).position === 'absolute';
      if (!floating) { viewport.setInsets({ l: 0, r: 0, t: 0, b: 0 }); return; }
      // una pestaña minimizada casi no tapa: se ignora
      const isPanel = (el: Element | null) => !!el && el.classList.contains('panel');
      viewport.setInsets({
        l: isPanel(left) ? left!.getBoundingClientRect().right + GAP : 0,
        r: isPanel(right) ? W - right!.getBoundingClientRect().left + GAP : 0,
        t: top ? top.getBoundingClientRect().bottom : 0,
        b: bottom ? H - bottom.getBoundingClientRect().top : 0
      });
    };
    measure();
    if (!framed.current) { framed.current = true; viewport.setView('iso'); } // primer encuadre con el espacio libre real
    const ro = new ResizeObserver(measure);
    document.querySelectorAll('.panel, .panel-tab, .topbar, .bottombar').forEach((el) => ro.observe(el));
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [viewport, panels.left, panels.right]);
}
