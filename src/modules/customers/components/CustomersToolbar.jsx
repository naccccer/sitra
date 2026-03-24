import { Button, Input } from '@/components/shared/ui'

export const CustomersToolbar = ({
  q,
  onQueryChange,
  onCreateCustomer,
  canWriteCustomers,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2" dir="rtl">
      {canWriteCustomers ? (
        <Button onClick={onCreateCustomer} variant="success" className="h-9 px-4">
          + مشتری جدید
        </Button>
      ) : null}
      <div className="w-full sm:w-[280px]">
        <Input value={q} onChange={(event) => onQueryChange(event.target.value)} placeholder="جستجو در مشتری، پروژه، شماره..." />
      </div>
    </div>
  </div>
)
