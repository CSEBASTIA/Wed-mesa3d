// Materiales de three.js generados a partir del catálogo (vetas de madera dibujadas en un canvas).
import * as THREE from 'three';
import { matOf } from '../core/catalog';
import type { MatKey } from '../core/types';

const cache = new Map<MatKey, THREE.MeshStandardMaterial>();

export function material(key: MatKey): THREE.MeshStandardMaterial {
  const hit = cache.get(key);
  if (hit) return hit;
  const m = matOf(key), c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = m.base; g.fillRect(0, 0, 256, 256);
  if (m.wood && m.grain) {
    g.strokeStyle = m.grain;
    for (let i = 0; i < 46; i++) {
      const y = Math.random() * 256, a = 2 + Math.random() * 5;
      const f = (1 + Math.floor(Math.random() * 3)) * Math.PI * 2 / 256, ph = Math.random() * 6;
      g.globalAlpha = 0.12 + Math.random() * 0.3; g.lineWidth = 0.6 + Math.random() * 1.6;
      g.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const yy = y + Math.sin(x * f + ph) * a;
        if (x) g.lineTo(x, yy); else g.moveTo(x, yy);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: m.metal ? 0.35 : 0.8, metalness: m.metal ? 0.85 : 0 });
  cache.set(key, mat);
  return mat;
}

/** Líneas de borde de todas las piezas (la exportación las oscurece temporalmente). */
export const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 });

export const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9dee3, transparent: true, opacity: 0.6, roughness: 1 });
