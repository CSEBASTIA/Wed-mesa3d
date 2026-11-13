// Planta de la habitación en SVG (vista desde arriba): paredes, puertas con su abatimiento y ventanas.
import { WALL_SIDES, WALL_T, clampOpening, normalizeRoom, roomBounds, wallFrame, wallSegments } from '../core/room';
import { FLOORS } from '../core/room';
import type { Room } from '../core/types';

export function RoomPlan({ room }: { room: Room }) {
  const r = normalizeRoom(room);
  const { x0, x1, z0, z1 } = roomBounds(r), pad = WALL_T + 30;
  const vb = `${x0 - pad} ${z0 - pad} ${r.w + 2 * pad} ${r.d + 2 * pad}`;
  const pt = (side: typeof WALL_SIDES[number], u: number, n: number): [number, number] => {
    const f = wallFrame(r, side);
    return [f.start[0] + f.dir[0] * u + f.out[0] * n, f.start[1] + f.dir[1] * u + f.out[1] * n];
  };
  return (
    <svg className="room-plan" viewBox={vb} role="img" aria-label={`Planta de ${r.w} por ${r.d} cm`}>
      <rect x={x0} y={z0} width={r.w} height={r.d} fill={FLOORS[r.floor].base} opacity="0.35" />
      {WALL_SIDES.map((side) => (
        <g key={side}>
          {wallSegments(r, side).filter(([, , lo]) => lo === 0).map(([a, b, , hi], i) => {
            const p1 = pt(side, a, WALL_T / 2), p2 = pt(side, b, WALL_T / 2);
            const full = hi >= r.h - 0.5;
            return <line key={i} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} className={full ? 'wall' : 'wall low'} strokeWidth={WALL_T} />;
          })}
          {r.openings.filter((o) => o.wall === side).map((o0) => {
            const o = clampOpening(r, o0);
            if (o.type === 'ventana') {
              const a = pt(side, o.pos, WALL_T / 2), b = pt(side, o.pos + o.width, WALL_T / 2);
              return <line key={o.id} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="win" strokeWidth={WALL_T * 0.45} />;
            }
            // puerta: hoja abierta 90° hacia adentro y arco de abatimiento
            const hinge = pt(side, o.pos, 0), end = pt(side, o.pos + o.width, 0), leaf = pt(side, o.pos, -o.width);
            return (
              <g key={o.id} className="door">
                <line x1={hinge[0]} y1={hinge[1]} x2={leaf[0]} y2={leaf[1]} />
                <path d={`M ${end[0]} ${end[1]} A ${o.width} ${o.width} 0 0 ${side === 'trasera' || side === 'frontal' ? 1 : 1} ${leaf[0]} ${leaf[1]}`} />
              </g>
            );
          })}
        </g>
      ))}
      <text x={(x0 + x1) / 2} y={z0 - WALL_T - 10} className="dim">{r.w} cm</text>
      <text x={x0 - WALL_T - 10} y={(z0 + z1) / 2} className="dim" transform={`rotate(-90 ${x0 - WALL_T - 10} ${(z0 + z1) / 2})`}>{r.d} cm</text>
    </svg>
  );
}
