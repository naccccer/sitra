import { Button, ModalShell } from '@/components/shared/ui'

export const InventoryEntityDialog = ({
  isOpen,
  title,
  onClose,
  onSubmit,
  saving = false,
  submitLabel = 'ذخیره',
  maxWidthClass = 'max-w-md',
  children,
}) => (
  <ModalShell
    isOpen={isOpen}
    title={title}
    onClose={onClose}
    closeButtonMode="icon"
    maxWidthClass={maxWidthClass}
    footer={(
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
        <Button type="submit" form="inventory-entity-form" action="save" showActionIcon disabled={saving}>
          {saving ? 'در حال ذخیره...' : submitLabel}
        </Button>
      </div>
    )}
  >
    <form id="inventory-entity-form" onSubmit={onSubmit} className="space-y-3" dir="rtl">
      {children}
    </form>
  </ModalShell>
)
