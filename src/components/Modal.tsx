import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

interface ModalProps {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  wide?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}

/** Ventana sobre la página. Se cierra con Escape, con la X o al hacer clic fuera. */
export function Modal({ title, subtitle, onClose, wide, footer, children }: ModalProps) {
  const sheet = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    sheet.current?.querySelector<HTMLElement>('.sheet-body input, .sheet-body select, .sheet-body button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'sheet' + (wide ? ' big' : '')} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={sheet}>
        <div className="sheet-head">
          <div>
            <h3 id={titleId}>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" aria-label="Cerrar" title="Cerrar (Esc)" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
