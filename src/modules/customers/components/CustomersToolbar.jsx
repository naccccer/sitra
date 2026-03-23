import { Button, Input, Select } from '@/components/shared/ui'
import {
  PAGE_SIZE_OPTIONS,
} from '../utils/customersView'

export const CustomersToolbar = ({
  q,
  onQueryChange,
  pageSize,
  onPageSizeChange,
  total,
  onCreateCustomer,
  canWriteCustomers,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="text-sm font-black text-slate-900">جستجو و فیلتر مشتریان</div>
        <div className="text-xs font-bold text-slate-500">
          با نام، کد، تلفن، پروژه یا شماره تماس جستجو کنید.
        </div>
      </div>
      {canWriteCustomers ? (
        <Button onClick={onCreateCustomer} variant="primary" className="h-10 px-4">
          + مشتری جدید
        </Button>
      ) : null}
    </div>
    <div className="mt-4 overflow-x-auto hide-scrollbar">
      <div className="flex min-w-[720px] items-end gap-2.5">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-black text-slate-600">جستجو</label>
          <Input value={q} onChange={(event) => onQueryChange(event.target.value)} placeholder="جستجو در مشتری، پروژه، شماره..." />
        </div>
        <div className="w-[170px]">
          <label className="mb-1 block text-[10px] font-black text-slate-600">تعداد ردیف</label>
          <Select value={String(pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} ردیف</option>)}
          </Select>
        </div>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-1.5 text-xs font-bold text-slate-500">
      <span>تعداد نتایج: {total}</span>
      <span>نمایش در چینش بهینه برای خوانایی بیشتر</span>
    </div>
  </div>
)
