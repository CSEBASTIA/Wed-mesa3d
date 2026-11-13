// Campos de formulario reutilizables.
import { useEffect, useRef, useState, type ReactNode } from 'react';

const show = (v: number) => String(Math.round(v * 10) / 10);

interface NumberFieldProps {
  id: string;
  label: ReactNode;
  value: number;
  onCommit: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}

/**
 * Campo numérico que se puede escribir libremente y aplica el valor al salir o con Enter.
 * Mientras no tiene el foco, sigue al valor del modelo (por ejemplo al arrastrar la pieza).
 */
export function NumberField({ id, label, value, onCommit, step = 0.5, min, max }: NumberFieldProps) {
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
      <input
        id={id} type="number" step={step} min={min} max={max} value={draft}
        onFocus={() => { focused.current = true; }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => { focused.current = false; commit(e.currentTarget.value); }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
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
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as V)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
