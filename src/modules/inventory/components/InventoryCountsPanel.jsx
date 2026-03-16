import { useState } from 'react'
import { Badge, Button, Card, Input, Select } from '@/components/shared/ui'

export const InventoryCountsPanel = ({
  warehouses = [],
  items = [],
  sessions = [],
  selectedSessionId = '',
  lines = [],
  canWrite = false,
  onSelectSession,
  onStartSession,
  onUpsertLine,
  onCloseSession,
}) => {
  const [sessionDraft, setSessionDraft] = useState({ warehouseId: '', countType: 'cycle', notes: '' })
  const [lineDraft, setLineDraft] = useState({ itemId: '', countedQuantityBase: '0', countedQuantitySecondary: '0', notes: '' })
  const [error, setError] = useState('')

  const openSession = sessions.find((session) => session.status === 'open') || null

  const handleStartSession = async () => {
    if (!canWrite) return
    setError('')
    if (!sessionDraft.warehouseId) {
      setError('انتخاب انبار الزامی است.')
      return
    }
    try {
      await onStartSession({
        action: 'start_session',
        warehouseId: Number(sessionDraft.warehouseId),
        countType: sessionDraft.countType,
        notes: sessionDraft.notes,
      })
      setSessionDraft((prev) => ({ ...prev, notes: '' }))
    } catch (e) {
      setError(e?.message || 'شروع انبارگردانی ناموفق بود.')
    }
  }

  const handleAddLine = async () => {
    if (!canWrite || !selectedSessionId) return
    setError('')
    if (!lineDraft.itemId) {
      setError('انتخاب کالا الزامی است.')
      return
    }
    try {
      await onUpsertLine({
        action: 'upsert_line',
        sessionId: Number(selectedSessionId),
        itemId: Number(lineDraft.itemId),
        countedQuantityBase: Number(lineDraft.countedQuantityBase || 0),
        countedQuantitySecondary: Number(lineDraft.countedQuantitySecondary || 0),
        notes: lineDraft.notes,
      })
    } catch (e) {
      setError(e?.message || 'ثبت شمارش ناموفق بود.')
    }
  }

  return (
    <Card padding="md" className="space-y-3">
      <div className="text-sm font-black text-slate-800">انبارگردانی (فصلی/سالانه)</div>

      {canWrite && (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
          <Select value={sessionDraft.warehouseId} onChange={(e) => setSessionDraft((p) => ({ ...p, warehouseId: e.target.value }))}>
            <option value="">انبار</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </Select>
          <Select value={sessionDraft.countType} onChange={(e) => setSessionDraft((p) => ({ ...p, countType: e.target.value }))}>
            <option value="cycle">فصلی</option>
            <option value="annual">سالانه</option>
          </Select>
          <Input value={sessionDraft.notes} onChange={(e) => setSessionDraft((p) => ({ ...p, notes: e.target.value }))} placeholder="توضیحات" className="md:col-span-2" />
          <Button onClick={handleStartSession} className="md:col-span-4">شروع انبارگردانی</Button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold text-slate-600">
        {openSession ? `انبارگردانی باز: نشست ${openSession.id} (انبار ${openSession.warehouseId})` : 'نشست باز وجود ندارد.'}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <Select value={selectedSessionId} onChange={(e) => onSelectSession(e.target.value)}>
          <option value="">انتخاب نشست</option>
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>#{session.id} | {session.countType} | {session.status}</option>
          ))}
        </Select>

        {canWrite && (
          <>
            <Select value={lineDraft.itemId} onChange={(e) => setLineDraft((p) => ({ ...p, itemId: e.target.value }))}>
              <option value="">کالا</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
            </Select>
            <Input value={lineDraft.countedQuantityBase} onChange={(e) => setLineDraft((p) => ({ ...p, countedQuantityBase: e.target.value }))} placeholder="شمارش پایه" dir="ltr" />
            <Input value={lineDraft.countedQuantitySecondary} onChange={(e) => setLineDraft((p) => ({ ...p, countedQuantitySecondary: e.target.value }))} placeholder="شمارش دوم" dir="ltr" />
            <Input value={lineDraft.notes} onChange={(e) => setLineDraft((p) => ({ ...p, notes: e.target.value }))} placeholder="یادداشت" className="md:col-span-2" />
            <div className="flex gap-2">
              <Button onClick={handleAddLine}>ثبت شمارش</Button>
              <Button variant="success" onClick={() => onCloseSession({ action: 'close_session', id: Number(selectedSessionId) })} disabled={!selectedSessionId}>بستن نشست</Button>
            </div>
          </>
        )}
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{error}</div>}

      <div className="space-y-2">
        {lines.map((line) => (
          <div key={line.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs font-black text-slate-800">کالا: {line.itemId}</div>
            <div className="text-[11px] font-bold text-slate-500" dir="ltr">
              system: {line.systemQuantityBase} | counted: {line.countedQuantityBase} | diff: {line.diffQuantityBase}
            </div>
            <Badge tone={Math.abs(Number(line.diffQuantityBase || 0)) > 0 ? 'warning' : 'success'}>
              {Math.abs(Number(line.diffQuantityBase || 0)) > 0 ? 'مغایرت' : 'بدون مغایرت'}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}
