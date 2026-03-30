import { AlertTriangle } from 'lucide-react'
import { Button, ModalShell } from '@/components/shared/ui'

export function PayrollConfirmModal({
  body = '',
  cancelLabel = 'انصراف',
  confirmLabel = '',
  confirmVariant = 'danger',
  description = '',
  icon = AlertTriangle,
  isOpen,
  maxWidthClass = 'max-w-lg',
  onClose,
  onConfirm,
  title = '',
}) {
  const ConfirmIcon = icon || AlertTriangle

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      maxWidthClass={maxWidthClass}
      footer={(
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{cancelLabel}</Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            <ConfirmIcon className="h-4 w-4" />
            {confirmLabel}
          </Button>
        </div>
      )}
    >
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm">
          <ConfirmIcon className="h-4 w-4" />
        </div>
        <div className="text-sm font-bold leading-6 text-slate-700">{body}</div>
      </div>
    </ModalShell>
  )
}
