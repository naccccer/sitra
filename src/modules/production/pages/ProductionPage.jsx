import React, { useEffect, useMemo, useState } from 'react'
import { Factory, RefreshCw } from 'lucide-react'
import { productionApi } from '../services/productionApi'

const STATUS_LABELS = {
  queued: 'در صف',
  cutting: 'برش',
  drilling: 'سوراخ کاری',
  tempering: 'سکوریت',
  packing: 'بسته بندی',
  completed: 'تکمیل',
  blocked: 'متوقف',
  cancelled: 'لغو',
}

export const ProductionPage = () => {
  const [workOrders, setWorkOrders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadWorkOrders = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await productionApi.fetchWorkOrders()
      setWorkOrders(Array.isArray(data?.workOrders) ? data.workOrders : [])
    } catch (err) {
      setError(err?.message || 'دریافت اطلاعات تولید ناموفق بود.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkOrders()
  }, [])

  const summary = useMemo(() => {
    const queued = workOrders.filter((w) => w.status === 'queued').length
    const inProgress = workOrders.filter((w) => ['cutting', 'drilling', 'tempering', 'packing'].includes(w.status)).length
    const done = workOrders.filter((w) => w.status === 'completed').length
    return { queued, inProgress, done }
  }, [workOrders])

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-xl bg-indigo-100 p-2 text-indigo-700">
              <Factory size={18} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-800">ماژول تولید</h2>
              <p className="text-xs font-bold text-slate-500">لیست ورک اوردرها بر اساس رهاسازی سطر سفارش</p>
            </div>
          </div>

          <button
            onClick={loadWorkOrders}
            disabled={isLoading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            بروزرسانی
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-black text-slate-700">در صف: {summary.queued}</div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-black text-slate-700">در جریان: {summary.inProgress}</div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-black text-slate-700">تکمیل شده: {summary.done}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-2 text-right font-black">کد ورک اوردر</th>
                <th className="p-2 text-right font-black">کلید ردیف</th>
                <th className="p-2 text-right font-black">وضعیت</th>
                <th className="p-2 text-center font-black">هشدار سوراخ کاری</th>
                <th className="p-2 text-right font-black">QR مقصد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workOrders.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center font-bold text-slate-400">ورک اوردری ثبت نشده است.</td>
                </tr>
              )}
              {workOrders.map((workOrder) => (
                <tr key={workOrder.id} className="hover:bg-slate-50">
                  <td className="p-2 font-black text-slate-800">{workOrder.workOrderCode}</td>
                  <td className="p-2 font-bold text-slate-700">{workOrder.orderRowKey}</td>
                  <td className="p-2 font-bold text-slate-600">{STATUS_LABELS[workOrder.status] || workOrder.status}</td>
                  <td className="p-2 text-center">
                    {workOrder.requiresDrilling ? (
                      <span className="inline-flex rounded bg-black px-2 py-0.5 text-[10px] font-black text-white">سوراخ</span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="p-2 font-mono text-[11px] text-slate-500">{workOrder.qrPayloadUrl || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

