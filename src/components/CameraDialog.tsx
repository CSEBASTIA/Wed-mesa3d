// Ventana "Cámara": sensibilidad del movimiento con teclado, del giro y del zoom.
import { DEFAULT_CAMERA } from '../core/store';
import { fmt } from '../core/format';
import type { CameraSettings } from '../core/types';
import { store, useStoreVersion } from '../app/context';
import { Modal } from './Modal';

interface SliderProps { id: keyof CameraSettings; label: string; min: number; max: number; step: number; unit: string }

function Slider({ id, label, min, max, step, unit }: SliderProps) {
  const value = store.cam[id];
  return (
    <div className="slider-row">
      <label htmlFor={'cam-' + id} className="slider-label">
        <span>{label}</span>
        <b className="num">{fmt(value)}{unit}</b>
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
    <Modal title="Cámara" onClose={onClose}
      subtitle="Muévete por la escena con el teclado como en un juego. Puedes probarlo con esta ventana abierta."
      footer={<>
        <button className="btn ghost" onClick={() => store.setCam({ ...DEFAULT_CAMERA })}>Restablecer</button>
        <button className="btn primary" onClick={onClose}>Listo</button>
      </>}>
      <div className="group">
        <h4>Teclado</h4>
        <div className="keys">
          {KEYS.map(([k, t]) => <div key={k} className="key"><kbd>{k}</kbd><span>{t}</span></div>)}
        </div>
      </div>
      <div className="group">
        <h4>Sensibilidad</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Slider id="move" label="Velocidad con teclado" min={20} max={400} step={10} unit=" cm/s" />
          <Slider id="rotate" label="Giro con el mouse" min={0.2} max={3} step={0.1} unit="×" />
          <Slider id="zoom" label="Zoom con la rueda" min={0.2} max={3} step={0.1} unit="×" />
        </div>
      </div>
      <p className="note">Con el mouse: arrastra el fondo para girar, usa la rueda para acercar y el clic derecho para desplazar.</p>
    </Modal>
  );
}
