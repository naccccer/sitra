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
    overlayClassName="bg-slate-950/55 backdrop-blur-[6px]"
    contentClassName="!rounded-[28px] border border-white/75 bg-[rgb(var(--ui-surface))]"
    bodyClassName="space-y-4 rounded-b-[28px] bg-[linear-gradient(180deg,rgba(247,247,248,0.88),rgba(243,243,245,0.96))] p-4 sm:p-5 [&_label]:text-[12px] [&_label]:font-black [&_label]:text-slate-600 [&_input]:h-11 [&_input]:rounded-xl [&_input]:border-slate-200 [&_input]:bg-white/90 [&_input]:px-3 [&_input]:text-sm [&_select]:h-11 [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white/90 [&_select]:px-3 [&_select]:text-sm"
    footerClassName="border-white/80 bg-white/90 px-4 py-3"
    footer={(
      <div className="flex items-center justify-start gap-2" dir="ltr">
        <Button type="submit" form="inventory-entity-form" action="save" showActionIcon disabled={saving} className="!rounded-[18px]">
          {saving ? 'در حال ذخیره...' : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose} className="!rounded-[18px]">انصراف</Button>
      </div>
    )}
  >
    <form id="inventory-entity-form" onSubmit={onSubmit} className="space-y-4" dir="rtl">
      {children}
    </form>
  </ModalShell>
)
