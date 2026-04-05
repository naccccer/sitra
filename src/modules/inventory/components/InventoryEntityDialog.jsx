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
    contentClassName="!rounded-[32px] border border-white/75 bg-[rgb(var(--ui-surface))]"
    headerClassName="rounded-t-[32px] !border-white/10 !bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] [&>div]:!items-center [&_h3]:!text-white [&_h3]:leading-none [&_p]:!text-white/75 [&_button]:!text-white [&_button]:hover:!bg-white/10"
    bodyClassName="space-y-4 bg-[linear-gradient(180deg,rgba(247,247,248,0.88),rgba(243,243,245,0.96))] p-4 sm:p-5 [&_label]:text-[12px] [&_label]:font-black [&_label]:text-slate-600 [&_input]:h-11 [&_input]:rounded-xl [&_input]:border-slate-200 [&_input]:bg-white/90 [&_input]:px-3 [&_input]:text-sm [&_select]:h-11 [&_select]:rounded-xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white/90 [&_select]:px-3 [&_select]:text-sm"
    footerClassName="rounded-b-[32px] border-white/80 bg-white/90 px-4 py-3"
    footer={(
      <div className="flex items-center justify-start gap-2" dir="ltr">
        <Button type="submit" form="inventory-entity-form" action="save" showActionIcon disabled={saving} className="!rounded-[18px] !bg-emerald-600 !text-white hover:!bg-emerald-700">
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
