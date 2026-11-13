import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}

/** Ventana sobre la página. Se cierra con Escape o al hacer clic fuera. */
export function Modal({ title, onClose, wide, children }: ModalProps) {
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sheet.current?.querySelector<HTMLElement>('select, input, button')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const titleId = 'modal-' + title.replace(/\s+/g, '-').toLowerCase();
  return (
    <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'sheet' + (wide ? ' big' : '')} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={sheet}>
        <h3 id={titleId}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
