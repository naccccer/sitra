import { useCallback, useEffect, useState } from 'react'
import {
  Badge,
  Button,
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
  FilterRow,
  IconButton,
  InlineAlert,
  Input,
  PaginationBar,
  Select,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const STATUS_MAP = {
  draft: { label: 'پیش نویس', cls: 'bg-slate-100 text-slate-600' },
  submitted: { label: 'ارسال شده', cls: 'bg-blue-100 text-blue-700' },
  approved: { label: 'تایید شده', cls: 'bg-emerald-100 text-emerald-700' },
  posted: { label: 'ثبت شده', cls: 'bg-purple-100 text-purple-700' },
  cancelled: { label: 'لغو شده', cls: 'bg-red-100 text-red-600' },
}

const TYPE_LABELS = {
  receipt: 'رسید',
  delivery: 'حواله',
  transfer: 'انتقال',
  production_move: 'تولید',
  production_consume: 'مصرف تولید',
  production_output: 'خروجی تولید',
  adjustment: 'تعدیل',
  count: 'شمارش',
}

const PAGE_SIZE = 20
const PAGE_SIZE_OPTIONS = [20]
const formatDateToken = (value) => {
  const raw = String(value ?? '').trim()
  return raw ? toPN(raw.replaceAll('-', '/')) : '-'
}

export const OperationsPanel = ({ operationType, session, onNew }) => {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [acting, setActing] = useState(null)

  const role = session?.user?.role || session?.role
  const isManager = role === 'admin' || role === 'manager'

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await inventoryApi.fetchV2Operations({
        type: operationType,
        status: statusFilter,
        q,
        page,
        pageSize: PAGE_SIZE,
      })
      setRows(Array.isArray(response?.operations) ? response.operations : [])
      setTotal(Number(response?.total) || 0)
    } catch {
      setError('خطا در بارگذاری داده ها')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [operationType, page, q, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const handleAction = async (id, action) => {
    if (action === 'cancel' && !window.confirm('آیا از لغو این عملیات مطمئن هستید؟')) {
      return
    }

    setActing(id)
    try {
      await inventoryApi.operationAction({ id, action })
      await load()
    } catch (err) {
      window.alert(err?.message || 'خطا در اجرای عملیات')
    } finally {
      setActing(null)
    }
  }

  const getActions = (operation) => {
    const actions = []
    if (operation.status === 'draft') actions.push({ label: 'ارسال', action: 'submit', variant: 'secondary' })
    if (operation.status === 'submitted' && isManager) actions.push({ label: 'تایید', action: 'approve', variant: 'secondary' })
    if (operation.status === 'approved' && isManager) actions.push({ label: 'ثبت', action: 'post', variant: 'primary' })
    if (!['posted', 'cancelled'].includes(operation.status) && isManager) {
      actions.push({ label: 'لغو', action: 'cancel', variant: 'danger' })
    }
    return actions
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-4" dir="rtl">
      <WorkspaceToolbar
        actions={<Button action="create" showActionIcon size="sm" onClick={onNew}>عملیات جدید</Button>}
        summary={<Badge tone="neutral">نتیجه: {toPN(total)}</Badge>}
      >
        <FilterRow className="justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(event) => {
                setQ(event.target.value)
                setPage(1)
              }}
              placeholder="جستجو در شماره عملیات یا کد مرجع"
              size="sm"
              className="sm:w-64"
            />
            <Select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              size="sm"
              className="sm:w-44"
            >
              <option value="">همه وضعیت ها</option>
              {Object.entries(STATUS_MAP).map(([value, status]) => (
                <option key={value} value={value}>{status.label}</option>
              ))}
            </Select>
          </div>
          <IconButton action="reload" label="بارگذاری مجدد" tooltip="بارگذاری مجدد" onClick={() => void load()} loading={loading} disabled={loading} />
        </FilterRow>
      </WorkspaceToolbar>

      {error ? <InlineAlert tone="danger" title="خطا در بارگذاری عملیات">{error}</InlineAlert> : null}

      <DataTable
        minWidthClass="min-w-[1120px]"
        footer={rows.length > 0 ? (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalCount={total}
            pageSize={PAGE_SIZE}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={() => {}}
          />
        ) : null}
      >
        <DataTableHead>
          <tr>
            <DataTableHeaderCell>شماره عملیات</DataTableHeaderCell>
            <DataTableHeaderCell>نوع</DataTableHeaderCell>
            <DataTableHeaderCell>انبار مبدا</DataTableHeaderCell>
            <DataTableHeaderCell>انبار مقصد</DataTableHeaderCell>
            <DataTableHeaderCell>کد مرجع</DataTableHeaderCell>
            <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
            <DataTableHeaderCell align="center">تعداد خطوط</DataTableHeaderCell>
            <DataTableHeaderCell>تاریخ</DataTableHeaderCell>
            <DataTableHeaderCell align="center">اقدامات</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableState colSpan={9} state="loading" title="در حال بارگذاری عملیات" />
          ) : rows.length === 0 ? (
            <DataTableState colSpan={9} title="رکوردی یافت نشد" />
          ) : rows.map((operation) => {
            const status = STATUS_MAP[operation.status] ?? STATUS_MAP.draft
            const actions = getActions(operation)
            return (
              <DataTableRow key={operation.id}>
                <DataTableCell tone="emphasis" className="font-mono tabular-nums" dir="ltr">{toPN(operation.operationNo || '-')}</DataTableCell>
                <DataTableCell>{TYPE_LABELS[operation.operationType] ?? operation.operationType}</DataTableCell>
                <DataTableCell>{operation.sourceWarehouseName || '-'}</DataTableCell>
                <DataTableCell>{operation.targetWarehouseName || '-'}</DataTableCell>
                <DataTableCell className="tabular-nums text-[rgb(var(--ui-text-muted))]" dir="ltr">{toPN(operation.referenceCode || '-')}</DataTableCell>
                <DataTableCell align="center">
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${status.cls}`}>{status.label}</span>
                </DataTableCell>
                <DataTableCell align="center" className="tabular-nums">{toPN(operation.lineCount || 0)}</DataTableCell>
                <DataTableCell className="tabular-nums text-[rgb(var(--ui-text-muted))]" dir="ltr">{formatDateToken(operation.createdAt)}</DataTableCell>
                <DataTableCell align="center">
                  <DataTableActions>
                    {actions.map((actionItem) => (
                      <Button
                        key={actionItem.action}
                        size="xs"
                        variant={actionItem.variant}
                        surface="table"
                        disabled={acting === operation.id}
                        onClick={() => void handleAction(operation.id, actionItem.action)}
                      >
                        {actionItem.label}
                      </Button>
                    ))}
                  </DataTableActions>
                </DataTableCell>
              </DataTableRow>
            )
          })}
        </DataTableBody>
      </DataTable>
    </div>
  )
}
