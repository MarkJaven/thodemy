import type { ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

const Modal = ({ isOpen, title, description, onClose, children, footer }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-ink-800/95 p-6 shadow-glow">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Admin action</p>
            <h3 id="modal-title" className="mt-2 font-display text-xl text-white">
              {title}
            </h3>
            {description && <p className="mt-2 text-sm text-slate-300">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white"
            aria-label="Close modal"
          >
            Close
          </button>
        </div>
        <div className="mt-6">{children}</div>
        {footer && <div className="mt-6 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
