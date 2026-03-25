import { useMemo, useState } from 'react'
import { Badge, Button, Card, EmptyState, Input, ModalShell } from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { downloadHumanResourcesSampleWorkbook, parseHumanResourcesImportFile } from '../utils/humanResourcesImport'

function ImportSummary({ label, value, tone = 'neutral' }) {
  return (
    <Card padding="md" tone="muted" className="space-y-1">
      <div className="text-[11px] font-bold text-slate-500">{label}</div>
      <div className="text-xl font-black text-slate-900">{toPN(value)}</div>
      <Badge tone={tone}>{label}</Badge>
    </Card>
  )
}

export function HumanResourcesImportModal({
  employees,
  isOpen,
  onClose,
  onApplyImport,
}) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)

  const hasBlockingErrors = useMemo(() => (preview?.summary?.errors || 0) > 0, [preview])

  const reset = () => {
    setFile(null)
    setPreview(null)
    setError('')
    setLoading(false)
    setApplying(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleTemplateDownload = () => {
    downloadHumanResourcesSampleWorkbook()
  }

  const handleFile = async (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setLoading(true)
    setError('')
    try {
      const parsed = await parseHumanResourcesImportFile(selectedFile, employees)
      setPreview(parsed)
    } catch (parseError) {
      setPreview(null)
      setError(parseError.message || 'فایل اکسل قابل خواندن نبود.')
    } finally {
      setLoading(false)
    }
  }

  const applyImport = async () => {
    if (!preview) return
    setApplying(true)
    setError('')
    try {
      await onApplyImport(preview.rows.filter((row) => row.errors.length === 0))
      handleClose()
    } catch (applyError) {
      setError(applyError.message || 'درون‌ریزی اکسل ناموفق بود.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <ModalShell
      isOpen={isOpen}
      title="ورود از اکسل"
      description="فایل نمونه را دانلود کنید، اکسل را بارگذاری کنید، و ردیف‌های معتبر را وارد کنید."
      onClose={handleClose}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-4">
        <Card padding="md" className="space-y-3 border-slate-200 bg-slate-50/80">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">فایل نمونه</div>
              <div className="text-xs font-bold text-slate-500">کد پرسنلی در فایل لازم نیست و به‌صورت خودکار هنگام ثبت ساخته می‌شود.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={handleTemplateDownload}>دانلود فایل نمونه</Button>
            </div>
          </div>
          <div className="text-[11px] font-bold text-slate-500">می‌توانید فقط ستون‌های پایه را پر کنید: نام، نام خانوادگی، کد ملی، موبایل، واحد، سمت، بانک، شماره حساب، شبا و یادداشت.</div>
        </Card>

        <Card padding="md" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-slate-900">بارگذاری فایل اکسل</div>
              <div className="text-xs font-bold text-slate-500">ردیف‌ها پیش از ثبت بررسی می‌شوند.</div>
            </div>
            <Input
              key={file ? file.name : 'empty'}
              type="file"
              accept=".xlsx,.xls"
              className="h-10 max-w-72 cursor-pointer file:me-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
              onChange={(event) => handleFile(event.target.files?.[0] || null)}
            />
          </div>

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div> : null}
          {loading ? <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">در حال خواندن فایل اکسل...</div> : null}

          {preview ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <ImportSummary label="ردیف" value={preview.summary.total} tone="neutral" />
                <ImportSummary label="معتبر" value={preview.summary.valid} tone="success" />
                <ImportSummary label="هشدار" value={preview.summary.warnings} tone="warning" />
                <ImportSummary label="خطا" value={preview.summary.errors} tone="danger" />
              </div>

              {preview.unknownHeaders.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                  ستون‌های نادیده گرفته شده: {preview.unknownHeaders.join('، ')}
                </div>
              ) : null}

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
                    <tr>
                      <th className="px-3 py-2">ردیف</th>
                      <th className="px-3 py-2">پرسنل</th>
                      <th className="px-3 py-2">فیلدها</th>
                      <th className="px-3 py-2">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {preview.rows.map((row) => {
                      const fullName = `${row.values.firstName || ''} ${row.values.lastName || ''}`.trim() || '-'
                      return (
                        <tr key={`${row.rowNumber}:${fullName}`}>
                          <td className="px-3 py-2 font-black text-slate-900">{row.rowNumber}</td>
                          <td className="px-3 py-2">
                            <div className="font-black text-slate-900">{fullName}</div>
                            <div className="text-[11px] font-bold text-slate-500">{row.values.nationalId || 'بدون کد ملی'}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{Object.keys(row.values).join('، ') || '-'}</td>
                          <td className="px-3 py-2">
                            {row.errors.map((message) => <div key={message} className="text-[11px] font-bold text-rose-700">{message}</div>)}
                            {row.warnings.map((message) => <div key={message} className="text-[11px] font-bold text-amber-700">{message}</div>)}
                            {row.errors.length === 0 && row.warnings.length === 0 ? <div className="text-[11px] font-bold text-emerald-700">آماده ثبت</div> : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setFile(null); setPreview(null); }}>پاک کردن پیش‌نمایش</Button>
                <Button size="sm" variant="primary" disabled={applying || loading || hasBlockingErrors || !preview} onClick={applyImport}>
                  {applying ? 'در حال ثبت...' : 'ثبت ردیف‌های معتبر'}
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              title="فایلی انتخاب نشده"
              description="فایل اکسل نمونه را دانلود کنید و با همان قالب فایل را بارگذاری کنید."
            />
          )}
        </Card>
      </div>
    </ModalShell>
  )
}
