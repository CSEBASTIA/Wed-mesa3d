// Ventana "Escritorio a medida": formulario de medidas que genera el escritorio completo.
import { useState } from 'react';
import { MATS, MAT_KEYS } from '../core/catalog';
import { DEFAULT_CFG, PRESETS, genTemplate, roomFromCfg, projectName } from '../core/templates';
import { clamp } from '../core/format';
import type { DeskConfig, DrawerSide, MatKey, Side, DeskShape } from '../core/types';
import { store } from '../app/context';
import { toast } from '../app/toast';
import type { Viewport } from '../three/viewport';
import { Modal } from './Modal';
import { DraftNumber, Segmented, SelectField, Switch } from './fields';
import { PieceIcon } from './PieceIcon';

type NumKey = 'a' | 'b' | 'c' | 'd' | 't' | 'r' | 'n' | 'rw' | 'rd';
/** En el formulario los números se guardan como texto para poder escribir libremente. */
type Draft = Omit<DeskConfig, NumKey> & Record<NumKey, string>;

const NUM_LIMITS: Record<NumKey, [number, number]> = {
  a: [40, 400], b: [40, 400], c: [30, 120], d: [40, 120], t: [1, 6], r: [0, 80], n: [1, 6], rw: [60, 1000], rd: [60, 1000]
};
const NUM_KEYS = Object.keys(NUM_LIMITS) as NumKey[];

function toDraft(c: DeskConfig): Draft {
  const d = { ...c } as unknown as Draft;
  for (const k of NUM_KEYS) d[k] = String(c[k]);
  return d;
}
function fromDraft(d: Draft): DeskConfig {
  const c = { ...d } as unknown as DeskConfig;
  for (const k of NUM_KEYS) {
    const v = parseFloat(d[k]);
    c[k] = Number.isFinite(v) ? clamp(v, ...NUM_LIMITS[k]) : DEFAULT_CFG[k];
  }
  c.n = Math.round(c.n);
  if (c.shape === 'L') c.c = Math.min(c.c, Math.min(c.a, c.b) - 15);
  if (c.shape === 'L' && c.caj === 'ambas') c.caj = 'izq';
  return c;
}

const MAT_OPTIONS = MAT_KEYS.map((k): [MatKey, string] => [k, MATS[k].name]);

export function TemplateDialog({ viewport, onClose }: { viewport: Viewport | null; onClose: () => void }) {
  // con un entorno ya creado, por defecto se usa ese entorno (no se cambian sus medidas)
  const hasRoom = !!store.room;
  const [f, setF] = useState<Draft>(() => ({ ...toDraft(store.cfg), room: hasRoom ? false : store.cfg.room }));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((prev) => ({ ...prev, [k]: v }));
  const L = f.shape === 'L';

  const cajOptions: [DrawerSide, string][] = L
    ? [['izq', 'Izquierda'], ['der', 'Derecha'], ['no', 'Sin']]
    : [['izq', 'Izq.'], ['der', 'Der.'], ['ambas', 'Ambas'], ['no', 'Sin']];

  const num = (k: NumKey, label: string, unit = 'cm') => (
    <DraftNumber id={'t-' + k} label={label} value={f[k]} onChange={(v) => set(k, v)}
      step={k === 't' || k === 'd' ? 0.5 : 1} min={NUM_LIMITS[k][0]} max={NUM_LIMITS[k][1]} unit={unit} />
  );

  const create = () => {
    const cfg = fromDraft(f);
    store.setCfg(cfg);
    store.setProj({ name: projectName(cfg) });
    // El escritorio se arma en la esquina trasera de la habitación. Si ya hay un entorno se conserva su estilo
    // (piso, paredes, puertas) y solo se ajusta la esquina; si se pidieron paredes nuevas, también sus medidas.
    const corner = cfg.shape === 'L' ? cfg.corner : 'izq';
    const fresh = roomFromCfg(cfg);
    const room = fresh ? { ...(store.room ?? {}), ...fresh } : store.room ? { ...store.room, corner } : null;
    store.replaceAll(genTemplate(cfg, () => store.newId()), room);
    viewport?.setView('iso');
    onClose();
    toast('Escritorio creado. Deshacer recupera el diseño anterior.');
  };

  return (
    <Modal title="Escritorio a medida" onClose={onClose}
      subtitle="Escribe las medidas y se arma el escritorio con tablero, soportes, faldones y cajonera. Después puedes ajustar cada pieza."
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={create}>Crear escritorio</button>
      </>}>

      <div className="group">
        <h4>Modelos de partida</h4>
        <div className="presets">
          {PRESETS.map((pr) => (
            <button key={pr.label} className="preset" type="button"
              onClick={() => setF({ ...toDraft({ ...DEFAULT_CFG, ...pr.cfg, mt: f.mt, ms: f.ms }), ...(hasRoom ? { room: false } : {}) })}>
              <PieceIcon type={pr.cfg.shape === 'recto' ? 'deskRecto' : 'deskL'} />
              <b>{pr.label}</b>
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <h4>Forma</h4>
        <div className="shape-pick" role="radiogroup" aria-label="Forma">
          {([['L', 'En L', 'Esquinero, dos tramos'], ['recto', 'Recto', 'Un solo tramo']] as [DeskShape, string, string][]).map(([v, t, s]) => (
            <button key={v} role="radio" aria-checked={f.shape === v} onClick={() => set('shape', v)}>
              <PieceIcon type={v === 'L' ? 'deskL' : 'deskRecto'} />
              <div><b>{t}</b><span>{s}</span></div>
            </button>
          ))}
        </div>
      </div>

      <div className="group">
        <h4>Medidas</h4>
        <div className="grid3 tpl">
          {num('a', L ? 'a · Largo trasero' : 'a · Largo')}
          {L && num('b', 'b · Largo lateral')}
          {num('c', 'c · Fondo')}
          {num('d', 'd · Altura total')}
          {num('t', 'Grosor tablero')}
          {L && num('r', 'Radio de la curva')}
        </div>
      </div>

      <div className="group">
        <h4>Estructura</h4>
        <div className="grid2" style={{ alignItems: 'end' }}>
          {L && <Segmented<Side> label="Esquina hacia" value={f.corner} options={[['izq', 'Izquierda'], ['der', 'Derecha']]} onChange={(v) => set('corner', v)} />}
          <Segmented<DrawerSide> label="Cajonera" value={!L || f.caj !== 'ambas' ? f.caj : 'izq'} options={cajOptions} onChange={(v) => set('caj', v)} />
          {f.caj !== 'no' && num('n', 'Cajones', '')}
          <SelectField<MatKey> id="t-mt" label="Material tablero" value={f.mt} options={MAT_OPTIONS} onChange={(v) => set('mt', v)} />
          <SelectField<MatKey> id="t-ms" label="Material estructura" value={f.ms} options={MAT_OPTIONS} onChange={(v) => set('ms', v)} />
        </div>
      </div>

      <div className="group">
        <Switch id="t-room" label={hasRoom ? 'Cambiar las medidas del entorno actual' : 'Agregar paredes alrededor del escritorio'}
          checked={f.room} onChange={(v) => set('room', v)} />
        {hasRoom && !f.room && <p className="note" style={{ marginTop: 6 }}>El escritorio se arma en la esquina trasera del entorno que ya creaste.</p>}
        {f.room && (
          <div className="grid2" style={{ marginTop: 10 }}>
            {num('rw', 'Pared trasera')}
            {num('rd', 'Pared lateral')}
          </div>
        )}
      </div>
    </Modal>
  );
}
