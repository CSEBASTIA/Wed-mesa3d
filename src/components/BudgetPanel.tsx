// Presupuesto del diseño: total, comparación de acabados, desglose y precios editables.
import { useState } from 'react';
import { FINISHES, budget, finishMat, money, defaultPrices, type PriceList } from '../core/budget';
import { MATS, MAT_KEYS } from '../core/catalog';
import { fmt } from '../core/format';
import type { MatKey } from '../core/types';
import { store } from '../app/context';
import { toast } from '../app/toast';
import { NumberField } from './fields';
import { Icon } from './Icon';

export function BudgetPanel() {
  const [editing, setEditing] = useState(false);
  const P = store.prices, cur = P.currency;
  const b = budget(store.pieces, P);
  const totals = FINISHES.map((f) => ({ f, total: budget(store.pieces, P, finishMat(f)).total }));
  const cheapest = Math.min(...totals.map((t) => t.total));
  // ¿el diseño actual coincide con algún acabado?
  const current = FINISHES.find((f) => store.pieces.every((p) => p.mat === finishMat(f)(p)));

  const setPrice = (patch: Partial<PriceList>) => store.setPrices({ ...P, ...patch });
  const setMat = (k: MatKey, v: number) => setPrice({ mats: { ...P.mats, [k]: Math.max(0, v) } });

  if (!store.pieces.length) return <p className="note" style={{ padding: 8 }}>El presupuesto aparece cuando agregas piezas.</p>;

  return (
    <div className="budget">
      <div className="total-card">
        <span>Presupuesto estimado</span>
        <b className="num">{money(b.total, cur)}</b>
        <small>Materiales {money(b.materials, cur)} · Herrajes {money(b.hardware, cur)} · Mano de obra {money(b.labor, cur)}</small>
      </div>

      <p className="eyebrow">Comparar acabados</p>
      <div className="finishes">
        {totals.map(({ f, total }) => (
          <button key={f.id} className="finish" aria-pressed={current?.id === f.id}
            onClick={() => { store.applyFinish(f.top, f.structure); toast(`Acabado ${f.name} aplicado. Deshacer lo revierte.`); }}
            title={`Aplicar: ${MATS[f.top].name} + ${MATS[f.structure].name}`}>
            <span className="finish-sw"><i style={{ background: MATS[f.top].base }} /><i style={{ background: MATS[f.structure].base }} /></span>
            <span className="finish-name">{f.name}{total === cheapest && <em>más barato</em>}</span>
            <span className="finish-hint">{f.hint}</span>
            <b className="num">{money(total, cur)}</b>
          </button>
        ))}
      </div>

      <p className="eyebrow">Desglose</p>
      <div className="lines">
        {b.lines.map((l) => (
          <div key={l.label} className="line">
            <span className="name">{l.label}</span>
            <span className="meta num">{fmt(l.qty)} {l.unit} × {money(l.price, cur)}</span>
            <b className="num">{money(l.total, cur)}</b>
          </div>
        ))}
        <div className="line">
          <span className="name">Mano de obra</span>
          <span className="meta num">{fmt(P.labor)} %</span>
          <b className="num">{money(b.labor, cur)}</b>
        </div>
      </div>
      <p className="hint-line">Incluye {fmt(P.waste)} % de desperdicio de corte. Precios de referencia: ajústalos a tu proveedor.</p>

      <button className="btn wide" style={{ marginTop: 10 }} onClick={() => setEditing((v) => !v)}>
        <Icon name="sliders" size={16} />{editing ? 'Ocultar precios' : 'Editar precios'}
      </button>

      {editing && (
        <div className="prices">
          <div className="grid2">
            <div className="field">
              <label htmlFor="pr-cur">Moneda</label>
              <div className="input">
                <select id="pr-cur" value={cur} onChange={(e) => setPrice({ currency: e.target.value })}>
                  {['USD', 'EUR', 'MXN', 'COP', 'PEN', 'CLP', 'ARS'].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <NumberField id="pr-labor" label="Mano de obra" value={P.labor} unit="%" step={1} min={0} onCommit={(v) => setPrice({ labor: Math.max(0, v) })} />
          </div>
          <p className="mat-fam">Tableros, precio por m²</p>
          <div className="grid2">
            {MAT_KEYS.filter((k) => MATS[k].family !== 'metal').map((k) => (
              <NumberField key={k} id={'pr-' + k} label={MATS[k].name} value={P.mats[k]} unit="/m²" step={1} min={0} onCommit={(v) => setMat(k, v)} />
            ))}
          </div>
          <p className="mat-fam">Extras</p>
          <div className="grid2">
            <NumberField id="pr-edge" label="Canto PVC" value={P.edge} unit="/m" step={0.1} min={0} onCommit={(v) => setPrice({ edge: Math.max(0, v) })} />
            <NumberField id="pr-back" label="Fondo MDF 6 mm" value={P.back} unit="/m²" step={0.5} min={0} onCommit={(v) => setPrice({ back: Math.max(0, v) })} />
            <NumberField id="pr-slide" label="Correderas (par)" value={P.slide} unit="c/u" step={0.5} min={0} onCommit={(v) => setPrice({ slide: Math.max(0, v) })} />
            <NumberField id="pr-handle" label="Tirador" value={P.handle} unit="c/u" step={0.5} min={0} onCommit={(v) => setPrice({ handle: Math.max(0, v) })} />
            <NumberField id="pr-leg" label="Pata metálica" value={P.leg} unit="c/u" step={0.5} min={0} onCommit={(v) => setPrice({ leg: Math.max(0, v) })} />
            <NumberField id="pr-waste" label="Desperdicio" value={P.waste} unit="%" step={1} min={0} onCommit={(v) => setPrice({ waste: Math.max(0, v) })} />
            <NumberField id="pr-tube" label="Perfil metálico" value={P.tube} unit="/m" step={0.5} min={0} onCommit={(v) => setPrice({ tube: Math.max(0, v) })} />
            <NumberField id="pr-hinge" label="Bisagra" value={P.hinge} unit="c/u" step={0.5} min={0} onCommit={(v) => setPrice({ hinge: Math.max(0, v) })} />
            <NumberField id="pr-wheel" label="Rueda" value={P.wheel} unit="c/u" step={0.5} min={0} onCommit={(v) => setPrice({ wheel: Math.max(0, v) })} />
            <NumberField id="pr-kb" label="Guías de bandeja" value={P.kbSlide} unit="c/u" step={0.5} min={0} onCommit={(v) => setPrice({ kbSlide: Math.max(0, v) })} />
            <NumberField id="pr-grom" label="Pasacables" value={P.grommet} unit="c/u" step={0.5} min={0} onCommit={(v) => setPrice({ grommet: Math.max(0, v) })} />
            <NumberField id="pr-brk" label="Anclajes" value={P.bracket} unit="c/u" step={0.5} min={0} onCommit={(v) => setPrice({ bracket: Math.max(0, v) })} />
          </div>
          <button className="btn ghost wide" onClick={() => { store.setPrices(defaultPrices()); toast('Precios restablecidos.'); }}>Restablecer precios</button>
        </div>
      )}
    </div>
  );
}
