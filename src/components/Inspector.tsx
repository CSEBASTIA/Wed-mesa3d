// Ficha de la pieza seleccionada: nombre, medidas, posición, material y acciones.
import { useEffect, useState } from 'react';
import { MATS, MAT_KEYS, TYPES, EXTRA_FIELDS, limitValue, type EditableKey } from '../core/catalog';
import type { Piece } from '../core/types';
import { store, actions, useStoreVersion } from '../app/context';
import { NumberField } from './fields';

export function Inspector() {
  useStoreVersion();
  const p = store.selected();

  if (!p) {
    return (
      <section>
        <h2>Pieza seleccionada</h2>
        <p className="empty">Toca una pieza en la escena o en la lista para cambiar sus medidas, su posición y su material.</p>
      </section>
    );
  }
  return (
    <section>
      <h2>Pieza seleccionada</h2>
      <PieceForm p={p} />
    </section>
  );
}

function PieceForm({ p }: { p: Piece }) {
  const isL = p.type === 'tableroL';
  const extra = EXTRA_FIELDS[p.type];
  const [name, setName] = useState(p.name);
  useEffect(() => setName(p.name), [p.id, p.name]);

  const set = (key: EditableKey) => (raw: number) => {
    const patch: Partial<Piece> = { [key]: limitValue(p, key, raw) };
    if (p.type === 'patar' && key === 'w') patch.d = patch.w;
    store.update(p.id, patch, { geometry: !['x', 'y', 'z'].includes(key) });
  };
  const commitName = () => store.update(p.id, { name: name.trim() || TYPES[p.type].name }, { geometry: false });

  return (
    <div className="form">
      <div className="field">
        <label htmlFor="f-name">Nombre</label>
        <input id="f-name" type="text" maxLength={40} value={name}
          onChange={(e) => setName(e.target.value)} onBlur={commitName}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
      </div>

      <p className="sub">Medidas (cm)</p>
      <div className="row3">
        <NumberField id="f-w" label={p.type === 'patar' ? 'Diámetro' : isL ? 'a · Largo X' : 'Ancho'} value={p.w} onCommit={set('w')} />
        <NumberField id="f-h" label={isL ? 'Grosor' : 'Alto'} value={p.h} onCommit={set('h')} />
        {p.type !== 'patar' && <NumberField id="f-d" label={isL ? 'b · Largo Z' : 'Fondo'} value={p.d} onCommit={set('d')} />}
      </div>
      {extra && (
        <div className="row2">
          {extra.map(([key, label]) => (
            <NumberField key={key} id={'f-' + key} label={label} value={p[key] ?? 0} onCommit={set(key)} step={key === 'n' ? 1 : 0.5} />
          ))}
        </div>
      )}

      <p className="sub">Posición (cm)</p>
      <div className="row3">
        <NumberField id="f-x" label="Izq. / der." value={p.x} onCommit={set('x')} />
        <NumberField id="f-y" label="Altura del piso" value={p.y} onCommit={set('y')} min={0} />
        <NumberField id="f-z" label="Atrás / frente" value={p.z} onCommit={set('z')} />
      </div>

      <p className="sub">Material</p>
      <div className="swatches">
        {MAT_KEYS.map((k) => (
          <button key={k} className="sw" type="button" title={MATS[k].name} aria-label={MATS[k].name}
            aria-pressed={p.mat === k} style={{ background: MATS[k].base }}
            onClick={() => store.update(p.id, { mat: k })} />
        ))}
      </div>

      <div className="actions">
        <button className="btn" title="R" onClick={actions.rotateSelected}>Girar 90°</button>
        <button className="btn" title="Baja la pieza hasta el piso o la pieza que tenga debajo" onClick={actions.dropSelected}>Apoyar</button>
        <button className="btn" title="Ctrl+D" onClick={actions.duplicateSelected}>Duplicar</button>
        <button className="btn danger" title="Supr" onClick={actions.removeSelected}>Eliminar</button>
      </div>
      {p.type === 'cajon' && (
        <button className="btn wide" onClick={actions.toggleDrawer}>{p.open ? 'Cerrar cajón' : 'Abrir cajón'}</button>
      )}
      {isL && <button className="btn wide" onClick={actions.flipCorner}>Cambiar esquina de lado</button>}
    </div>
  );
}
