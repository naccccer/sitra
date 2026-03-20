import { useEffect, useState } from 'react'
import { Button, Card, Input } from '@/components/shared/ui'

export function PayrollSettingsPanel({ busy, canManage, onSave, settings }) {
  const [draft, setDraft] = useState(settings)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const patch = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  return (
    <Card padding="md" className="space-y-4">
      <div>
        <div className="text-sm font-black text-slate-900">تنظیمات فیش حقوقی</div>
        <div className="text-xs font-bold text-slate-500">اطلاعات سربرگ سازمان و بلوک امضا برای چاپ A4</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Input value={draft.companyName || ''} onChange={(event) => patch('companyName', event.target.value)} placeholder="نام شرکت" />
        <Input value={draft.companyId || ''} onChange={(event) => patch('companyId', event.target.value)} placeholder="شناسه / کد کارگاهی" />
        <Input value={draft.signatureLabel || ''} onChange={(event) => patch('signatureLabel', event.target.value)} placeholder="عنوان بلوک امضا" />
        <Input value={draft.signatoryName || ''} onChange={(event) => patch('signatoryName', event.target.value)} placeholder="نام امضاکننده" />
        <Input value={draft.signatoryTitle || ''} onChange={(event) => patch('signatoryTitle', event.target.value)} placeholder="سمت امضاکننده" />
        <Input value={draft.signatureNote || ''} onChange={(event) => patch('signatureNote', event.target.value)} placeholder="یادداشت امضا" />
      </div>

      <label className="block space-y-1">
        <span className="block text-xs font-black text-slate-600">یادداشت پایین فیش</span>
        <textarea
          value={draft.footerNote || ''}
          onChange={(event) => patch('footerNote', event.target.value)}
          className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none"
        />
      </label>

      <div className="flex justify-end">
        <Button size="sm" variant="primary" disabled={!canManage || busy} onClick={() => onSave(draft)}>
          {busy ? 'در حال ذخیره...' : 'ذخیره تنظیمات چاپ'}
        </Button>
      </div>
    </Card>
  )
}
