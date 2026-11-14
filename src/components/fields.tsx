// Campos de formulario reutilizables.
import { useEffect, useRef, useState, type ReactNode } from 'react';

const show = (v: number) => String(Math.round(v * 10) / 10);

interface NumberFieldProps {
  id: string;
  label: ReactNode;
  value: number;
  onCommit: (v: number) => void;
  /** Si se indica, se llama mientras se escribe para ver el cambio en tiempo real (sin guardar en el historial). */
  onLive?: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}

/**
 * Campo numérico que se puede escribir libremente y aplica el valor al salir o con Enter.
 * Con `onLive`, el modelo se actualiza en tiempo real mientras se escribe.
 * Mientras no tiene el foco, sigue al valor del modelo (por ejemplo al arrastrar la pieza).
 */
export function NumberField({ id, label, value, onCommit, onLive, step = 0.5, min, max, unit = 'cm' }: NumberFieldProps) {
  const [draft, setDraft] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(show(value)); }, [value]);

  // lee el texto del propio campo: el estado `draft` puede no estar actualizado todavía al salir
  const commit = (text: string) => {
    const v = parseFloat(text);
    if (Number.isFinite(v)) onCommit(v); else setDraft(show(value));
  };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input">
        <input
          id={id} type="number" inputMode="decimal" step={step} min={min} max={max} value={draft}
          onFocus={(e) => { focused.current = true; e.currentTarget.select(); }}
          onChange={(e) => {
            setDraft(e.target.value);
            const v = parseFloat(e.target.value);
            // en tiempo real: solo valores razonables (al escribir "1" camino a "120" no se aplica un 1)
            if (onLive && Number.isFinite(v) && (min == null || v >= min)) onLive(v);
          }}
          onBlur={(e) => { focused.current = false; commit(e.currentTarget.value); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') { setDraft(show(value)); focused.current = false; (e.target as HTMLInputElement).blur(); }
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  );
}

/** Campo numérico controlado simple (el valor vive en el formulario). */
export function DraftNumber({ id, label, value, onChange, step = 1, min, max, unit = 'cm' }: {
  id: string; label: ReactNode; value: string; onChange: (v: string) => void;
  step?: number; min?: number; max?: number; unit?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input">
        <input id={id} type="number" inputMode="decimal" step={step} min={min} max={max} value={value}
          onChange={(e) => onChange(e.target.value)} />
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  );
}

interface SelectFieldProps<V extends string> {
  id: string;
  label: ReactNode;
  value: V;
  options: [V, string][];
  onChange: (v: V) => void;
}

export function SelectField<V extends string>({ id, label, value, options, onChange }: SelectFieldProps<V>) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value as V)}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
    </div>
  );
}

/** Control segmentado: una opción de varias, todas visibles. */
export function Segmented<V extends string>({ label, value, options, onChange }: {
  label: string; value: V; options: [V, ReactNode][]; onChange: (v: V) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="seg" role="radiogroup" aria-label={label}>
        {options.map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

export function Switch({ id, label, checked, onChange }: { id: string; label: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
