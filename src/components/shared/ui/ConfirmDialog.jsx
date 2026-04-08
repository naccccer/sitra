import React from 'react'
import { Button } from '@/components/shared/ui/Button';
import { ModalShell } from '@/components/shared/ui/ModalShell';

export const ConfirmDialog = ({
  isOpen = false,
  title = 'تأیید عملیات',
  description = '',
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  tone = 'danger',
  loading = false,
  onCancel = () => {},
  onConfirm = () => {},
}) => {
  const action = tone === 'danger' ? 'delete' : 'save'

  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      description={description}
      onClose={onCancel}
      closeButtonMode="icon"
      maxWidthClass="max-w-md"
      footer={(
        <div className="flex items-center justify-start gap-2" dir="ltr">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button type="button" action={action} onClick={onConfirm} disabled={loading} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      )}
    >
      <p className="text-sm font-bold text-[rgb(var(--ui-text-muted))]">این عملیات قابل بازگشت است. لطفاً ادامه را تأیید کنید.</p>
    </ModalShell>
  )
}
