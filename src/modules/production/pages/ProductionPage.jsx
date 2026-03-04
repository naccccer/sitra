import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Factory, RefreshCw } from 'lucide-react'
import { productionApi } from '../services/productionApi'

const STATUS_LABELS = {
  queued: 'در صف',
  cutting: 'برش',
  drilling: 'سوراخ‌کاری',
  tempering: 'سکوریت',
  packing: 'بسته‌بندی',
  completed: 'تکمیل',
  blocked: 'متوقف',
  cancelled: 'لغو',
}

const TEMPLATE_PRESET_LABELS = {
  'cut-a6': 'قالب برش A6',
  'drill-a6-alert': 'قالب سوراخ‌کاری A6 (هشدار)',
  'temp-a6': 'قالب سکوریت A6',
  'pack-a5': 'قالب بسته‌بندی A5',
  'standard-a6': 'قالب استاندارد A6',
}

const SCAN_PROFILES = {
  manual: {
    label: 'دستی',
    submitOnEnter: false,
    autoSubmit: false,
    minLength: 0,
    debounceMs: 0,
  },
  usb_enter: {
    label: 'اسکنر USB (با Enter)',
    submitOnEnter: true,
    autoSubmit: false,
    minLength: 0,
    debounceMs: 0,
  },
  usb_fast: {
    label: 'اسکنر USB (بدون Enter)',
    submitOnEnter: false,
    autoSubmit: true,
    minLength: 4,
    debounceMs: 120,
  },
  camera: {
    label: 'اسکنر دوربین',
    submitOnEnter: false,
    autoSubmit: true,
    minLength: 4,
    debounceMs: 350,
  },
}

const DEFAULT_SCAN_PREFS = {
  stage: 'cutting',
  station: 'station-cut-1',
  profileId: 'usb_enter',
  printTemplatePreset: 'cut-a6',
}

const SCAN_PREFS_KEY = 'sitra.production.scanPrefs.v1'

const FALLBACK_STATION_PRESETS = [
  {
    stationKey: 'station-cut-1',
    label: 'ایستگاه برش ۱',
    defaultStage: 'cutting',
    printTemplatePreset: 'cut-a6',
    defaultLabelCopies: 1,
  },
]

export const ProductionPage = ({ session }) => {
  const [workOrders, setWorkOrders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [updatingWorkOrderIds, setUpdatingWorkOrderIds] = useState({})
  const [stationPresets, setStationPresets] = useState(FALLBACK_STATION_PRESETS)

  const [labelLookupKey, setLabelLookupKey] = useState('')
  const [labelCopies, setLabelCopies] = useState(1)
  const [printTemplatePreset, setPrintTemplatePreset] = useState(DEFAULT_SCAN_PREFS.printTemplatePreset)
  const [labelData, setLabelData] = useState(null)
  const [labelBusy, setLabelBusy] = useState(false)
  const [labelError, setLabelError] = useState('')
  const [scanOrderRowKey, setScanOrderRowKey] = useState('')
  const [scanStage, setScanStage] = useState(DEFAULT_SCAN_PREFS.stage)
  const [scanStation, setScanStation] = useState(DEFAULT_SCAN_PREFS.station)
  const [scanProfileId, setScanProfileId] = useState(DEFAULT_SCAN_PREFS.profileId)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanMessage, setScanMessage] = useState('')
  const [scanError, setScanError] = useState('')
  const scanAutoSubmitTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))

  const loadWorkOrders = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await productionApi.fetchWorkOrders()
      setWorkOrders(Array.isArray(data?.workOrders) ? data.workOrders : [])
      if (Array.isArray(data?.stationPresets) && data.stationPresets.length > 0) {
        setStationPresets(data.stationPresets)
      } else {
        setStationPresets(FALLBACK_STATION_PRESETS)
      }
    } catch (err) {
      setError(err?.message || 'دریافت اطلاعات تولید ناموفق بود.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkOrders()
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCAN_PREFS_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      const nextStage = String(parsed?.stage || DEFAULT_SCAN_PREFS.stage)
      const nextStation = String(parsed?.station || DEFAULT_SCAN_PREFS.station)
      const nextProfileId = String(parsed?.profileId || DEFAULT_SCAN_PREFS.profileId)
      const nextTemplate = String(parsed?.printTemplatePreset || DEFAULT_SCAN_PREFS.printTemplatePreset)

      if (Object.prototype.hasOwnProperty.call(STATUS_LABELS, nextStage)) {
        setScanStage(nextStage)
      }
      setScanStation(nextStation)
      if (Object.prototype.hasOwnProperty.call(SCAN_PROFILES, nextProfileId)) {
        setScanProfileId(nextProfileId)
      }
      setPrintTemplatePreset(nextTemplate)
    } catch {
      // Ignore storage parse failures.
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        SCAN_PREFS_KEY,
        JSON.stringify({
          stage: scanStage,
          station: scanStation,
          profileId: scanProfileId,
          printTemplatePreset,
        }),
      )
    } catch {
      // Ignore storage write failures.
    }
  }, [printTemplatePreset, scanProfileId, scanStage, scanStation])

  useEffect(() => {
    return () => {
      if (scanAutoSubmitTimerRef.current) {
        clearTimeout(scanAutoSubmitTimerRef.current)
      }
    }
  }, [])

  const upsertWorkOrder = (workOrder) => {
    if (!workOrder?.id) return

    const key = String(workOrder.id)
    setWorkOrders((prev) => {
      const index = prev.findIndex((item) => String(item.id) === key)
      if (index === -1) {
        return [workOrder, ...prev]
      }
      return prev.map((item) => (String(item.id) === key ? { ...item, ...workOrder } : item))
    })
  }

  const patchWorkOrder = async (workOrderId, payload) => {
    const key = String(workOrderId)
    if (updatingWorkOrderIds[key]) return null

    setUpdatingWorkOrderIds((prev) => ({ ...prev, [key]: true }))
    setError('')
    try {
      const data = await productionApi.updateWorkOrder({
        workOrderId: Number(workOrderId),
        ...payload,
      })
      if (data?.workOrder) {
        upsertWorkOrder(data.workOrder)
      }
      return data
    } catch (err) {
      setError(err?.message || 'به‌روزرسانی برگه کار تولید ناموفق بود.')
      return null
    } finally {
      setUpdatingWorkOrderIds((prev) => ({ ...prev, [key]: false }))
    }
  }

  const handleStatusChange = async (workOrder, status) => {
    await patchWorkOrder(workOrder.id, { status })
  }

  const handleConsumeOne = async (workOrder) => {
    const data = await patchWorkOrder(workOrder.id, { consumeQty: 1 })
    if (data?.consumption?.qtyRemaining !== undefined) {
      const remaining = Number(data.consumption.qtyRemaining || 0)
      const safeRemaining = Number.isFinite(remaining) ? remaining : 0
      alert(`مصرف ثبت شد. باقیمانده رزرو: ${safeRemaining}`)
    }
  }

  const resolveLabelCopies = (value) => {
    const parsed = Number.parseInt(String(value), 10)
    if (!Number.isFinite(parsed) || parsed <= 0) return 1
    if (parsed > 100) return 100
    return parsed
  }

  const applyStationPreset = (nextStationKey) => {
    const stationKey = String(nextStationKey || '').trim()
    setScanStation(stationKey)
    const preset = stationPresets.find((item) => String(item.stationKey || '') === stationKey)
    if (!preset) return

    if (preset.defaultStage && Object.prototype.hasOwnProperty.call(STATUS_LABELS, preset.defaultStage)) {
      setScanStage(String(preset.defaultStage))
    }
    if (preset.printTemplatePreset) {
      setPrintTemplatePreset(String(preset.printTemplatePreset))
    }
    if (preset.defaultLabelCopies !== undefined) {
      setLabelCopies(resolveLabelCopies(preset.defaultLabelCopies))
    }
  }

  const handleLabelLookup = async () => {
    const orderRowKey = String(labelLookupKey || '').trim()
    if (!orderRowKey) {
      setLabelError('کلید ردیف سفارش الزامی است.')
      return
    }

    setLabelBusy(true)
    setLabelError('')
    try {
      const data = await productionApi.fetchLabelData({ orderRowKey })
      setLabelData(data?.labelData || null)
      if (data?.labelData?.workOrder) {
        upsertWorkOrder(data.labelData.workOrder)
      }
    } catch (err) {
      setLabelData(null)
      setLabelError(err?.message || 'جست‌وجوی لیبل ناموفق بود.')
    } finally {
      setLabelBusy(false)
    }
  }

  const handlePrintLabel = async (options = {}) => {
    const orderRowKey = String(options.orderRowKey ?? labelLookupKey ?? '').trim()
    const copies = resolveLabelCopies(options.copies ?? labelCopies)
    const workOrderId = options.workOrderId ?? labelData?.workOrder?.id

    if (!orderRowKey && !workOrderId) {
      setLabelError('برای چاپ، کلید ردیف سفارش یا شناسه برگه کار تولید الزامی است.')
      return
    }

    setLabelBusy(true)
    setLabelError('')
    try {
      const payload = {
        action: 'print',
        copies,
        templatePreset: printTemplatePreset,
        stationKey: scanStation || null,
      }
      if (orderRowKey) {
        payload.orderRowKey = orderRowKey
      } else {
        payload.workOrderId = Number(workOrderId)
      }

      const data = await productionApi.printLabel(payload)
      setLabelData(data?.labelData || null)
      if (data?.labelData?.line?.orderRowKey) {
        setLabelLookupKey(data.labelData.line.orderRowKey)
      }
      if (data?.labelData?.workOrder) {
        upsertWorkOrder(data.labelData.workOrder)
      }
    } catch (err) {
      setLabelError(err?.message || 'چاپ لیبل ناموفق بود.')
    } finally {
      setLabelBusy(false)
    }
  }

  const activeScanProfile = SCAN_PROFILES[scanProfileId] || SCAN_PROFILES.manual
  const activeStationPreset = useMemo(
    () => stationPresets.find((preset) => String(preset.stationKey || '') === String(scanStation || '')) || null,
    [scanStation, stationPresets],
  )

  const clearScanAutoSubmitTimer = () => {
    if (scanAutoSubmitTimerRef.current) {
      clearTimeout(scanAutoSubmitTimerRef.current)
      scanAutoSubmitTimerRef.current = null
    }
  }

  useEffect(() => {
    if (!activeScanProfile.autoSubmit) {
      clearScanAutoSubmitTimer()
    }
  }, [activeScanProfile.autoSubmit])

  useEffect(() => {
    if (stationPresets.length === 0) {
      setScanStation('')
      return
    }
    const hasSelected = stationPresets.some((preset) => String(preset.stationKey || '') === String(scanStation || ''))
    if (!hasSelected) {
      const first = stationPresets[0]
      const nextStation = String(first?.stationKey || '')
      setScanStation(nextStation)
      if (first?.defaultStage && Object.prototype.hasOwnProperty.call(STATUS_LABELS, first.defaultStage)) {
        setScanStage(first.defaultStage)
      }
      if (first?.printTemplatePreset) {
        setPrintTemplatePreset(String(first.printTemplatePreset))
      }
      if (first?.defaultLabelCopies !== undefined) {
        const copies = Number.parseInt(String(first.defaultLabelCopies), 10)
        if (Number.isFinite(copies) && copies > 0) {
          setLabelCopies(copies > 100 ? 100 : copies)
        }
      }
    }
  }, [scanStation, stationPresets])

  const handleScanTransition = async (inputOrderRowKey = null) => {
    const orderRowKey = String(inputOrderRowKey ?? scanOrderRowKey ?? '').trim()
    const stationKey = String(scanStation || '').trim()

    if (!orderRowKey) {
      setScanError('کلید ردیف سفارش برای تغییر مرحله الزامی است.')
      return
    }

    setScanBusy(true)
    setScanMessage('')
    setScanError('')
    try {
      const lookup = await productionApi.fetchLabelData({ orderRowKey })
      const workOrderId = Number(lookup?.labelData?.workOrder?.id || 0)
      if (!Number.isFinite(workOrderId) || workOrderId <= 0) {
        throw new Error('برای کلید اسکن‌شده برگه کار تولیدی پیدا نشد.')
      }

      const patchPayload = {
        workOrderId,
        status: scanStage,
        note: `scan:${orderRowKey}`,
      }
      if (stationKey) {
        patchPayload.stationKey = stationKey
      }

      const updated = await productionApi.updateWorkOrder(patchPayload)
      if (updated?.workOrder) {
        upsertWorkOrder(updated.workOrder)
      }
      if (lookup?.labelData) {
        setLabelData(lookup.labelData)
        setLabelLookupKey(orderRowKey)
      }
      setScanMessage(`اسکن شد: ${orderRowKey} -> ${STATUS_LABELS[scanStage] || scanStage}`)
      setScanOrderRowKey('')
    } catch (err) {
      setScanError(err?.message || 'تغییر مرحله با اسکن ناموفق بود.')
    } finally {
      setScanBusy(false)
    }
  }

  const queueScanAutoSubmit = (nextRawValue) => {
    const value = String(nextRawValue || '').trim()
    if (!activeScanProfile.autoSubmit) return
    if (scanBusy) return
    if (value.length < activeScanProfile.minLength) return

    clearScanAutoSubmitTimer()
    scanAutoSubmitTimerRef.current = setTimeout(() => {
      handleScanTransition(value)
    }, activeScanProfile.debounceMs)
  }

  const summary = useMemo(() => {
    const queued = workOrders.filter((w) => w.status === 'queued').length
    const inProgress = workOrders.filter((w) => ['cutting', 'drilling', 'tempering', 'packing'].includes(w.status)).length
    const done = workOrders.filter((w) => w.status === 'completed').length
    return { queued, inProgress, done }
  }, [workOrders])

  const printTemplateOptions = useMemo(() => {
    const map = new Map()
    stationPresets.forEach((preset) => {
      const presetId = String(preset?.printTemplatePreset || '').trim()
      if (!presetId || map.has(presetId)) return
      map.set(presetId, presetId)
    })
    if (!map.has('standard-a6')) {
      map.set('standard-a6', 'standard-a6')
    }
    return Array.from(map.values())
  }, [stationPresets])

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
              <p className="text-xs font-bold text-slate-500">لیست برگه‌های کار تولید بر اساس رهاسازی سطر سفارش</p>
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
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11px] font-black text-slate-600">
            چاپ مجدد سریع (کلید ردیف سفارش)
            <input
              value={labelLookupKey}
              onChange={(e) => setLabelLookupKey(e.target.value)}
              placeholder="مثال: 1025-3"
              className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300"
            />
          </label>
          <label className="flex w-[110px] flex-col gap-1 text-[11px] font-black text-slate-600">
            تعداد نسخه
            <input
              type="number"
              min={1}
              max={100}
              value={labelCopies}
              onChange={(e) => setLabelCopies(resolveLabelCopies(e.target.value))}
              className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300"
            />
          </label>
          <label className="flex w-[170px] flex-col gap-1 text-[11px] font-black text-slate-600">
            قالب چاپ
            <select
              value={printTemplatePreset}
              onChange={(e) => setPrintTemplatePreset(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300"
            >
              {printTemplateOptions.map((presetId) => (
                <option key={presetId} value={presetId}>
                  {TEMPLATE_PRESET_LABELS[presetId] || presetId}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={handleLabelLookup}
            disabled={labelBusy}
            className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            جست‌وجو
          </button>
          <button
            onClick={() => handlePrintLabel()}
            disabled={labelBusy}
            className="h-9 rounded-lg bg-indigo-600 px-3 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            چاپ لیبل
          </button>
        </div>

        <div className="mt-2 text-[11px] font-bold text-slate-500">
          ایستگاه فعال: {activeStationPreset?.label || scanStation || '-'}
        </div>

        {labelError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700">
            {labelError}
          </div>
        )}

        {labelData && (
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 font-bold text-slate-700">
              کلید ردیف: <span className="font-mono">{labelData?.line?.orderRowKey || '-'}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 font-bold text-slate-700">
              بارکد: <span className="font-mono">{labelData?.line?.barcodeValue || '-'}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 font-bold text-slate-700">
              هشدار سوراخ‌کاری: {labelData?.line?.requiresDrilling ? 'دارد' : 'ندارد'}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 font-bold text-slate-700">
              تعداد چاپ: {labelData?.workOrder?.labelPrintCount ?? 0}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[11px] font-black text-slate-600">
            اسکن کلید ردیف
            <input
              value={scanOrderRowKey}
              onChange={(e) => {
                const nextValue = e.target.value
                setScanOrderRowKey(nextValue)
                setScanMessage('')
                setScanError('')
                queueScanAutoSubmit(nextValue)
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                if (!activeScanProfile.submitOnEnter) return
                e.preventDefault()
                clearScanAutoSubmitTimer()
                handleScanTransition(e.currentTarget.value)
              }}
              placeholder="کلید ردیف را اسکن/وارد کنید"
              className="h-9 rounded-lg border border-slate-200 px-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300"
            />
          </label>
          <label className="flex w-[170px] flex-col gap-1 text-[11px] font-black text-slate-600">
            پروفایل اسکنر
            <select
              value={scanProfileId}
              onChange={(e) => setScanProfileId(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300"
            >
              {Object.keys(SCAN_PROFILES).map((profileId) => (
                <option key={profileId} value={profileId}>
                  {SCAN_PROFILES[profileId].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-[140px] flex-col gap-1 text-[11px] font-black text-slate-600">
            مرحله بعد
            <select
              value={scanStage}
              onChange={(e) => setScanStage(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300"
            >
              {Object.keys(STATUS_LABELS).map((statusKey) => (
                <option key={statusKey} value={statusKey}>
                  {STATUS_LABELS[statusKey]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-[140px] flex-col gap-1 text-[11px] font-black text-slate-600">
            ایستگاه
            <select
              value={scanStation}
              onChange={(e) => applyStationPreset(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-300"
            >
              {stationPresets.map((preset) => (
                <option key={preset.stationKey} value={preset.stationKey}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => handleScanTransition()}
            disabled={scanBusy || stationPresets.length === 0}
            className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            اعمال تغییر مرحله
          </button>
        </div>
        {stationPresets.length === 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs font-bold text-amber-700">
            برای نقش {String(session?.role || 'نامشخص')} ایستگاهی تعریف نشده است.
          </div>
        )}
        {scanError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700">
            {scanError}
          </div>
        )}
        {scanMessage && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs font-bold text-emerald-700">
            {scanMessage}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-xs">
            <thead className="border-y border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="p-2 text-right font-black">کد برگه کار تولید</th>
                <th className="p-2 text-right font-black">کلید ردیف</th>
                <th className="p-2 text-right font-black">وضعیت</th>
                <th className="p-2 text-center font-black">هشدار سوراخ‌کاری</th>
                <th className="p-2 text-right font-black">لینک QR</th>
                <th className="p-2 text-center font-black">تعداد چاپ</th>
                <th className="p-2 text-center font-black">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workOrders.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center font-bold text-slate-400">برگه کار تولیدی یافت نشد.</td>
                </tr>
              )}
              {workOrders.map((workOrder) => {
                const busy = Boolean(updatingWorkOrderIds[String(workOrder.id)])
                const remainingQty = Number(workOrder?.reservation?.qtyRemaining ?? 0)
                const canConsume = Number.isFinite(remainingQty) && remainingQty > 0
                return (
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
                    <td className="p-2 text-center font-black text-slate-700">{workOrder.labelPrintCount || 0}</td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <select
                          value={workOrder.status}
                          disabled={busy}
                          onChange={(e) => handleStatusChange(workOrder, e.target.value)}
                          className="h-8 rounded border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-700"
                        >
                          {Object.keys(STATUS_LABELS).map((statusKey) => (
                            <option key={statusKey} value={statusKey}>
                              {STATUS_LABELS[statusKey]}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleConsumeOne(workOrder)}
                          disabled={busy || !canConsume}
                          className={`h-8 rounded px-2 text-[10px] font-black ${(busy || !canConsume) ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
                        >
                          مصرف 1 {canConsume ? '' : '(تکمیل)'}
                        </button>
                        <button
                          onClick={() => handlePrintLabel({ orderRowKey: workOrder.orderRowKey, copies: 1, workOrderId: workOrder.id })}
                          disabled={busy || labelBusy}
                          className={`h-8 rounded px-2 text-[10px] font-black ${(busy || labelBusy) ? 'bg-slate-300 text-white cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                        >
                          چاپ
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
