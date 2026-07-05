import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'تأكيد العملية',
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-brand-textBody text-base leading-relaxed">{message}</p>
      <div className="flex items-center justify-end gap-3 mt-6">
        {/* Modal.jsx is always a white surface — btn-ghost (text-white/80 bg-white/5)
            is meant for dark backgrounds and is unreadable here, so it's overridden. */}
        <Button variant="ghost" onClick={onClose} disabled={loading} className="!bg-gray-100 !text-gray-600 hover:!bg-gray-200">
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'purple'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
