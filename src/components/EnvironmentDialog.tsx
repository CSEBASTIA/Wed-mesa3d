// Ventana "Entorno": diseñar la habitación (cuarto, sala u oficina) con su forma real, piso, paredes,
// puertas y ventanas. Los escritorios se arman dentro.
import { useState } from 'react';
import { FLOORS, FLOOR_KEYS, OPENING_DEFAULTS, ROOM_PRESETS, SHAPE_NAMES, WALL_COLORS,
  makeRoom, newOpeningId, normalizeRoom, polygonArea, resizeRoom, shapePoints, walls, wallName,
  type NormRoom, type RoomShape } from '../core/room';
import { clamp, fmt } from '../core/format';
import type { OpeningType, Room, Side } from '../core/types';
import { store } from '../app/context';
import { toast } from '../app/toast';
import type { Viewport } from '../three/viewport';
import { Modal } from './Modal';
import { NumberField, Segmented } from './fields';
import { Icon } from './Icon';
import { RoomPlan } from './RoomPlan';

type Opening = NormRoom['openings'][number];

export function EnvironmentDialog({ viewport, onClose }: { viewport: Viewport | null; onClose: () => void }) {
  const editing = !!store.room;
  const [room, setRoomState] = useState<NormRoom>(() =>
    normalizeRoom(store.room ?? makeRoom(ROOM_PRESETS[0], store.cfg.shape === 'L' ? store.cfg.corner : 'izq')));
  const setRoom = (r: Room) => setRoomState(normalizeRoom(r));
  const patch = (p: Partial<Room>) => setRoom({ ...room, ...p });
  const setOpening = (id: string, p: Partial<Opening>) =>
    setRoom({ ...room, openings: room.openings.map((o) => (o.id === id ? { ...o, ...p } : o)) });
  const addOpening = (type: OpeningType) => {
    const ws = walls(room), wi = type === 'puerta' ? Math.min(2, ws.length - 1) : 0;
    const L = ws[wi].len, d = OPENING_DEFAULTS[type];
    setRoom({ ...room, openings: [...room.openings, { ...d, id: newOpeningId(), wall: wi, pos: Math.max(10, (L - d.width) / 2) }] });
  };
  const applyShape = (shape: RoomShape) =>
    setRoom({ ...room, points: shapePoints(shape, room.w, room.d, room.corner), openings: room.openings.filter((o) => o.wall < 4) });

  const save = () => {
    store.setRoom({ ...room });
    viewport?.setView('iso');
    onClose();
    toast(editing ? 'Entorno actualizado.' : 'Entorno creado. Ahora agrega o crea tu escritorio.');
  };
  const remove = () => {
    store.setRoom(null);
    onClose();
    toast('Entorno quitado. Deshacer lo recupera.');
  };

  const area = polygonArea(room.points) / 10000;
  const ws = walls(room);

  return (
    <Modal title={editing ? 'Editar entorno' : 'Crear entorno'} wide onClose={onClose}
      subtitle="Dibuja tu habitación tal como es: su forma, medidas, piso, paredes, puertas y ventanas. Luego crea el escritorio dentro."
      footer={<>
        {editing && <button className="btn ghost danger" style={{ marginRight: 'auto' }} onClick={remove}><Icon name="trash" size={16} />Quitar entorno</button>}
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={save}>{editing ? 'Guardar cambios' : 'Crear entorno'}</button>
      </>}>
      <div className="env-grid">
        <div className="env-preview">
          <div className="plan-head">
            <div className="seg" role="radiogroup" aria-label="Forma de partida">
              {(Object.keys(SHAPE_NAMES) as RoomShape[]).map((s) => (
                <button key={s} type="button" role="radio" aria-checked={false} onClick={() => applyShape(s)}>{SHAPE_NAMES[s]}</button>
              ))}
            </div>
            <span className="num plan-area">{fmt(area)} m² · {room.points.length} esquinas</span>
          </div>
          <RoomPlan room={room} onChange={setRoom} />
        </div>

        <div className="env-form">
          <div className="group">
            <h4>Tipo de espacio</h4>
            <div className="kind-pick" role="radiogroup" aria-label="Tipo de espacio">
              {ROOM_PRESETS.map((p) => (
                <button key={p.kind} role="radio" aria-checked={room.kind === p.kind}
                  onClick={() => setRoom(makeRoom(p, room.corner))}>
                  <b>{p.name}</b><span>{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <h4>Medidas generales</h4>
            <div className="grid3">
              <NumberField id="r-w" label="Ancho" value={room.w} step={5} onCommit={(v) => setRoom(resizeRoom(room, clamp(v, 150, 2000), room.d))} />
              <NumberField id="r-d" label="Largo" value={room.d} step={5} onCommit={(v) => setRoom(resizeRoom(room, room.w, clamp(v, 150, 2000)))} />
              <NumberField id="r-h" label="Alto" value={room.h} step={5} onCommit={(v) => patch({ h: clamp(v, 200, 450) })} />
            </div>
            <div style={{ marginTop: 10 }}>
              <Segmented<Side> label="El escritorio se arma en la esquina trasera" value={room.corner}
                options={[['izq', 'Izquierda'], ['der', 'Derecha']]} onChange={(v) => patch({ corner: v })} />
            </div>
          </div>

          <div className="group">
            <h4>Piso</h4>
            <div className="chips">
              {FLOOR_KEYS.map((k) => (
                <button key={k} className="chip" aria-pressed={room.floor === k} onClick={() => patch({ floor: k })}>
                  <span className="sw" style={{ background: FLOORS[k].base }} /><span>{FLOORS[k].name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <h4>Paredes</h4>
            <div className="swatch-row" role="radiogroup" aria-label="Color de paredes">
              {WALL_COLORS.map(([c, name]) => (
                <button key={c} role="radio" aria-checked={room.wall === c} title={name} aria-label={name}
                  className="swatch" style={{ background: c }} onClick={() => patch({ wall: c })} />
              ))}
            </div>
          </div>

          <div className="group">
            <h4>Puertas y ventanas</h4>
            <div className="openings">
              {room.openings.length === 0 && <p className="note">Sin aberturas. Agrega una puerta o una ventana.</p>}
              {room.openings.map((o) => (
                <div key={o.id} className="opening">
                  <div className="opening-top">
                    <span className="op-icon"><Icon name={o.type === 'puerta' ? 'door' : 'window'} size={17} />{o.type === 'puerta' ? 'Puerta' : 'Ventana'}</span>
                    <div className="input" style={{ flex: 1 }}>
                      <select aria-label="Pared" value={o.wall} onChange={(e) => setOpening(o.id, { wall: Number(e.target.value) })}>
                        {ws.map((w) => <option key={w.i} value={w.i}>{wallName(room, w.i)} · {fmt(w.len)} cm</option>)}
                      </select>
                    </div>
                    <button className="icon-btn danger" title="Quitar" aria-label="Quitar abertura"
                      onClick={() => setRoom({ ...room, openings: room.openings.filter((q) => q.id !== o.id) })}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                  <div className={o.type === 'ventana' ? 'grid4' : 'grid3'}>
                    <NumberField id={'op-' + o.id} label="Desde la esquina" value={o.pos} step={5} onCommit={(v) => setOpening(o.id, { pos: Math.max(0, v) })} />
                    <NumberField id={'oa-' + o.id} label="Ancho" value={o.width} step={5} onCommit={(v) => setOpening(o.id, { width: clamp(v, 30, 400) })} />
                    <NumberField id={'oh-' + o.id} label="Alto" value={o.height} step={5} onCommit={(v) => setOpening(o.id, { height: clamp(v, 30, 300) })} />
                    {o.type === 'ventana' && <NumberField id={'os-' + o.id} label="Del piso" value={o.sill} step={5} onCommit={(v) => setOpening(o.id, { sill: clamp(v, 0, 250) })} />}
                  </div>
                </div>
              ))}
            </div>
            <div className="row-actions">
              <button className="btn" onClick={() => addOpening('puerta')}><Icon name="door" size={16} />Agregar puerta</button>
              <button className="btn" onClick={() => addOpening('ventana')}><Icon name="window" size={16} />Agregar ventana</button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
