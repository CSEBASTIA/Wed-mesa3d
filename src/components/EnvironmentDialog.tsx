// Ventana "Entorno": crear o editar la habitación (cuarto, sala u oficina) donde van los escritorios.
import { useState } from 'react';
import { FLOORS, FLOOR_KEYS, OPENING_DEFAULTS, ROOM_PRESETS, WALL_COLORS, WALL_NAMES, WALL_SIDES,
  makeRoom, newOpeningId, normalizeRoom, wallLength } from '../core/room';
import { clamp } from '../core/format';
import type { Opening, OpeningType, Room, Side, WallSide } from '../core/types';
import { store } from '../app/context';
import { toast } from '../app/toast';
import type { Viewport } from '../three/viewport';
import { Modal } from './Modal';
import { NumberField, Segmented } from './fields';
import { Icon } from './Icon';
import { RoomPlan } from './RoomPlan';

export function EnvironmentDialog({ viewport, onClose }: { viewport: Viewport | null; onClose: () => void }) {
  const editing = !!store.room;
  const [room, setRoom] = useState<Required<Room>>(() =>
    normalizeRoom(store.room ?? makeRoom(ROOM_PRESETS[0], store.cfg.shape === 'L' ? store.cfg.corner : 'izq')));
  const patch = (p: Partial<Room>) => setRoom((r) => ({ ...r, ...p }));
  const setOpening = (id: string, p: Partial<Opening>) =>
    setRoom((r) => ({ ...r, openings: r.openings.map((o) => (o.id === id ? { ...o, ...p } : o)) }));
  const addOpening = (type: OpeningType) => {
    const wall: WallSide = type === 'puerta' ? 'frontal' : 'trasera';
    const L = wallLength(room, wall), d = OPENING_DEFAULTS[type];
    setRoom((r) => ({ ...r, openings: [...r.openings, { ...d, id: newOpeningId(), wall, pos: Math.max(10, (L - d.width) / 2) }] }));
  };

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

  return (
    <Modal title={editing ? 'Editar entorno' : 'Crear entorno'} wide onClose={onClose}
      subtitle="Arma la habitación donde va el mueble: medidas, piso, paredes, puertas y ventanas. Luego crea el escritorio dentro."
      footer={<>
        {editing && <button className="btn ghost danger" style={{ marginRight: 'auto' }} onClick={remove}><Icon name="trash" size={16} />Quitar entorno</button>}
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={save}>{editing ? 'Guardar cambios' : 'Crear entorno'}</button>
      </>}>
      <div className="env-grid">
        <div className="env-form">
          <div className="group">
            <h4>Tipo de espacio</h4>
            <div className="kind-pick" role="radiogroup" aria-label="Tipo de espacio">
              {ROOM_PRESETS.map((p) => (
                <button key={p.kind} role="radio" aria-checked={room.kind === p.kind}
                  onClick={() => setRoom(normalizeRoom(makeRoom(p, room.corner)))}>
                  <b>{p.name}</b><span>{p.hint}</span>
                  <small className="num">{p.room.w} × {p.room.d}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="group">
            <h4>Medidas</h4>
            <div className="grid3">
              <NumberField id="r-w" label="Ancho (pared trasera)" value={room.w} step={5} onCommit={(v) => patch({ w: clamp(v, 150, 1500) })} />
              <NumberField id="r-d" label="Largo (pared lateral)" value={room.d} step={5} onCommit={(v) => patch({ d: clamp(v, 150, 1500) })} />
              <NumberField id="r-h" label="Alto" value={room.h} step={5} onCommit={(v) => patch({ h: clamp(v, 200, 450) })} />
            </div>
            <div style={{ marginTop: 10 }}>
              <Segmented<Side> label="El escritorio en L se arma en la esquina trasera" value={room.corner}
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
                  <span className="op-icon" title={o.type === 'puerta' ? 'Puerta' : 'Ventana'}><Icon name={o.type === 'puerta' ? 'door' : 'window'} size={17} /></span>
                  <div className="field">
                    <label htmlFor={'ow-' + o.id}>Pared</label>
                    <div className="input">
                      <select id={'ow-' + o.id} value={o.wall} onChange={(e) => setOpening(o.id, { wall: e.target.value as WallSide })}>
                        {WALL_SIDES.map((s) => <option key={s} value={s}>{WALL_NAMES[s]}</option>)}
                      </select>
                    </div>
                  </div>
                  <NumberField id={'op-' + o.id} label="Desde la esquina" value={o.pos} step={5} onCommit={(v) => setOpening(o.id, { pos: Math.max(0, v) })} />
                  <NumberField id={'oa-' + o.id} label="Ancho" value={o.width} step={5} onCommit={(v) => setOpening(o.id, { width: clamp(v, 30, 400) })} />
                  <NumberField id={'oh-' + o.id} label="Alto" value={o.height} step={5} onCommit={(v) => setOpening(o.id, { height: clamp(v, 30, 300) })} />
                  {o.type === 'ventana'
                    ? <NumberField id={'os-' + o.id} label="Del piso" value={o.sill} step={5} onCommit={(v) => setOpening(o.id, { sill: clamp(v, 0, 250) })} />
                    : <span />}
                  <button className="icon-btn danger" title="Quitar" aria-label="Quitar abertura"
                    onClick={() => setRoom((r) => ({ ...r, openings: r.openings.filter((q) => q.id !== o.id) }))}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="row-actions">
              <button className="btn" onClick={() => addOpening('puerta')}><Icon name="door" size={16} />Agregar puerta</button>
              <button className="btn" onClick={() => addOpening('ventana')}><Icon name="window" size={16} />Agregar ventana</button>
            </div>
          </div>
        </div>

        <div className="env-preview">
          <RoomPlan room={room} />
          <p className="note">Vista desde arriba. Las medidas de las aberturas se cuentan desde el extremo izquierdo de cada pared, mirándola desde dentro.</p>
        </div>
      </div>
    </Modal>
  );
}
