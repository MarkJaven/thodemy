import type { ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  topAligned?: boolean;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-[95vw]",
};

const Modal = ({
  isOpen,
  title,
  description,
  onClose,
  children,
  footer,
  size = "md",
  topAligned = false,
}: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm ${
        topAligned ? "pt-4 pb-8" : "flex items-center justify-center"
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`${topAligned ? "mx-auto" : ""} w-full ${sizeClasses[size]} ${
          topAligned ? "max-h-[calc(100vh-3rem)]" : "max-h-[90vh]"
        } flex flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-[#1c1436]/98 via-[#17122b]/98 to-[#0c0b14]/98 shadow-2xl shadow-purple-900/20 ${
          topAligned ? "mx-4 sm:mx-auto" : ""
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-indigo-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-indigo-400/80">
                    Course Builder
                  </p>
                  <h3 id="modal-title" className="font-display text-xl text-white">
                    {title}
                  </h3>
                </div>
              </div>
              {description && (
                <p className="mt-3 text-sm text-slate-400">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close modal"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-white/10 px-6 py-4 sm:px-8">
            <div className="flex items-center justify-end gap-3">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
