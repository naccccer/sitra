import { useMemo, useState } from 'react'
import { Button, ModalShell } from '@/components/shared/ui'
import { PriceInput } from '@/components/shared/PriceInput'
import { toPN } from '@/utils/helpers'
import { calculatePayslipTotals, formatMoney } from './payrollMath'
import {
  calculateCatalogTotals,
  isComputedCatalogItem,
  resolveCatalogDisplayValue,
  resolveInputValueFromPayslip,
  splitCatalogByType,
} from './payrollCatalog'
import { PayrollSurfaceCard } from './PayrollSurfaceCard'
function updateDraftInput(draft, source, value) {
  return { ...draft, [source]: value, inputs: { ...(draft.inputs || {}), [source]: value } }
}
function resolveSaveErrorMessage(error) {
  if (typeof error?.message === 'string' && error.message.trim()) return error.message
  return 'ذخیره فیش انجام نشد. دوباره تلاش کنید.'
}
export function PayslipEditorModal({ busy, catalog = [], employees = [], onClose, onSave, payslip, run }) {
  const [draft, setDraft] = useState(() => payslip)
  const [errorMsg, setErrorMsg] = useState('')
  const employeeList = useMemo(() => (Array.isArray(employees) ? employees : []), [employees])
  const employeeMap = useMemo(() => new Map(employeeList.map((employee) => [String(employee.id ?? ''), employee])), [employeeList])
  const employeeOptions = useMemo(
    () => employeeList.map((employee) => ({
      id: String(employee.id ?? ''),
      label: formatEmployeeOption(employee),
      fullName: String(employee.fullName || employee.name || ''),
      employeeCode: resolveEmployeeCode(employee),
      department: String(employee.department || ''),
    })),
    [employeeList],
  )
  const employeeOptionMap = useMemo(() => new Map(employeeOptions.map((employee) => [employee.label, employee])), [employeeOptions])
  const selectedEmployee = useMemo(() => employeeMap.get(String(draft?.employeeId ?? '')) || null, [draft?.employeeId, employeeMap])
  const totals = useMemo(() => {
    const fallback = calculatePayslipTotals(draft ?? payslip)
    const catalogTotals = calculateCatalogTotals(draft ?? payslip, catalog)
    return catalogTotals.gross === 0 && catalogTotals.deductions === 0 ? fallback : catalogTotals
  }, [catalog, draft, payslip])
  const scopedCatalog = useMemo(() => splitCatalogByType(catalog), [catalog])
  const matrixSections = useMemo(() => ([
    { title: 'کارکرد و اطلاعات', items: [...scopedCatalog.info, ...scopedCatalog.work] },
    { title: 'دریافتی‌ها', items: scopedCatalog.earning },
    { title: 'کسورات', items: scopedCatalog.deduction },
  ]), [scopedCatalog])
  if (!payslip) return null

  const employeeName = selectedEmployee?.fullName || selectedEmployee?.name || draft?.employeeName || payslip?.employeeName || ''
  const employeeCode = resolveEmployeeCode(selectedEmployee) || draft?.employeeCode || payslip?.employeeCode || ''
  const employeeDisplayValue = selectedEmployee
    ? formatEmployeeOption(selectedEmployee)
    : formatEmployeeOption({ fullName: draft?.employeeName, employeeCode: draft?.employeeCode })
  const handleEmployeeChange = (event) => {
    const nextValue = String(event.target.value || '')
    const matchedEmployee = employeeOptionMap.get(nextValue) || null
    setErrorMsg('')
    if (!matchedEmployee) {
      setDraft((current) => ({ ...current, employeeId: '', employeeName: nextValue, employeeCode: '', department: '' }))
      return
    }
    setDraft((current) => ({
      ...current,
      employeeId: matchedEmployee.id,
      employeeName: matchedEmployee.fullName,
      employeeCode: matchedEmployee.employeeCode,
      department: matchedEmployee.department,
    }))
  }
  const handleSave = async () => {
    const employeeId = String(draft?.employeeId || '').trim()
    const employee = employeeMap.get(employeeId) || null
    if (!employeeId) {
      setErrorMsg('یک پرسنل معتبر انتخاب کنید.')
      return
    }
    setErrorMsg('')
    try {
      await onSave({
        ...draft,
        employeeId,
        employeeName: employee?.fullName || employee?.name || draft?.employeeName || '',
        employeeCode: resolveEmployeeCode(employee) || draft?.employeeCode || '',
        department: employee?.department || draft?.department || '',
      })
    } catch (saveError) {
      setErrorMsg(resolveSaveErrorMessage(saveError))
    }
  }
  return (
    <ModalShell
      isOpen={Boolean(payslip)}
      onClose={onClose}
      title={`فیش حقوق ${employeeName || 'بدون نام'} ${employeeCode ? `(${toPN(employeeCode)})` : ''}`}
      description={`دوره ${run?.title || run?.periodKey || '-'}`}
      maxWidthClass="max-w-[92vw] 2xl:max-w-[1320px]"
      closeButtonMode="icon"
      footer={(
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-bold text-slate-500">
            خالص پرداختی: <span className="font-black text-slate-900">{formatMoney(totals.net)}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>انصراف</Button>
            <Button size="sm" variant="primary" disabled={busy} onClick={handleSave}>{busy ? 'در حال ذخیره...' : 'ذخیره فیش'}</Button>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="grid gap-2 xl:grid-cols-[1.05fr_0.95fr]">
          <PayrollSurfaceCard className="border-slate-900 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]" density="compact">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="mt-1 text-lg font-black leading-tight">{employeeName || 'بدون نام'}</div>
                <div className="mt-1 text-xs font-bold text-white/70">
                  {employeeCode ? `کد پرسنلی ${toPN(employeeCode)}` : 'کد پرسنلی ثبت نشده'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-end">
                <div className="text-[10px] font-bold text-white/55">دوره</div>
                <div className="mt-1 text-sm font-black text-white">{run?.title || run?.periodKey || '-'}</div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <HeroStat label="جمع دریافتی" value={formatMoney(totals.gross)} />
              <HeroStat label="جمع کسورات" value={formatMoney(totals.deductions)} />
              <HeroStat label="خالص پرداختی" value={formatMoney(totals.net)} emphasized />
            </div>
          </PayrollSurfaceCard>

          <PayrollSurfaceCard className="border-slate-200 bg-slate-50/80 shadow-[0_12px_34px_rgba(15,23,42,0.05)]" density="compact">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-black text-slate-900">انتخاب پرسنل</div>
                <div className="text-xs font-bold text-slate-500">نام یا کد را انتخاب کنید.</div>
              </div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                {employeeOptions.length} پرسنل
              </div>
            </div>

            <label className="mt-3 block space-y-1.5">
              <span className="block text-xs font-black text-slate-600">پرسنل</span>
              <div className="flex gap-2">
                <input
                  list="payslip-editor-employee-options"
                  value={employeeDisplayValue}
                  onFocus={() => {
                    if (!selectedEmployee) return
                    setErrorMsg('')
                    setDraft((current) => ({
                      ...current,
                      employeeId: '',
                      employeeName: '',
                      employeeCode: '',
                      department: '',
                    }))
                  }}
                  onChange={handleEmployeeChange}
                  placeholder="پرسنل را انتخاب کنید"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 outline-none transition focus:border-slate-400"
                />
              </div>
              <datalist id="payslip-editor-employee-options">
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.label} />
                ))}
              </datalist>
            </label>
          </PayrollSurfaceCard>
        </div>
        {errorMsg ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700">{errorMsg}</div> : null}

        <ItemMatrixTable
          sections={matrixSections}
          payslip={draft}
          onChange={(source, value) => setDraft((current) => updateDraftInput(current, source, value))}
        />

      </div>
    </ModalShell>
  )
}

function ItemMatrixTable({ sections = [], onChange, payslip }) {
  const visibleSections = sections.filter((section) => Array.isArray(section.items) && section.items.length > 0)
  const allItems = visibleSections.flatMap((section) => section.items || [])
  if (visibleSections.length === 0) return null

  return (
    <PayrollSurfaceCard className="border-slate-200 bg-white p-3 shadow-[0_14px_36px_rgba(15,23,42,0.07)]">
      <div className="grid gap-3 xl:grid-cols-3">
        {visibleSections.map((section, index) => {
          const tone = resolveSectionTone(section.title, index)
          return (
            <section key={section.title} className={`rounded-[24px] border ${tone.shell} bg-white p-1.5 shadow-[0_4px_20px_rgba(15,23,42,0.04)]`}>
              <div className={`flex items-start justify-between gap-2 rounded-[18px] px-4 py-3 ${tone.head}`}>
                <div>
                  <div className="text-sm font-black">{section.title}</div>
                  <div className={`mt-1 text-[11px] font-bold ${tone.headHint}`}>{section.items.length} آیتم</div>
                </div>
                <div className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black text-white/75">ویرایش</div>
              </div>

              <div className="grid gap-2 p-3 sm:grid-cols-2">
                {section.items.map((item) => {
                  const source = String(item.source || item.key)
                  return (
                    <div key={item.key} className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-2">
                      <div className="text-center text-[10px] font-bold text-slate-600">{item.label}</div>
                      {isComputedCatalogItem(item) ? (
                        <div className="mt-1.5 flex h-11 flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-2 text-center">
                          <div className="text-sm font-black leading-none text-emerald-900">{formatMoney(resolveCatalogDisplayValue(payslip, allItems, item))}</div>
                          <div className="mt-0.5 text-[9px] font-bold text-emerald-700">محاسبه خودکار</div>
                        </div>
                      ) : (
                        <div className="mt-1.5 h-11 rounded-xl border border-slate-200 bg-white px-2">
                          <PriceInput
                            value={resolveInputValueFromPayslip(payslip, item)}
                            onChange={(value) => onChange(source, Number(value || 0))}
                            className="py-0 text-sm"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </PayrollSurfaceCard>
  )
}

function resolveSectionTone(title, index) {
  const text = String(title || '')
  if (text.includes('کسورات')) {
    return { shell: 'border-rose-200', head: 'bg-rose-950 text-white', headHint: 'text-white/70' }
  }
  if (text.includes('دریافتی')) {
    return { shell: 'border-emerald-200', head: 'bg-emerald-950 text-white', headHint: 'text-white/70' }
  }
  return index % 2 === 0
    ? { shell: 'border-slate-200', head: 'bg-slate-950 text-white', headHint: 'text-white/70' }
    : { shell: 'border-sky-200', head: 'bg-sky-950 text-white', headHint: 'text-white/70' }
}

function HeroStat({ emphasized = false, label, value }) {
  return (
    <div className={`rounded-2xl border px-3 py-3 ${emphasized ? 'border-white/10 bg-white/10' : 'border-white/10 bg-white/5'}`}>
      <div className={`text-[10px] font-bold ${emphasized ? 'text-white/60' : 'text-white/55'}`}>{label}</div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  )
}

function resolveEmployeeCode(employee = {}) {
  return String(employee?.employeeCode || employee?.code || employee?.personnelNo || '').trim()
}

function formatEmployeeOption(employee = {}) {
  const employeeName = String(employee?.fullName || employee?.name || '').trim()
  const employeeCode = resolveEmployeeCode(employee)
  if (!employeeName) return ''
  return employeeCode ? `${employeeName} (${toPN(employeeCode)})` : employeeName
}
