import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Lock, Power } from 'lucide-react'
import { moduleRegistryApi } from '../services/moduleRegistryApi'
import { moduleLabelFa } from '../moduleRegistry'

const activeDependentsFor = (modules, moduleId) => {
  if (!Array.isArray(modules)) return []
  return modules.filter((module) => {
    if (!module?.enabled) return false
    const dependencies = Array.isArray(module?.dependsOn) ? module.dependsOn : []
    return dependencies.includes(moduleId)
  })
}

export const ModuleRegistryPanel = ({ onRegistryUpdated }) => {
  const [modules, setModules] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyModuleId, setBusyModuleId] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const loadModules = useCallback(async () => {
    setIsLoading(true)
    setErrorMsg('')
    try {
      const response = await moduleRegistryApi.fetchModules()
      const list = Array.isArray(response?.modules) ? response.modules : []
      setModules(list)
    } catch (error) {
      setErrorMsg(error?.message || 'دریافت لیست ماژول‌ها ناموفق بود.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadModules()
  }, [loadModules])

  const sortedModules = useMemo(() => {
    return [...modules].sort((a, b) => Number(a?.sortOrder || 999) - Number(b?.sortOrder || 999))
  }, [modules])

  const handleToggleModule = async (module) => {
    const moduleId = String(module?.id || '')
    if (!moduleId) return

    const nextEnabled = !module?.enabled
    if (!nextEnabled) {
      if (module?.isProtected) {
        setErrorMsg('ماژول‌های محافظت‌شده قابل غیرفعال‌سازی نیستند.')
        setSuccessMsg('')
        return
      }
      const dependents = activeDependentsFor(modules, moduleId)
      if (dependents.length > 0) {
        const dependentLabel = moduleLabelFa(String(dependents[0]?.id || ''), modules)
        setErrorMsg(`این ماژول تا زمان فعال بودن ${dependentLabel} قابل غیرفعال‌سازی نیست.`)
        setSuccessMsg('')
        return
      }
    }

    setBusyModuleId(moduleId)
    setErrorMsg('')
    setSuccessMsg('')

    try {
      const response = await moduleRegistryApi.setModuleEnabled(moduleId, nextEnabled)
      if (Array.isArray(response?.modules)) {
        setModules(response.modules)
      } else if (response?.module) {
        setModules((prev) =>
          prev.map((candidate) => (String(candidate?.id || '') === moduleId ? response.module : candidate)),
        )
      }
      setSuccessMsg(`وضعیت ماژول ${moduleLabelFa(moduleId, modules)} به‌روزرسانی شد.`)
      if (typeof onRegistryUpdated === 'function') {
        await onRegistryUpdated()
      }
    } catch (error) {
      if (error?.payload?.code === 'module_dependency_blocked') {
        const dependentId = String(error?.payload?.dependentModule || '')
        const dependentLabel = moduleLabelFa(dependentId, modules)
        setErrorMsg(`امکان غیرفعال‌سازی وجود ندارد. ماژول ${dependentLabel} به آن وابسته است.`)
      } else {
        setErrorMsg(error?.message || 'به‌روزرسانی وضعیت ماژول ناموفق بود.')
      }
      setSuccessMsg('')
    } finally {
      setBusyModuleId('')
    }
  }

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
      dir="rtl"
      style={{ fontFamily: 'Vazirmatn' }}
    >
      <div>
        <h2 className="text-sm font-black text-slate-900">مدیریت ماژول‌های سیستم</h2>
        <p className="text-xs font-bold text-slate-500 mt-1">فعال‌سازی یا غیرفعال‌سازی ماژول‌ها از هسته سیستم</p>
      </div>

      {errorMsg && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{errorMsg}</div>}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{successMsg}</div>}

      {isLoading ? (
        <div className="h-28 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-xs font-black text-slate-600 gap-2">
          <Loader2 size={14} className="animate-spin" />
          در حال دریافت وضعیت ماژول‌ها...
        </div>
      ) : (
        <div className="space-y-2">
          {sortedModules.map((module) => {
            const moduleId = String(module?.id || '')
            const isProtected = Boolean(module?.isProtected)
            const isEnabled = Boolean(module?.enabled)
            const isBusy = busyModuleId === moduleId
            const disabled = isBusy || isProtected
            const dependencies = Array.isArray(module?.dependsOn) ? module.dependsOn : []

            return (
              <div key={moduleId} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-black text-slate-800 truncate">{moduleLabelFa(moduleId, modules)}</div>
                    {isProtected && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                        <Lock size={10} />
                        محافظت‌شده
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">
                    شناسه: <span dir="ltr">{moduleId}</span>
                    {dependencies.length > 0 ? ` | وابسته به: ${dependencies.join(', ')}` : ''}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleModule(module)}
                  disabled={disabled}
                  className={`h-9 min-w-28 rounded-lg px-3 text-xs font-black inline-flex items-center justify-center gap-1.5 transition-colors ${
                    isEnabled ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
                  {isEnabled ? 'فعال' : 'غیرفعال'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
