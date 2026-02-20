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
  return (
    <Modal
      isOpen={isOpen}
      title={title}
      description={description}
      variant={variant}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-ink-900 transition hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-slate-300">Please confirm to continue.</div>
    </Modal>
  );
};

export default ConfirmationModal;
