import type { ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
type ModalVariant = "default" | "course" | "user" | "topic" | "quiz" | "form" | "danger";

type ModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  topAligned?: boolean;
  variant?: ModalVariant;
  icon?: ReactNode;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-[95vw]",
};

const variantConfig: Record<ModalVariant, { icon: ReactNode; label: string; iconBg: string; labelColor: string }> = {
  default: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6M9 12h6M9 15h4" />
      </svg>
    ),
    label: "Details",
    iconBg: "from-slate-500/20 to-slate-600/10",
    labelColor: "text-slate-400",
  },
  course: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    label: "Course Builder",
    iconBg: "from-indigo-500/20 to-purple-600/10",
    labelColor: "text-indigo-400/80",
  },
  user: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    label: "User Management",
    iconBg: "from-blue-500/20 to-cyan-600/10",
    labelColor: "text-blue-400/80",
  },
  topic: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    label: "Topic Editor",
    iconBg: "from-emerald-500/20 to-teal-600/10",
    labelColor: "text-emerald-400/80",
  },
  quiz: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    ),
    label: "Quiz Builder",
    iconBg: "from-amber-500/20 to-orange-600/10",
    labelColor: "text-amber-400/80",
  },
  form: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    label: "Form Builder",
    iconBg: "from-violet-500/20 to-purple-600/10",
    labelColor: "text-violet-400/80",
  },
  danger: {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    label: "Warning",
    iconBg: "from-rose-500/20 to-red-600/10",
    labelColor: "text-rose-400/80",
  },
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
  variant = "default",
  icon,
}: ModalProps) => {
  if (!isOpen) return null;

  const config = variantConfig[variant];
  const displayIcon = icon || config.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm animate-fade-in ${
        topAligned ? "pt-4 pb-8" : "flex items-center justify-center p-4"
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`${topAligned ? "mx-auto" : ""} w-full ${sizeClasses[size]} ${
          topAligned ? "max-h-[calc(100vh-3rem)]" : "max-h-[90vh]"
        } flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 shadow-2xl shadow-purple-900/20 animate-slide-up ${
          topAligned ? "mx-4 sm:mx-auto" : ""
        }`}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-white/10 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                {/* Icon Badge */}
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${config.iconBg} ring-1 ring-white/10 ${config.labelColor}`}>
                  {displayIcon}
                </div>

                {/* Title Area */}
                <div className="min-w-0 flex-1">
                  <p className={`text-2xs font-medium uppercase tracking-widest ${config.labelColor}`}>
                    {config.label}
                  </p>
                  <h3 id="modal-title" className="mt-0.5 font-display text-xl text-white truncate">
                    {title}
                  </h3>
                </div>
              </div>

              {description && (
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{description}</p>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:border-white/20"
              aria-label="Close modal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8 scrollbar-thin">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-white/10 bg-ink-850 px-6 py-4 sm:px-8">
            <div className="flex flex-wrap items-center justify-end gap-3">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
