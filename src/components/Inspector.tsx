// Ficha de la pieza seleccionada: nombre, medidas, posición, material y acciones rápidas.
import { useEffect, useState } from 'react';
import { MATS, MAT_KEYS, TYPES, EXTRA_FIELDS, FAMILY_NAMES, limitValue, type EditableKey, type MatFamily } from '../core/catalog';
import { pieceLabel } from '../core/cutlist';
import { rotDeg } from '../core/geometry';
import { money } from '../core/budget';
import { clamp } from '../core/format';
import type { DeskConfig, DrawerSide, Kit, MatKey, Piece, Side } from '../core/types';
import { store, actions } from '../app/context';
import { toast } from '../app/toast';

const wallToast = () => toast('No se puede girar ahí: chocaría con una pared. Aléjala un poco primero.');
const rotate = (deg: number) => { if (!actions.rotateSelected(deg)) wallToast(); };
import { NumberField, Segmented } from './fields';
import { Icon, type IconName } from './Icon';
import { PieceIcon } from './PieceIcon';

export function Inspector() {
  const p = store.selected();
  if (!p) {
    return (
      <div className="empty-state">
        <PieceIcon type="deskL" />
        <b>Ninguna pieza seleccionada</b>
        <p>Haz <b>doble clic</b> en una pieza para activarla. Así no se mueve nada por accidente: solo la pieza activa se puede arrastrar y editar.</p>
      </div>
    );
  }
  return <PieceForm key={p.id} p={p} />;
}

function Quick({ icon, label, onClick, danger }: { icon: IconName; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button className={danger ? 'danger' : undefined} onClick={onClick} title={label}>
      <Icon name={icon} size={17} />{label}
    </button>
  );
}

/** Materiales agrupados por familia, con su precio por m². */
export function MaterialPicker({ value, onPick }: { value: MatKey; onPick: (k: MatKey) => void }) {
  const fams = Object.keys(FAMILY_NAMES) as MatFamily[];
  return (
    <div className="mat-groups">
      {fams.map((f) => {
        const keys = MAT_KEYS.filter((k) => MATS[k].family === f);
        return (
          <div key={f}>
            <p className="mat-fam">{FAMILY_NAMES[f]}</p>
            <div className="chips">
              {keys.map((k) => (
                <button key={k} className="chip" aria-pressed={value === k} onClick={() => onPick(k)} title={MATS[k].name}>
                  <span className="sw" style={{ background: MATS[k].base }} />
                  <span>{MATS[k].name.replace(/^Melamina /, '')}</span>
                  {store.prices.mats[k] > 0 && <small className="num">{money(store.prices.mats[k], store.prices.currency)}</small>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Medidas del escritorio completo: al cambiarlas se rearman todas sus piezas, en tiempo real. */
function KitSection({ kit }: { kit: Kit }) {
  const c = kit.cfg, L = c.shape === 'L';
  const upd = (key: keyof DeskConfig | 'ox' | 'oz', lo: number, hi: number, round = false) => (final: boolean) => (raw: number) => {
    let v = clamp(raw, lo, hi); if (round) v = Math.round(v);
    store.updateKit(kit.id, { [key]: v }, { commit: final });
  };
  const field = (key: keyof DeskConfig, label: string, lo: number, hi: number, step = 1, unit = 'cm') => {
    const f = upd(key, lo, hi, key === 'n');
    return <NumberField id={'k-' + key} label={label} value={c[key] as number} step={step} unit={unit} min={lo}
      onCommit={f(true)} onLive={f(false)} />;
  };
  return (
    <div className="section kit">
      <h3><Icon name="layers" size={14} /> Escritorio completo</h3>
      <div className="grid3">
        {field('a', L ? 'a · Largo' : 'Largo', 40, 400)}
        {L && field('b', 'b · Lateral', 40, 400)}
        {field('c', 'c · Fondo', 30, 120)}
        {field('d', 'd · Alto', 40, 120, 0.5)}
        {field('t', 'Grosor', 1, 6, 0.1)}
        {L && field('r', 'Curva', 0, 80)}
        {c.caj !== 'no' && field('n', 'Cajones', 1, 6, 1, '')}
      </div>
      <div className="grid2" style={{ marginTop: 8 }}>
        <Segmented<DrawerSide> label="Cajonera" value={c.caj}
          options={L ? [['izq', 'Izq.'], ['der', 'Der.'], ['no', 'Sin']] : [['izq', 'Izq.'], ['der', 'Der.'], ['ambas', 'Ambas'], ['no', 'Sin']]}
          onChange={(v) => store.updateKit(kit.id, { caj: v })} />
        {L && <Segmented<Side> label="Esquina" value={c.corner} options={[['izq', 'Izq.'], ['der', 'Der.']]}
          onChange={(v) => store.updateKit(kit.id, { corner: v })} />}
      </div>
    </div>
  );
}

function PieceForm({ p }: { p: Piece }) {
  const isL = p.type === 'tableroL';
  const extra = EXTRA_FIELDS[p.type];
  const [name, setName] = useState(p.name);
  useEffect(() => setName(p.name), [p.name]);

  // final = false mientras se escribe (se ve en tiempo real); true al terminar (se guarda en el historial)
  const set = (key: EditableKey, final = true) => (raw: number) => {
    if (key === 'x' || key === 'z') {
      // la posición tampoco puede atravesar una pared
      const v = limitValue(p, key, raw);
      actions.moveSelectedTo(key === 'x' ? v : p.x, key === 'z' ? v : p.z, final);
      return;
    }
    const patch: Partial<Piece> = { [key]: limitValue(p, key, raw) };
    if (p.type === 'patar' && key === 'w') patch.d = patch.w;
    store.update(p.id, patch, { geometry: !['x', 'y', 'z'].includes(key), commit: final });
  };
  const kit = store.kitOf(p);
  const commitName = () => store.update(p.id, { name: name.trim() || TYPES[p.type].name }, { geometry: false });

  return (
    <div>
      <div className="piece-head">
        <PieceIcon type={p.type} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <input aria-label="Nombre de la pieza" type="text" maxLength={40} value={name}
            onChange={(e) => setName(e.target.value)} onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
          <small className="num">{pieceLabel(p)} cm</small>
        </div>
      </div>

      {kit && <KitSection kit={kit} />}

      <div className="section">
        <h3>{kit ? 'Medidas de esta pieza' : 'Medidas'}</h3>
        <div className="grid3">
          <NumberField id="f-w" label={p.type === 'patar' ? 'Diámetro' : isL ? 'Largo a' : 'Ancho'} value={p.w} onCommit={set('w')} onLive={set('w', false)} min={1} />
          <NumberField id="f-h" label={isL ? 'Grosor' : 'Alto'} value={p.h} onCommit={set('h')} onLive={set('h', false)} min={0.5} />
          {p.type !== 'patar' && <NumberField id="f-d" label={isL ? 'Largo b' : 'Fondo'} value={p.d} onCommit={set('d')} onLive={set('d', false)} min={1} />}
        </div>
        {extra && (
          <div className="grid2" style={{ marginTop: 8 }}>
            {extra.map(([key, label]) => (
              <NumberField key={key} id={'f-' + key} label={label.replace(/^c · /, '')} value={p[key] ?? 0} onCommit={set(key)} onLive={set(key, false)}
                step={key === 'n' ? 1 : 0.5} unit={key === 'n' ? '' : 'cm'} min={key === 'n' ? 1 : 0} />
            ))}
          </div>
        )}
        {kit && <p className="hint-line">Si cambias las medidas del escritorio completo, sus piezas se rearman y se pierden los ajustes hechos pieza por pieza.</p>}
      </div>

      <div className="section">
        <h3>Posición</h3>
        <div className="grid3">
          <NumberField id="f-x" label="Izq. / der." value={p.x} onCommit={set('x')} onLive={set('x', false)} />
          <NumberField id="f-y" label="Del piso" value={p.y} onCommit={set('y')} onLive={set('y', false)} min={0} />
          <NumberField id="f-z" label="Atrás / frente" value={p.z} onCommit={set('z')} onLive={set('z', false)} />
        </div>
        <div className="rotate-row">
          <NumberField id="f-rot" label="Giro" value={rotDeg(p)} onCommit={(v) => { if (!actions.setAngle(v)) wallToast(); }} step={1} unit="°" />
          <div className="seg" role="group" aria-label="Girar">
            <button type="button" title="Girar 15° a la izquierda (Shift+R)" onClick={() => rotate(15)}>↺ 15°</button>
            <button type="button" title="Girar 15° a la derecha" onClick={() => rotate(-15)}>↻ 15°</button>
            <button type="button" title="Girar 90° (R)" onClick={() => rotate(90)}>90°</button>
          </div>
        </div>
        <p className="hint-line">También puedes arrastrar el aro que rodea la pieza. Con el imán gira de 15° en 15°; mantén Alt para un giro libre.</p>
      </div>

      <div className="section">
        <h3>Material</h3>
        <MaterialPicker value={p.mat} onPick={(k) => store.update(p.id, { mat: k })} />
      </div>

      <div className="section">
        <div className="quick">
          <Quick icon="rotate" label="Girar 90°" onClick={() => rotate(90)} />
          <Quick icon="drop" label="Apoyar" onClick={actions.dropSelected} />
          <Quick icon="copy" label="Duplicar" onClick={actions.duplicateSelected} />
          <Quick icon="trash" label="Eliminar" onClick={actions.removeSelected} danger />
        </div>
        {p.type === 'cajon' && (
          <button className="btn wide" style={{ marginTop: 8 }} onClick={actions.toggleDrawer}>
            <Icon name="drawer" size={16} />{p.open ? 'Cerrar cajón' : 'Abrir cajón'}
          </button>
        )}
        {isL && (
          <button className="btn wide" style={{ marginTop: 8 }} onClick={actions.flipCorner}>
            <Icon name="flip" size={16} />Cambiar esquina de lado
          </button>
        )}
      </div>
    </div>
  );
}
