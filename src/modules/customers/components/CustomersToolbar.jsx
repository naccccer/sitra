import { Button, Input } from '@/components/shared/ui'

export const CustomersToolbar = ({
  q,
  onQueryChange,
  onCreateCustomer,
  canWriteCustomers,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
      <div className="order-1 w-full sm:order-1 sm:w-[300px]">
        <Input value={q} onChange={(event) => onQueryChange(event.target.value)} placeholder="جستجو در مشتری، پروژه، شماره..." />
      </div>
      {canWriteCustomers ? (
        <Button onClick={onCreateCustomer} variant="success" className="order-2 h-9 px-4 sm:ms-auto">
          + مشتری جدید
        </Button>
      ) : null}
    </div>
  </div>
)
