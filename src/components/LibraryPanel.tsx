// Panel izquierdo: entorno, escritorio a medida y biblioteca de piezas sueltas.
import { useState } from 'react';
import { TYPES, PIECE_TYPES, CATEGORY_NAMES, type PieceCategory } from '../core/catalog';

const CATS = Object.keys(CATEGORY_NAMES) as PieceCategory[];
import { pieceLabel } from '../core/cutlist';
import { ROOM_PRESETS } from '../core/room';
import { fmt } from '../core/format';
import { store, actions, useStoreVersion } from '../app/context';
import { toast } from '../app/toast';
import { PieceIcon } from './PieceIcon';
import { Icon } from './Icon';

interface LibraryPanelProps { onTemplate: () => void; onEnvironment: () => void; onCollapse: () => void }

export function LibraryPanel({ onTemplate, onEnvironment, onCollapse }: LibraryPanelProps) {
  useStoreVersion();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<PieceCategory | 'todas'>('todas');
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const groups = CATS
    .filter((c) => cat === 'todas' || cat === c)
    .map((c) => [c, PIECE_TYPES.filter((t) => TYPES[t].cat === c &&
      (!q || norm(TYPES[t].name + ' ' + (TYPES[t].hint ?? '') + ' ' + CATEGORY_NAMES[c]).includes(norm(q))))] as const)
    .filter(([, list]) => list.length > 0);
  const room = store.room;
  const roomName = room ? (ROOM_PRESETS.find((p) => p.kind === room.kind)?.name ?? 'Habitación') : null;
  return (
    <aside className="panel left float edge-l" aria-label="Biblioteca">
      <div className="panel-head">
        <h2>Biblioteca</h2>
        <button className="icon-btn sm" title="Minimizar panel" aria-label="Minimizar biblioteca" onClick={onCollapse}>
          <Icon name="hideLeft" size={17} />
        </button>
      </div>
      <div className="panel-body">
        <p className="eyebrow" style={{ marginTop: 2 }}>Entorno</p>
        <button className="feature" data-tour="entorno" onClick={onEnvironment}>
          <PieceIcon type="room" />
          <div>
            <b>{roomName ? roomName : 'Crear entorno'}</b>
            <span className={roomName ? 'num' : undefined}>
              {room ? `${fmt(room.w)} × ${fmt(room.d)} cm · editar` : 'Cuarto, sala u oficina'}
            </span>
          </div>
        </button>

        <p className="eyebrow">Muebles</p>
        <button className="feature" data-tour="escritorio" onClick={onTemplate}>
          <PieceIcon type="deskL" />
          <div>
            <b>Escritorio a medida</b>
            <span>En L o recto, listo en segundos</span>
          </div>
        </button>

        <div className="lib-head">
          <p className="eyebrow">Piezas sueltas <span className="num">{PIECE_TYPES.length}</span></p>
          <div className="input search">
            <input type="text" placeholder="Buscar: pata, cajón, cables…" aria-label="Buscar piezas" value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }} />
          </div>
          <div className="cat-chips" role="radiogroup" aria-label="Categoría">
            {(['todas', ...CATS] as const).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={cat === c} onClick={() => setCat(c)}>
                {c === 'todas' ? 'Todas' : CATEGORY_NAMES[c].split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {groups.length === 0 && <p className="note" style={{ padding: '8px 4px' }}>No hay piezas que coincidan con "{q}".</p>}
        {groups.map(([c, types]) => (
          <div key={c}>
            <p className="eyebrow cat">{CATEGORY_NAMES[c]}</p>
            <div className="tiles">
              {types.map((type) => {
                const t = TYPES[type];
                return (
                  <button key={type} className="tile" title={'Agregar ' + t.name.toLowerCase() + (t.hint ? ' · ' + t.hint : '')}
                    onClick={() => { actions.addPiece(type); toast(t.name + ' agregado. Doble clic para moverlo.'); }}>
                    <PieceIcon type={type} />
                    <b>{t.name}</b>
                    <small>{t.hint ?? <span className="num">{pieceLabel({ ...t, type }).replace(/, .*$/, '')}</span>}</small>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
