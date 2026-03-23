import { Button, Input, Select } from '@/components/shared/ui'
import {
  ACTIVE_FILTER_OPTIONS,
  CUSTOMER_TYPE_FILTER_OPTIONS,
  DUE_FILTER_OPTIONS,
  PAGE_SIZE_OPTIONS,
} from '../utils/customersView'

export const CustomersToolbar = ({
  q,
  onQueryChange,
  isActive,
  onIsActiveChange,
  customerType,
  onCustomerTypeChange,
  hasDue,
  onHasDueChange,
  pageSize,
  onPageSizeChange,
  total,
  onCreateCustomer,
  canWriteCustomers,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <div className="flex-1 space-y-1">
        <div className="text-sm font-black text-slate-900">جستجو و فیلتر مشتریان</div>
        <div className="text-xs font-bold text-slate-500">
          با نام، کد، تلفن، پروژه یا شماره تماس جستجو کنید.
        </div>
      </div>
      {canWriteCustomers ? (
        <Button onClick={onCreateCustomer} variant="primary">
          + مشتری جدید
        </Button>
      ) : null}
    </div>
    <div className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-5">
      <Input value={q} onChange={(event) => onQueryChange(event.target.value)} placeholder="جستجو در مشتری، پروژه، شماره..." />
      <Select value={isActive} onChange={(event) => onIsActiveChange(event.target.value)}>
        {ACTIVE_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Select value={customerType} onChange={(event) => onCustomerTypeChange(event.target.value)}>
        {CUSTOMER_TYPE_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Select value={hasDue} onChange={(event) => onHasDueChange(event.target.value)}>
        {DUE_FILTER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
      <Select value={String(pageSize)} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
        {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} ردیف</option>)}
      </Select>
    </div>
    <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
      <span>تعداد نتایج: {total}</span>
      <span>نمایش جدول در حالت اولویت‌دار</span>
    </div>
  </div>
)

