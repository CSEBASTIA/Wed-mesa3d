// Ficha de la pieza seleccionada: nombre, medidas, posición, material y acciones rápidas.
import { useEffect, useState } from 'react';
import { MATS, MAT_KEYS, TYPES, EXTRA_FIELDS, limitValue, type EditableKey } from '../core/catalog';
import { pieceLabel } from '../core/cutlist';
import type { Piece } from '../core/types';
import { store, actions } from '../app/context';
import { NumberField } from './fields';
import { Icon, type IconName } from './Icon';
import { PieceIcon } from './PieceIcon';

export function Inspector() {
  const p = store.selected();
  if (!p) {
    return (
      <div className="empty-state">
        <PieceIcon type="deskL" />
        <b>Ninguna pieza seleccionada</b>
        <p>Toca una pieza en la escena para cambiar sus medidas, su posición y su material.</p>
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

function PieceForm({ p }: { p: Piece }) {
  const isL = p.type === 'tableroL';
  const extra = EXTRA_FIELDS[p.type];
  const [name, setName] = useState(p.name);
  useEffect(() => setName(p.name), [p.name]);

  const set = (key: EditableKey) => (raw: number) => {
    const patch: Partial<Piece> = { [key]: limitValue(p, key, raw) };
    if (p.type === 'patar' && key === 'w') patch.d = patch.w;
    store.update(p.id, patch, { geometry: !['x', 'y', 'z'].includes(key) });
  };
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

      <div className="section">
        <h3>Medidas</h3>
        <div className="grid3">
          <NumberField id="f-w" label={p.type === 'patar' ? 'Diámetro' : isL ? 'Largo a' : 'Ancho'} value={p.w} onCommit={set('w')} />
          <NumberField id="f-h" label={isL ? 'Grosor' : 'Alto'} value={p.h} onCommit={set('h')} />
          {p.type !== 'patar' && <NumberField id="f-d" label={isL ? 'Largo b' : 'Fondo'} value={p.d} onCommit={set('d')} />}
        </div>
        {extra && (
          <div className="grid2" style={{ marginTop: 8 }}>
            {extra.map(([key, label]) => (
              <NumberField key={key} id={'f-' + key} label={label.replace(/^c · /, '')} value={p[key] ?? 0} onCommit={set(key)}
                step={key === 'n' ? 1 : 0.5} unit={key === 'n' ? '' : 'cm'} />
            ))}
          </div>
        )}
      </div>

      <div className="section">
        <h3>Posición</h3>
        <div className="grid3">
          <NumberField id="f-x" label="Izq. / der." value={p.x} onCommit={set('x')} />
          <NumberField id="f-y" label="Del piso" value={p.y} onCommit={set('y')} min={0} />
          <NumberField id="f-z" label="Atrás / frente" value={p.z} onCommit={set('z')} />
        </div>
      </div>

      <div className="section">
        <h3>Material</h3>
        <div className="chips">
          {MAT_KEYS.map((k) => (
            <button key={k} className="chip" aria-pressed={p.mat === k} onClick={() => store.update(p.id, { mat: k })}>
              <span className="sw" style={{ background: MATS[k].base }} /><span>{MATS[k].name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="quick">
          <Quick icon="rotate" label="Girar" onClick={actions.rotateSelected} />
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
