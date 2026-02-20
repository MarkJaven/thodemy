import Modal from "./Modal";

type ConfirmationModalProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

const ConfirmationModal = ({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmationModalProps) => {
  const isDanger = variant === "danger";

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      variant={variant}
      size="md"
      onClose={onCancel}
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] shadow-lg transition ${
              isDanger
                ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-rose-500/25 hover:shadow-rose-500/40"
                : "bg-gradient-to-r from-[#7f5bff] via-[#6a3df0] to-[#4d24c4] text-white shadow-purple-500/25 hover:shadow-purple-500/40"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      {description && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-sm leading-relaxed text-slate-300">{description}</p>
        </div>
      )}
    </Modal>
  );
};

export default ConfirmationModal;
