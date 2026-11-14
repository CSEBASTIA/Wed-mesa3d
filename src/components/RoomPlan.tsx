// Editor de planta de la habitación (SVG, vista desde arriba).
// Arrastra una esquina o una pared entera; se ajusta cada 5 cm y se alinea con las esquinas vecinas.
// Al seleccionar una pared o esquina aparecen sus medidas exactas y las acciones para dividir o quitar.
import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { FLOORS, SNAP, WALL_T, clampOpening, onWallPoint, removeCorner, splitWall, walls, wallSegments, wallName,
  roomBounds, type NormRoom } from '../core/room';
import { fmt } from '../core/format';
import type { Room, Vec2 } from '../core/types';
import { Icon } from './Icon';
import { NumberField } from './fields';

type Sel = { kind: 'corner' | 'wall'; i: number } | null;
type Drag = { kind: 'corner' | 'wall'; i: number; start: Vec2; orig: Vec2[]; pid: number };

const snap = (n: number) => Math.round(n / SNAP) * SNAP;
const ALIGN = 12; // cm: distancia para alinearse con una esquina vecina

interface RoomPlanProps { room: NormRoom; onChange: (r: Room) => void; editable?: boolean }

export function RoomPlan({ room, onChange, editable = true }: RoomPlanProps) {
  const svg = useRef<SVGSVGElement>(null);
  const [sel, setSel] = useState<Sel>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const frozen = useRef<string | null>(null);

  const r = room, ws = walls(r), n = r.points.length;
  const b = roomBounds(r), size = Math.max(b.x1 - b.x0, b.z1 - b.z0, 200), u = size / 420; // unidad visual
  const pad = WALL_T + 46 * u;
  const viewBox = drag && frozen.current ? frozen.current : `${b.x0 - pad} ${b.z0 - pad} ${b.x1 - b.x0 + 2 * pad} ${b.z1 - b.z0 + 2 * pad}`;

  const toPlan = (e: { clientX: number; clientY: number }): Vec2 => {
    const el = svg.current!, pt = el.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse());
    return [p.x, p.y];
  };

  const begin = (kind: 'corner' | 'wall', i: number) => (e: RPointerEvent) => {
    if (!editable) return;
    e.stopPropagation();
    setSel({ kind, i });
    frozen.current = viewBox;
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* sin captura: el arrastre sigue funcionando */ }
    setDrag({ kind, i, start: toPlan(e), orig: r.points.map((p) => [p[0], p[1]] as Vec2), pid: e.pointerId });
  };

  const move = (e: RPointerEvent) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const [px, pz] = toPlan(e), dx = px - drag.start[0], dz = pz - drag.start[1];
    const pts = drag.orig.map((p) => [p[0], p[1]] as Vec2);
    if (drag.kind === 'corner') {
      const j = drag.i, prev = pts[(j - 1 + n) % n], next = pts[(j + 1) % n];
      let x = snap(drag.orig[j][0] + dx), z = snap(drag.orig[j][1] + dz);
      // alinear con las esquinas vecinas para mantener paredes rectas
      for (const q of [prev, next]) {
        if (Math.abs(x - q[0]) < ALIGN) x = q[0];
        if (Math.abs(z - q[1]) < ALIGN) z = q[1];
      }
      pts[j] = [x, z];
    } else {
      // mover la pared entera en perpendicular (sus dos esquinas)
      const w = ws[drag.i], d = dx * w.out[0] + dz * w.out[1];
      const off = snap(d);
      for (const k of [drag.i, (drag.i + 1) % n]) pts[k] = [drag.orig[k][0] + w.out[0] * off, drag.orig[k][1] + w.out[1] * off];
    }
    onChange({ ...r, points: pts });
  };

  const end = (e: RPointerEvent) => {
    if (!drag || e.pointerId !== drag.pid) return;
    setDrag(null); frozen.current = null;
  };

  /* ---- acciones sobre la selección ---- */
  const selWall = sel?.kind === 'wall' ? ws[sel.i] : null;
  const selCorner = sel?.kind === 'corner' ? r.points[sel.i] : null;

  const setWallLength = (len: number) => {
    if (!selWall) return;
    // alarga la pared moviendo su esquina final y la siguiente juntas: la pared siguiente se desplaza en paralelo
    const delta = Math.max(30, len) - selWall.len;
    const pts = r.points.map((p) => [p[0], p[1]] as Vec2);
    for (const k of [(selWall.i + 1) % n, (selWall.i + 2) % n]) {
      if (k === selWall.i) continue;
      pts[k] = [snap(pts[k][0] + selWall.dir[0] * delta), snap(pts[k][1] + selWall.dir[1] * delta)];
    }
    onChange({ ...r, points: pts });
  };
  const setCorner = (axis: 0 | 1, v: number) => {
    if (sel?.kind !== 'corner') return;
    const pts = r.points.map((p) => [p[0], p[1]] as Vec2);
    pts[sel.i][axis] = snap(v + (axis === 0 ? b.x0 : b.z0));
    onChange({ ...r, points: pts });
  };

  const fs = 13 * u; // tamaño de letra en unidades de la planta

  return (
    <div className="plan-editor">
      <svg ref={svg} className={'room-plan' + (drag ? ' dragging' : '')} viewBox={viewBox}
        onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        onPointerDown={() => setSel(null)} role="img" aria-label={`Planta de ${fmt(r.w)} por ${fmt(r.d)} cm`}>
        <polygon points={r.points.map((p) => p.join(',')).join(' ')} fill={FLOORS[r.floor].base} opacity="0.35" />

        {ws.map((w) => (
          <g key={'w' + w.i}>
            {wallSegments(r, w.i).filter(([, , lo]) => lo === 0).map(([a, bb, , hi], k) => {
              const p1 = onWallPoint(w, a, WALL_T / 2), p2 = onWallPoint(w, bb, WALL_T / 2);
              return <line key={k} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} className={hi >= r.h - 0.5 ? 'wall' : 'wall low'} strokeWidth={WALL_T} />;
            })}
            {r.openings.filter((o) => o.wall === w.i).map((o0) => {
              const o = clampOpening(r, o0);
              if (o.type === 'ventana') {
                const a = onWallPoint(w, o.pos, WALL_T / 2), c = onWallPoint(w, o.pos + o.width, WALL_T / 2);
                return <line key={o.id} x1={a[0]} y1={a[1]} x2={c[0]} y2={c[1]} className="win" strokeWidth={WALL_T * 0.45} />;
              }
              const hinge = onWallPoint(w, o.pos, 0), endp = onWallPoint(w, o.pos + o.width, 0), leaf = onWallPoint(w, o.pos, -o.width);
              return (
                <g key={o.id} className="door">
                  <line x1={hinge[0]} y1={hinge[1]} x2={leaf[0]} y2={leaf[1]} />
                  <path d={`M ${endp[0]} ${endp[1]} A ${o.width} ${o.width} 0 0 1 ${leaf[0]} ${leaf[1]}`} />
                </g>
              );
            })}
            {/* zona para tomar la pared entera */}
            {editable && (
              <line x1={w.a[0] + w.out[0] * WALL_T / 2} y1={w.a[1] + w.out[1] * WALL_T / 2}
                x2={w.b[0] + w.out[0] * WALL_T / 2} y2={w.b[1] + w.out[1] * WALL_T / 2}
                className={'wall-hit' + (sel?.kind === 'wall' && sel.i === w.i ? ' on' : '')} strokeWidth={WALL_T + 12 * u}
                onPointerDown={begin('wall', w.i)}><title>{wallName(r, w.i)}: arrastra para moverla</title></line>
            )}
            {/* largo de la pared */}
            {w.len >= 20 && (() => {
              const q = onWallPoint(w, w.len / 2, WALL_T + 18 * u);
              let ang = Math.atan2(w.dir[1], w.dir[0]) * 180 / Math.PI;
              if (ang > 90 || ang < -90) ang += 180;
              return <text x={q[0]} y={q[1]} className="dim" fontSize={fs} transform={`rotate(${ang} ${q[0]} ${q[1]})`}>{fmt(w.len)}</text>;
            })()}
          </g>
        ))}

        {editable && r.points.map((p, i) => (
          <circle key={'c' + i} cx={p[0]} cy={p[1]} r={7 * u}
            className={'corner' + (sel?.kind === 'corner' && sel.i === i ? ' on' : '')}
            onPointerDown={begin('corner', i)}><title>Esquina {i + 1}: arrastra para moverla</title></circle>
        ))}
      </svg>

      {editable && (
        <div className="plan-tools">
          {!sel && <p className="note">Arrastra una <b>esquina</b> o una <b>pared</b> para cambiar la forma. Toca una para ver sus medidas exactas.</p>}
          {selWall && (
            <>
              <div className="plan-tools-row">
                <b>{wallName(r, selWall.i)}</b>
                <div style={{ width: 130 }}><NumberField id="pw-len" label="Largo" value={selWall.len} step={5} onCommit={setWallLength} /></div>
              </div>
              <div className="plan-tools-row">
                <button className="btn" onClick={() => { onChange(splitWall(r, selWall.i)); setSel({ kind: 'corner', i: selWall.i + 1 }); }}>
                  <Icon name="plus" size={16} />Agregar esquina en el medio
                </button>
              </div>
            </>
          )}
          {selCorner && sel && (
            <div className="plan-tools-row">
              <b>Esquina {sel.i + 1}</b>
              <div className="grid2" style={{ flex: 1 }}>
                <NumberField id="pc-x" label="Desde la izquierda" value={selCorner[0] - b.x0} step={5} onCommit={(v) => setCorner(0, v)} />
                <NumberField id="pc-z" label="Desde el fondo" value={selCorner[1] - b.z0} step={5} onCommit={(v) => setCorner(1, v)} />
              </div>
              <button className="btn danger" disabled={n <= 3} title={n <= 3 ? 'Una habitación necesita al menos 3 esquinas' : 'Quitar esta esquina'}
                onClick={() => { onChange(removeCorner(r, sel.i)); setSel(null); }}>
                <Icon name="trash" size={16} />Quitar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
