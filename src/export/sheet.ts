// Plano para el carpintero: dibuja en un canvas la vista 3D con cotas, la vista superior y el despiece.
import { matOf } from '../core/catalog';
import { bounds, footprint, getDims, mainTop, box, addVec } from '../core/geometry';
import { cutList } from '../core/cutlist';
import { fmt } from '../core/format';
import type { Store } from '../core/store';
import type { Piece, Room, Vec2, Vec3 } from '../core/types';
import { WALL_T, clampOpening, isRect, normalizeRoom, onWallPoint, roomBounds, walls, wallSegments } from '../core/room';
import type { Viewport } from '../three/viewport';

type Ctx = CanvasRenderingContext2D;

const INK = '#1f2328', GREY = '#6b7280', HAIR = '#c9ced4', PAPER = '#ffffff', MARK = '#d29b00';
const FD = 'Geist, "Segoe UI", sans-serif', FB = 'Geist, "Segoe UI", sans-serif';

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath(); ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

interface LabelOpts { bg?: string; color?: string; border?: string | false; weight?: number }

function label(ctx: Ctx, text: string, x: number, y: number, size: number, opt: LabelOpts = {}): void {
  ctx.font = (opt.weight ?? 600) + ' ' + size + 'px ' + FB;
  const w = ctx.measureText(text).width, ph = size * 0.45, pv = size * 0.3;
  ctx.fillStyle = opt.bg ?? PAPER; ctx.strokeStyle = opt.border || INK; ctx.lineWidth = 2;
  roundRect(ctx, x - w / 2 - ph, y - size / 2 - pv, w + ph * 2, size + pv * 2, 6);
  ctx.fill(); if (opt.border !== false) ctx.stroke();
  ctx.fillStyle = opt.color ?? INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
}

/** Línea de cota estilo catálogo: extensiones punteadas, extremos con círculos y la medida al centro. */
function dimLine(ctx: Ctx, a: Vec2, b: Vec2, ao: Vec2, bo: Vec2, text: string): void {
  ctx.save();
  ctx.strokeStyle = GREY; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]);
  for (const [s, t] of [[a, ao], [b, bo]] as [Vec2, Vec2][]) {
    const dx = t[0] - s[0], dy = t[1] - s[1];
    ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(t[0] + dx * 0.25, t[1] + dy * 0.25); ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(ao[0], ao[1]); ctx.lineTo(bo[0], bo[1]); ctx.stroke();
  for (const q of [ao, bo]) {
    ctx.beginPath(); ctx.arc(q[0], q[1], 7, 0, Math.PI * 2);
    ctx.fillStyle = PAPER; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
  }
  ctx.restore();
  label(ctx, text, (ao[0] + bo[0]) / 2, (ao[1] + bo[1]) / 2, 26);
}

function wrapText(ctx: Ctx, text: string, maxW: number): string[] {
  const lines: string[] = []; let line = '';
  for (const w of text.split(/\s+/)) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

interface PlanInput { pieces: Piece[]; room: Room | null; showChair: boolean }

/** Vista superior a escala: paredes, huellas de las piezas, cotas, espacio libre y silla. */
function drawPlan(ctx: Ctx, X: number, Y: number, W: number, H: number, { pieces, room, showChair }: PlanInput): void {
  const B = bounds(pieces); if (!B) return;
  const s = room ? (room.corner === 'der' ? -1 : 1) : 1;
  let minX = B.x0, maxX = B.x1, minZ = B.z0, maxZ = B.z1;
  const R = room ? normalizeRoom(room) : null;
  const rb = R ? roomBounds(R) : null;
  if (rb) {
    minX = Math.min(minX, rb.x0 - WALL_T); maxX = Math.max(maxX, rb.x1 + WALL_T);
    minZ = Math.min(minZ, rb.z0 - WALL_T); maxZ = Math.max(maxZ, rb.z1 + WALL_T);
  }
  const m = 90, k = Math.min((W - 2 * m) / (maxX - minX), (H - 2 * m - 30) / (maxZ - minZ));
  const ox = X + (W - (maxX - minX) * k) / 2 - minX * k, oz = Y + 30 + (H - 30 - (maxZ - minZ) * k) / 2 - minZ * k;
  const P = (x: number, z: number): Vec2 => [ox + x * k, oz + z * k];

  if (R && rb) {
    // piso con la forma exacta
    ctx.beginPath();
    R.points.forEach(([x, z], i) => { const p = P(x, z); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.closePath(); ctx.fillStyle = '#f4f2ed'; ctx.fill();
    ctx.lineCap = 'butt';
    for (const wall of walls(R)) {
      const side = wall.i;
      // punto sobre esta pared: u a lo largo, n hacia afuera
      const onWall = (u: number, n: number): Vec2 => { const q = onWallPoint(wall, u, n); return P(q[0], q[1]); };
      // muros (solo los tramos que llegan al piso; bajo las ventanas se dibuja más claro)
      for (const [a, b, lo, hi] of wallSegments(R, side)) {
        if (lo > 0) continue;
        const p1 = onWall(a, WALL_T / 2), p2 = onWall(b, WALL_T / 2);
        ctx.strokeStyle = hi >= R.h - 0.5 ? '#4b4f55' : '#9a9ea4'; ctx.lineWidth = WALL_T * k;
        ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
      }
      for (const o0 of R.openings.filter((o) => o.wall === side)) {
        const o = clampOpening(R, o0);
        if (o.type === 'ventana') {
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = WALL_T * k * 0.5;
          const a = onWall(o.pos, WALL_T / 2), b = onWall(o.pos + o.width, WALL_T / 2);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          ctx.strokeStyle = '#4b4f55'; ctx.lineWidth = 1.5;
          for (const n of [WALL_T * 0.3, WALL_T * 0.7]) {
            const c = onWall(o.pos, n), d = onWall(o.pos + o.width, n);
            ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
          }
        } else {
          // puerta: hoja abierta hacia adentro y arco de abatimiento
          const hinge = onWall(o.pos, 0), end = onWall(o.pos + o.width, 0), leaf = onWall(o.pos, -o.width);
          ctx.strokeStyle = '#4b4f55'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(hinge[0], hinge[1]); ctx.lineTo(leaf[0], leaf[1]); ctx.stroke();
          ctx.lineWidth = 1.5; ctx.setLineDash([7, 6]);
          const a0 = Math.atan2(end[1] - hinge[1], end[0] - hinge[0]), a1 = Math.atan2(leaf[1] - hinge[1], leaf[0] - hinge[0]);
          let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          ctx.beginPath(); ctx.arc(hinge[0], hinge[1], o.width * k, a0, a0 + da, da < 0); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    // largo de cada pared, por fuera y alineado con ella (como en un plano de arquitecto)
    ctx.font = '500 21px ' + FB; ctx.fillStyle = GREY; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const wall of walls(R)) {
      if (wall.len < 25) continue;
      const q = onWallPoint(wall, wall.len / 2, WALL_T + 22 / k), p = P(q[0], q[1]);
      let ang = Math.atan2(wall.dir[1], wall.dir[0]);
      if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI; // que no quede de cabeza
      ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(ang);
      ctx.fillText(fmt(wall.len) + ' cm', 0, 0); ctx.restore();
    }
  }

  for (const p of [...pieces].sort((a, b) => (a.y + a.h) - (b.y + b.h))) {
    ctx.beginPath();
    if (p.type === 'patar') { const c = P(p.x, p.z); ctx.arc(c[0], c[1], p.w / 2 * k, 0, Math.PI * 2); }
    else footprint(p).forEach(([x, z], i) => { const pt = P(x, z); if (i) ctx.lineTo(pt[0], pt[1]); else ctx.moveTo(pt[0], pt[1]); });
    ctx.closePath();
    const isTop = p.type === 'tableroL' || p.type === 'tablero';
    ctx.fillStyle = isTop ? '#3a3e44' : matOf(p.mat).base;
    ctx.globalAlpha = isTop ? 0.92 : 0.8; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
  }

  const top = mainTop(pieces), isL = top?.type === 'tableroL';
  for (const d of getDims(pieces)) {
    if (d.k === 'd') continue;
    const inside = isL && d.k === 'c';
    let a: Vec3 = addVec(d.p1, d.o), b: Vec3 = addVec(d.p2, d.o);
    if (inside) { a = [d.p1[0], 0, d.p1[2] - 22]; b = [d.p2[0], 0, d.p2[2] - 22]; }
    const pa = P(a[0], a[2]), pb = P(b[0], b[2]), mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2;
    ctx.strokeStyle = inside ? '#ffffff' : INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    const txt = d.k + ' = ' + fmt(d.v) + ' cm';
    if (inside) label(ctx, txt, mx, my, 22, { bg: '#3a3e44', color: '#ffffff', border: false });
    else label(ctx, txt, mx, my, 22);
  }

  // espacio libre junto a las paredes (solo en habitaciones rectangulares, donde se lee sin ambigüedad)
  if (R && rb && isRect(R)) {
    const freeX = s > 0 ? rb.x1 - B.x1 : B.x0 - rb.x0, freeZ = rb.z1 - B.z1;
    const freeText = (f: number) => (f < 0 ? 'No entra: sobran ' + fmt(-f) + ' cm' : fmt(f) + ' cm libres');
    ctx.font = '600 24px ' + FB; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fx = P(s > 0 ? (B.x1 + rb.x1) / 2 : (B.x0 + rb.x0) / 2, rb.z0 + 40);
    ctx.fillStyle = freeX < 0 ? '#c0352b' : '#2e6b3a'; ctx.fillText(freeText(freeX), fx[0], fx[1]);
    ctx.save(); const fz = P(s > 0 ? rb.x0 + 40 : rb.x1 - 40, (B.z1 + rb.z1) / 2); ctx.translate(fz[0], fz[1]); ctx.rotate(-s * Math.PI / 2);
    ctx.fillStyle = freeZ < 0 ? '#c0352b' : '#2e6b3a'; ctx.fillText(freeText(freeZ), 0, 0); ctx.restore();
  }

  if (showChair && top) {
    let cx: number, cz: number;
    if (isL && top.rot === 0) {
      const sg = top.flip ? -1 : 1, c = top.c ?? 60;
      cx = top.x - sg * top.w / 2 + sg * (c + 38); cz = top.z - top.d / 2 + c + 38;
    } else { cx = top.x; cz = box(top).z1 + 35; }
    const ch = P(cx, cz);
    ctx.beginPath(); ctx.arc(ch[0], ch[1], 25 * k, 0, Math.PI * 2);
    ctx.fillStyle = '#c9c5bd'; ctx.fill(); ctx.strokeStyle = '#8f8a80'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = '500 20px ' + FB; ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Silla', ch[0], ch[1]);
  }

  // barra de escala
  const sx0 = X + 30, sy0 = Y + H - 28, len = 50 * k;
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(sx0, sy0); ctx.lineTo(sx0 + len, sy0);
  ctx.moveTo(sx0, sy0 - 8); ctx.lineTo(sx0, sy0 + 8); ctx.moveTo(sx0 + len, sy0 - 8); ctx.lineTo(sx0 + len, sy0 + 8);
  ctx.stroke();
  ctx.font = '500 20px ' + FB; ctx.fillStyle = GREY; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('50 cm', sx0 + len + 12, sy0);
}

/** Genera la lámina completa como canvas. */
export function makeSheet(store: Store, vp: Viewport): HTMLCanvasElement {
  const { pieces, room, proj } = store;
  const W = 2400, M = 60, top = 190, panelH = 960, leftW = 1400, rightX = M + leftW + 40, rightW = W - rightX - M;
  const rows = cutList(pieces), rowH = 46;
  const meas = document.createElement('canvas').getContext('2d')!; meas.font = '400 24px ' + FB;
  const noteLines = proj.notes ? wrapText(meas, proj.notes, W - 2 * M - 40) : [];
  const tableY = top + panelH + 70;
  const Ht = tableY + 70 + rows.length * rowH + (noteLines.length ? 70 + noteLines.length * 34 : 0) + 110;

  const cv = document.createElement('canvas'); cv.width = W; cv.height = Ht;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, Ht);

  // encabezado
  ctx.fillStyle = MARK; ctx.fillRect(M, 52, 60, 10);
  ctx.fillStyle = INK; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = '600 52px ' + FD; ctx.fillText(proj.name || 'Escritorio a medida', M, 120);
  ctx.font = '400 26px ' + FB; ctx.fillStyle = GREY;
  const date = new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText([proj.client, date, 'Todas las medidas en centímetros'].filter(Boolean).join('  ·  '), M, 160);
  const B = bounds(pieces);
  if (B) {
    ctx.textAlign = 'right'; ctx.font = '500 24px ' + FB; ctx.fillStyle = GREY;
    ctx.fillText('Medidas totales (ancho × alto × fondo)', W - M, 92);
    ctx.font = '600 40px ' + FD; ctx.fillStyle = INK;
    ctx.fillText(fmt(B.sx) + ' × ' + fmt(B.y1) + ' × ' + fmt(B.sz), W - M, 140);
  }

  // paneles
  ctx.strokeStyle = HAIR; ctx.lineWidth = 2;
  ctx.strokeRect(M, top, leftW, panelH); ctx.strokeRect(rightX, top, rightW, panelH);
  ctx.textAlign = 'left'; ctx.font = '600 20px ' + FB; ctx.fillStyle = GREY;
  ctx.fillText('VISTA SUPERIOR', rightX + 24, top + 40);

  if (B) {
    const legH = 110, shot = vp.snapshot(leftW - 4, panelH - legH - 4, getDims(pieces));
    ctx.drawImage(shot.img, M + 2, top + 2);
    ctx.save(); ctx.translate(M + 2, top + 2);
    for (const d of shot.dims) dimLine(ctx, d.a, d.b, d.ao, d.bo, d.k + ' = ' + fmt(d.v));
    ctx.restore();
    ctx.fillStyle = GREY; ctx.textAlign = 'left'; ctx.font = '600 20px ' + FB; ctx.fillText('VISTA 3D', M + 24, top + 40);

    const ly = top + panelH - legH, colW = (leftW - 48) / Math.max(1, shot.dims.length);
    ctx.fillStyle = '#f5f6f7'; ctx.fillRect(M + 2, ly, leftW - 4, legH - 2);
    ctx.fillStyle = HAIR; ctx.fillRect(M + 2, ly, leftW - 4, 2);
    shot.dims.forEach((d, i) => {
      const lx = M + 24 + i * colW;
      ctx.textAlign = 'left';
      ctx.font = '600 30px ' + FD; ctx.fillStyle = INK; ctx.fillText(d.k + ' = ' + fmt(d.v) + ' cm', lx, ly + 48);
      ctx.font = '400 21px ' + FB; ctx.fillStyle = GREY; ctx.fillText(d.txt, lx, ly + 82);
    });

    drawPlan(ctx, rightX, top, rightW, panelH, { pieces, room, showChair: proj.chair });
  }

  // despiece
  ctx.textAlign = 'left'; ctx.fillStyle = INK; ctx.font = '600 32px ' + FD; ctx.fillText('Despiece', M, tableY);
  ctx.font = '400 22px ' + FB; ctx.fillStyle = GREY; ctx.fillText('Largo × ancho × espesor, en cm', M + 170, tableY);
  const cols = [M, M + 860, M + 990, M + 1820], hy = tableY + 50;
  ctx.font = '600 20px ' + FB; ctx.fillStyle = GREY;
  ['PIEZA', 'CANT.', 'MEDIDAS', 'MATERIAL'].forEach((h, i) => ctx.fillText(h, cols[i], hy));
  rows.forEach((rw, i) => {
    const y = hy + 20 + i * rowH, cy = y + rowH / 2;
    if (i % 2 === 0) { ctx.fillStyle = '#f5f6f7'; ctx.fillRect(M - 12, y, W - 2 * M + 24, rowH); }
    ctx.textBaseline = 'middle'; ctx.fillStyle = INK;
    ctx.font = '500 24px ' + FB; ctx.fillText(rw.name, cols[0], cy);
    ctx.font = '600 24px ' + FB; ctx.fillText(String(rw.q), cols[1], cy);
    ctx.font = '400 24px ' + FB; ctx.fillText(rw.txt, cols[2], cy);
    ctx.fillStyle = GREY; ctx.fillText(rw.mat, cols[3], cy);
    ctx.textBaseline = 'alphabetic';
  });
  const ny = hy + 20 + rows.length * rowH + 60;
  if (noteLines.length) {
    ctx.fillStyle = INK; ctx.font = '600 26px ' + FD; ctx.fillText('Notas', M, ny);
    ctx.font = '400 24px ' + FB;
    noteLines.forEach((l, i) => ctx.fillText(l, M, ny + 40 + i * 34));
  }
  ctx.fillStyle = HAIR; ctx.fillRect(M, Ht - 70, W - 2 * M, 2);
  ctx.font = '400 20px ' + FB; ctx.fillStyle = GREY; ctx.textAlign = 'left';
  ctx.fillText('Hecho con Taller de Escritorios. Verificar medidas en obra antes de cortar.', M, Ht - 34);
  return cv;
}
