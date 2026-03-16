import React, { useCallback, useEffect, useMemo, useState } from 'react'
import DateObject from 'react-date-object'
import persian from 'react-date-object/calendars/persian'
import gregorian from 'react-date-object/calendars/gregorian'
import persianFa from 'react-date-object/locales/persian_fa'
import gregorianEn from 'react-date-object/locales/gregorian_en'
import DatePicker from 'react-multi-date-picker'
import TimePicker from 'react-multi-date-picker/plugins/time_picker'
import { Eye, Loader2, RotateCcw, Search } from 'lucide-react'
import { ModalShell } from '@/components/shared/ui'
import { toPN } from '../../utils/helpers'
import { auditLogsApi } from '../services/auditLogsApi'

const PAGE_SIZE = 25

// ممیزی فعالیت ها
const INITIAL_FILTERS = {
  from: null,
  to: null,
  eventType: '',
  actor: '',
}

const AUDIT_EVENT_LABELS = {
  'auth.login.success': 'ورود موفق کاربر',
  'auth.login.failed': 'ورود ناموفق',
  'auth.login.rate_limited': 'مسدودسازی موقت تلاش های ورود',
  'auth.logout.success': 'خروج کاربر',
  'users_access.role_permissions.updated': 'به روزرسانی دسترسی نقش ها',
  'users_access.user.created': 'ایجاد کاربر',
  'users_access.user.updated': 'ویرایش کاربر',
  'users_access.user.activation.changed': 'تغییر وضعیت فعال بودن کاربر',
  'master_data.catalog.updated': 'به روزرسانی لیست قیمت',
  'master_data.profile.updated': 'به روزرسانی پروفایل کسب و کار',
  'sales.order.created': 'ثبت سفارش توسط کاربر داخلی',
  'sales.order.updated': 'ویرایش سفارش',
  'sales.order.status.changed': 'تغییر وضعیت سفارش',
  'sales.order.deleted': 'حذف سفارش بایگانی شده',
  'customers.customer.created': 'ایجاد مشتری',
  'customers.customer.updated': 'ویرایش مشتری',
  'customers.customer.active.changed': 'تغییر وضعیت مشتری',
  'customers.project.created': 'ایجاد پروژه مشتری',
  'customers.project.updated': 'ویرایش/انتقال پروژه مشتری',
  'customers.project.active.changed': 'تغییر وضعیت پروژه مشتری',
  'customers.project_contact.created': 'ایجاد شماره پروژه',
  'customers.project_contact.updated': 'ویرایش شماره پروژه',
  'customers.project_contact.active.changed': 'تغییر وضعیت شماره پروژه',
  'kernel.module_registry.updated': 'تغییر وضعیت ماژول',
}

const ENTITY_LABELS = {
  session: 'نشست کاربری',
  users: 'کاربر',
  orders: 'سفارش',
  system_settings: 'تنظیمات سیستم',
  module_registry: 'رجیستری ماژول ها',
  customers: 'مشتری',
  customer_projects: 'پروژه مشتری',
  customer_project_contacts: 'شماره پروژه',
}

const ROLE_LABELS = {
  admin: 'ادمین',
  manager: 'مدیر',
  sales: 'فروش',
}

const toAuditEventLabel = (eventType) => AUDIT_EVENT_LABELS[String(eventType || '').trim()] || 'رویداد سیستمی'

const toEntityLabel = (entityType) => {
  const key = String(entityType || '').trim()
  if (!key) return 'نامشخص'
  return ENTITY_LABELS[key] || key
}

const toRoleLabel = (role) => {
  const key = String(role || '').trim()
  if (!key) return '-'
  return ROLE_LABELS[key] || key
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return toPN(date.toLocaleString('fa-IR'))
}

const toApiDateTime = (value) => {
  if (!value) return ''

  try {
    const jalaliDate = new DateObject({
      date: value,
      calendar: persian,
      locale: persianFa,
      format: 'YYYY/MM/DD HH:mm',
    })

    if (!jalaliDate.isValid) return ''

    const gregorianDate = new DateObject(jalaliDate).convert(gregorian, gregorianEn)
    return gregorianDate.format('YYYY-MM-DD HH:mm:00')
  } catch {
    return ''
  }
}

const DateTimeFilterField = ({ label, value, onChange }) => (
  <div>
    <label className="mb-1 block text-[10px] font-black text-slate-600">{label}</label>
    <DatePicker
      value={value || ''}
      onChange={(nextValue) => onChange(nextValue || null)}
      calendar={persian}
      locale={persianFa}
      calendarPosition="bottom-right"
      format="YYYY/MM/DD HH:mm"
      editable={false}
      inputClass="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
      placeholder="انتخاب تاریخ و ساعت"
      plugins={[
        <TimePicker key="time-picker" position="bottom" hideSeconds />,
      ]}
    />
  </div>
)

export const AuditLogsPage = () => {
  const [filters, setFilters] = useState(INITIAL_FILTERS)
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState([])
  const [eventTypes, setEventTypes] = useState([])
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedLogId, setSelectedLogId] = useState('')

  const selectedLog = useMemo(
    () => logs.find((log) => String(log.id) === String(selectedLogId)) || null,
    [logs, selectedLogId],
  )

  const actorSuggestions = useMemo(() => {
    const unique = new Map()

    const pushSuggestion = (username, userId, role) => {
      const normalizedUsername = String(username || '').trim()
      if (normalizedUsername === '') return

      const key = normalizedUsername.toLowerCase()
      if (unique.has(key)) return

      const normalizedUserId = String(userId || '').trim()
      const normalizedRole = toRoleLabel(role)
      const hintParts = []
      if (normalizedRole !== '-') hintParts.push(normalizedRole)
      if (normalizedUserId !== '') hintParts.push(`#${toPN(normalizedUserId)}`)

      unique.set(key, {
        value: normalizedUsername,
        hint: hintParts.join(' | '),
      })
    }

    users.forEach((user) => {
      pushSuggestion(user?.username, user?.id, user?.role)
    })
    logs.forEach((log) => {
      pushSuggestion(log?.actor?.username, log?.actor?.userId, log?.actor?.role)
    })

    return Array.from(unique.values()).sort((a, b) => a.value.localeCompare(b.value, 'fa'))
  }, [logs, users])

  const loadLogs = useCallback(async ({ page = 1, nextFilters = INITIAL_FILTERS } = {}) => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const response = await auditLogsApi.fetchAuditLogs({
        page,
        pageSize: PAGE_SIZE,
        from: toApiDateTime(nextFilters.from),
        to: toApiDateTime(nextFilters.to),
        eventType: nextFilters.eventType,
        actor: nextFilters.actor,
      })

      setLogs(Array.isArray(response?.logs) ? response.logs : [])
      setEventTypes(Array.isArray(response?.eventTypes) ? response.eventTypes : [])
      setPagination({
        page: Number(response?.pagination?.page || page),
        pageSize: Number(response?.pagination?.pageSize || PAGE_SIZE),
        total: Number(response?.pagination?.total || 0),
        totalPages: Math.max(1, Number(response?.pagination?.totalPages || 1)),
      })
      setSelectedLogId('')
    } catch (error) {
      setErrorMsg(error?.message || 'دریافت لاگ ها ناموفق بود.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs({ page: 1, nextFilters: INITIAL_FILTERS })
  }, [loadLogs])

  useEffect(() => {
    let ignore = false

    const loadUsers = async () => {
      try {
        const response = await auditLogsApi.fetchUsers()
        if (ignore) return
        setUsers(Array.isArray(response?.users) ? response.users : [])
      } catch {
        if (!ignore) {
          setUsers([])
        }
      }
    }

    loadUsers()

    return () => {
      ignore = true
    }
  }, [])

  const handleSearch = async (event) => {
    event.preventDefault()
    await loadLogs({ page: 1, nextFilters: filters })
  }

  const handleReset = async () => {
    setFilters(INITIAL_FILTERS)
    await loadLogs({ page: 1, nextFilters: INITIAL_FILTERS })
  }

  const handlePrevPage = async () => {
    if (pagination.page <= 1 || isLoading) return
    await loadLogs({ page: pagination.page - 1, nextFilters: filters })
  }

  const handleNextPage = async () => {
    if (pagination.page >= pagination.totalPages || isLoading) return
    await loadLogs({ page: pagination.page + 1, nextFilters: filters })
  }

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="overflow-x-auto hide-scrollbar">
          <form onSubmit={handleSearch} className="flex min-w-[1040px] items-end gap-2.5">
            <div className="w-[220px]">
              <DateTimeFilterField
                label="از تاریخ و ساعت"
                value={filters.from}
                onChange={(nextValue) => setFilters((prev) => ({ ...prev, from: nextValue }))}
              />
            </div>
            <div className="w-[220px]">
              <DateTimeFilterField
                label="تا تاریخ و ساعت"
                value={filters.to}
                onChange={(nextValue) => setFilters((prev) => ({ ...prev, to: nextValue }))}
              />
            </div>
            <div className="w-[180px]">
              <label className="mb-1 block text-[10px] font-black text-slate-600">نوع رویداد</label>
              <select
                value={filters.eventType}
                onChange={(e) => setFilters((prev) => ({ ...prev, eventType: e.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
              >
                <option value="">همه رویدادها</option>
                {eventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>{toAuditEventLabel(eventType)}</option>
                ))}
              </select>
            </div>
            <div className="w-[180px]">
              <label className="mb-1 block text-[10px] font-black text-slate-600">کاربر</label>
              <input
                type="text"
                value={filters.actor}
                onChange={(e) => setFilters((prev) => ({ ...prev, actor: e.target.value }))}
                placeholder="کاربر"
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
                dir="ltr"
                list="audit-actor-suggestions"
              />
              <datalist id="audit-actor-suggestions">
                {actorSuggestions.map((actor) => (
                  <option key={actor.value} value={actor.value}>{actor.hint}</option>
                ))}
              </datalist>
            </div>
            <div className="flex shrink-0 items-end gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-black whitespace-nowrap ${isLoading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                جستجو
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-black whitespace-nowrap ${isLoading ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <RotateCcw size={14} />
                بازنشانی کامل
              </button>
            </div>
          </form>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-2 text-right font-black">زمان</th>
                <th className="p-2 text-right font-black">رویداد</th>
                <th className="p-2 text-right font-black">کاربر</th>
                <th className="p-2 text-right font-black">موجودیت</th>
                <th className="p-2 text-center font-black">جزئیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center font-bold text-slate-400">لاگی پیدا نشد.</td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-2 font-bold text-slate-600">{formatDateTime(log.createdAt)}</td>
                  <td className="p-2 font-black text-slate-800">{toAuditEventLabel(log.eventType)}</td>
                  <td className="p-2 font-bold text-slate-700">
                    {log?.actor?.username || '-'}
                    <div className="mt-1 text-[10px] font-mono text-slate-500">
                      {toRoleLabel(log?.actor?.role)} / {log?.actor?.userId || '-'}
                    </div>
                  </td>
                  <td className="p-2 text-slate-700">
                    <div className="font-bold">{toEntityLabel(log.entityType)}</div>
                    <div className="mt-1 text-[10px] font-mono text-slate-500">{log.entityId || '-'}</div>
                  </td>
                  <td className="p-2 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedLogId(String(log.id))}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-700 hover:bg-slate-100"
                    >
                      <Eye size={12} />
                      مشاهده
                    </button>
                  </td>
                </tr>
              ))}
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center">
                    <div className="inline-flex items-center gap-2 text-xs font-black text-slate-500">
                      <Loader2 size={14} className="animate-spin" />
                      در حال بارگذاری...
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
          <div className="text-xs font-bold text-slate-500">
            صفحه {toPN(pagination.page)} از {toPN(pagination.totalPages)} | مجموع: {toPN(pagination.total)}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={isLoading || pagination.page <= 1}
              className={`h-8 rounded-lg px-3 text-[11px] font-black ${isLoading || pagination.page <= 1 ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              قبلی
            </button>
            <button
              type="button"
              onClick={handleNextPage}
              disabled={isLoading || pagination.page >= pagination.totalPages}
              className={`h-8 rounded-lg px-3 text-[11px] font-black ${isLoading || pagination.page >= pagination.totalPages ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              بعدی
            </button>
          </div>
        </div>
      </div>

      <ModalShell
        isOpen={Boolean(selectedLog)}
        title={selectedLog ? `جزئیات رویداد #${toPN(selectedLog.id)}` : ''}
        description="نمایش کامل داده‌های ثبت‌شده این رویداد"
        onClose={() => setSelectedLogId('')}
        maxWidthClass="max-w-4xl"
      >
        <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11px] font-mono leading-6 text-slate-700" dir="ltr">
          {JSON.stringify(selectedLog?.payload ?? {}, null, 2)}
        </pre>
      </ModalShell>
    </div>
  )
}
