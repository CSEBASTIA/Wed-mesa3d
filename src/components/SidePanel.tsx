// Panel derecho con pestañas: la pieza seleccionada, la lista de piezas y el despiece para el carpintero.
import { useEffect, useState } from 'react';
import { matOf } from '../core/catalog';
import { cutList, pieceLabel } from '../core/cutlist';
import { store, useStoreVersion } from '../app/context';
import { Inspector } from './Inspector';
import { Icon } from './Icon';

type Tab = 'pieza' | 'piezas' | 'despiece';

export function SidePanel({ onExport, onCollapse }: { onExport: () => void; onCollapse: () => void }) {
  useStoreVersion();
  const [tab, setTab] = useState<Tab>('pieza');
  const selId = store.selId;
  // al seleccionar una pieza, mostrar su ficha
  useEffect(() => { if (selId) setTab('pieza'); }, [selId]);

  const rows = tab === 'despiece' ? cutList(store.pieces) : [];
  const totalParts = rows.reduce((n, r) => n + (r.mat === 'Herraje' ? 0 : r.q), 0);

  const tabs: [Tab, string, number | null][] = [
    ['pieza', 'Pieza', null], ['piezas', 'Piezas', store.pieces.length], ['despiece', 'Despiece', null]
  ];

  return (
    <aside className="panel right float edge-r" aria-label="Detalle">
      <div className="tabs-row">
        <div className="tabs" role="tablist">
          {tabs.map(([t, label, count]) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {label}{count != null && <span className="count">{count}</span>}
            </button>
          ))}
        </div>
        <button className="icon-btn sm" title="Minimizar panel" aria-label="Minimizar panel de detalle" onClick={onCollapse}>
          <Icon name="hideRight" size={17} />
        </button>
      </div>

      <div className="panel-body" role="tabpanel">
        {tab === 'pieza' && <Inspector />}

        {tab === 'piezas' && (
          store.pieces.length ? (
            <div className="rows">
              {store.pieces.map((q) => (
                <button key={q.id} className="row" aria-current={q.id === selId} onClick={() => store.select(q.id)}>
                  <span className="dot" style={{ background: matOf(q.mat).base }} title={matOf(q.mat).name} />
                  <span className="name">{q.name}</span>
                  <span className="dims">{pieceLabel(q).replace(/, .*$/, '')}</span>
                </button>
              ))}
            </div>
          ) : <p className="note" style={{ padding: 8 }}>Todavía no hay piezas. Empieza con "Escritorio a medida" o agrega una pieza de la biblioteca.</p>
        )}

        {tab === 'despiece' && (
          rows.length ? (
            <div>
              {rows.map((r) => (
                <div key={r.name + r.txt + r.mat} className="cut">
                  <span className="qty">{r.q}×</span>
                  <span className="name">{r.name}</span>
                  <span className="meta">{r.txt} <i>· {r.mat}</i></span>
                </div>
              ))}
            </div>
          ) : <p className="note" style={{ padding: 8 }}>El despiece aparece cuando agregas piezas.</p>
        )}
      </div>

      {tab === 'despiece' && rows.length > 0 && (
        <div className="panel-foot">
          <div className="summary"><span>Tablas a cortar</span><b className="num">{totalParts}</b></div>
          <button className="btn accent wide" onClick={onExport}><Icon name="download" size={16} />Exportar plano con medidas</button>
        </div>
      )}
    </aside>
  );
}
