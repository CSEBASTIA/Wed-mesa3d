// Ventana "Cámara": sensibilidad del movimiento con teclado, del giro y del zoom.
import { DEFAULT_CAMERA } from '../core/store';
import { fmt } from '../core/format';
import type { CameraSettings } from '../core/types';
import { store, useStoreVersion } from '../app/context';
import { Modal } from './Modal';

interface SliderProps {
  id: keyof CameraSettings;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

function Slider({ id, label, min, max, step, unit }: SliderProps) {
  const value = store.cam[id];
  return (
    <div className="field">
      <label htmlFor={'cam-' + id} className="slider-label">
        <span>{label}</span>
        <b>{fmt(value)}{unit}</b>
      </label>
      <input id={'cam-' + id} type="range" className="slider" min={min} max={max} step={step} value={value}
        onChange={(e) => store.setCam({ [id]: parseFloat(e.target.value) })} />
    </div>
  );
}

const KEYS: [string, string][] = [
  ['W', 'Adelante'], ['S', 'Atrás'], ['A', 'Izquierda'], ['D', 'Derecha'],
  ['Q', 'Bajar'], ['E', 'Subir'], ['Shift', 'Más rápido']
];

export function CameraDialog({ onClose }: { onClose: () => void }) {
  useStoreVersion();
  return (
    <Modal title="Cámara" onClose={onClose}>
      <p className="lead">Mueve la cámara con el teclado como en un juego. Los cambios se aplican al instante y se guardan.</p>
      <div className="keys">
        {KEYS.map(([k, t]) => (
          <div key={k} className="key"><kbd>{k}</kbd><span>{t}</span></div>
        ))}
      </div>
      <p className="note">Con el mouse: arrastra el fondo para girar, rueda para acercar, clic derecho para desplazar.</p>
      <Slider id="move" label="Velocidad con teclado" min={20} max={400} step={10} unit=" cm/s" />
      <Slider id="rotate" label="Sensibilidad del giro (mouse)" min={0.2} max={3} step={0.1} unit="×" />
      <Slider id="zoom" label="Sensibilidad del zoom (rueda)" min={0.2} max={3} step={0.1} unit="×" />
      <div className="foot">
        <button className="btn" onClick={() => store.setCam({ ...DEFAULT_CAMERA })}>Restablecer</button>
        <button className="btn primary" onClick={onClose}>Listo</button>
      </div>
    </Modal>
  );
}
