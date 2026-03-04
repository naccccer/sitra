import React, { useEffect, useMemo, useState } from 'react'
import { Boxes, RefreshCw } from 'lucide-react'
import { inventoryApi } from '../services/inventoryApi'
import { toPN } from '../../../utils/helpers'

const MOVEMENT_LABELS = {
  reserve: 'رزرو',
  release: 'آزادسازی',
  consume: 'مصرف',
  in: 'ورود',
  out: 'خروج',
  adjust_plus: 'اصلاح مثبت',
  adjust_minus: 'اصلاح منفی',
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return toPN(date.toLocaleString('fa-IR'))
}

export const InventoryPage = () => {
  const [reservations, setReservations] = useState([])
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadInventoryData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [reservationData, ledgerData] = await Promise.all([
        inventoryApi.fetchReservations(),
        inventoryApi.fetchLedger(),
      ])
      setReservations(Array.isArray(reservationData?.reservations) ? reservationData.reservations : [])
      setLedgerEntries(Array.isArray(ledgerData?.entries) ? ledgerData.entries : [])
    } catch (err) {
      setError(err?.message || 'دریافت اطلاعات انبار ناموفق بود.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInventoryData()
  }, [])

  const summary = useMemo(() => {
    const activeReservations = reservations.filter((r) => r.status === 'active').length
    const reservedQty = reservations.reduce((sum, r) => sum + Number(r.qtyReserved || 0), 0)
    const reserveMovements = ledgerEntries.filter((e) => e.movementType === 'reserve').length
    return { activeReservations, reservedQty, reserveMovements }
  }, [reservations, ledgerEntries])

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-xl bg-blue-100 p-2 text-blue-700">
              <Boxes size={18} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-800">ماژول انبار</h2>
              <p className="text-xs font-bold text-slate-500">نمای رزرو و گردش موجودی از جریان رهیاسازی تولید</p>
            </div>
          </div>

          <button
            onClick={loadInventoryData}
            disabled={isLoading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            بروزرسانی
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-black text-slate-700">رزرو فعال: {toPN(summary.activeReservations)}</div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-black text-slate-700">مجموع رزرو: {toPN(summary.reservedQty)}</div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-black text-slate-700">رخداد رزرو در ledger: {toPN(summary.reserveMovements)}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-black text-slate-700">رزروها</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-2 text-right font-black">کد رزرو</th>
                <th className="p-2 text-right font-black">SKU</th>
                <th className="p-2 text-right font-black">کلید ردیف</th>
                <th className="p-2 text-right font-black">مقدار رزرو</th>
                <th className="p-2 text-right font-black">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservations.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center font-bold text-slate-400">رزروی ثبت نشده است.</td>
                </tr>
              )}
              {reservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-slate-50">
                  <td className="p-2 font-black text-slate-800">{reservation.reservationCode}</td>
                  <td className="p-2 font-mono text-[11px] text-slate-600">{reservation.itemSku}</td>
                  <td className="p-2 font-bold text-slate-700">{reservation.orderRowKey || '-'}</td>
                  <td className="p-2 font-bold text-slate-700">{toPN(reservation.qtyReserved)}</td>
                  <td className="p-2 font-bold text-slate-600">{reservation.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-black text-slate-700">گردش موجودی (Ledger)</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-2 text-right font-black">زمان</th>
                <th className="p-2 text-right font-black">نوع حرکت</th>
                <th className="p-2 text-right font-black">SKU</th>
                <th className="p-2 text-right font-black">کلید ردیف</th>
                <th className="p-2 text-right font-black">مقدار</th>
                <th className="p-2 text-right font-black">مرجع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerEntries.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-6 text-center font-bold text-slate-400">گردش موجودی ثبت نشده است.</td>
                </tr>
              )}
              {ledgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="p-2 font-bold text-slate-600">{formatDateTime(entry.createdAt)}</td>
                  <td className="p-2 font-bold text-slate-700">{MOVEMENT_LABELS[entry.movementType] || entry.movementType}</td>
                  <td className="p-2 font-mono text-[11px] text-slate-600">{entry.itemSku}</td>
                  <td className="p-2 font-bold text-slate-700">{entry.orderRowKey || '-'}</td>
                  <td className="p-2 font-bold text-slate-700">{toPN(entry.qtyDelta)}</td>
                  <td className="p-2 font-bold text-slate-500">{entry.referenceType || '-'} / {entry.referenceId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
