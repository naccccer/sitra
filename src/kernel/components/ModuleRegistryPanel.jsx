import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Lock, Power } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '@/components/shared/ui';
import { moduleLabelFa } from '@/kernel/moduleRegistry';
import { moduleRegistryApi } from '@/kernel/services/moduleRegistryApi';

const activeDependentsFor = (modules, moduleId) => {
  if (!Array.isArray(modules)) return [];
  return modules.filter((module) => {
    if (!module?.enabled) return false;
    const dependencies = Array.isArray(module?.dependsOn) ? module.dependsOn : [];
    return dependencies.includes(moduleId);
  });
};

export const ModuleRegistryPanel = ({ onRegistryUpdated }) => {
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyModuleId, setBusyModuleId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadModules = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await moduleRegistryApi.fetchModules();
      const list = Array.isArray(response?.modules) ? response.modules : [];
      setModules(list);
    } catch (error) {
      setErrorMsg(error?.message || 'دریافت لیست ماژول‌ها ناموفق بود.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => Number(a?.sortOrder || 999) - Number(b?.sortOrder || 999)),
    [modules],
  );

  const handleToggleModule = async (module) => {
    const moduleId = String(module?.id || '');
    if (!moduleId) return;

    const nextEnabled = !module?.enabled;
    if (!nextEnabled) {
      if (module?.isProtected) {
        setErrorMsg('ماژول‌های محافظت‌شده قابل غیرفعال‌سازی نیستند.');
        setSuccessMsg('');
        return;
      }
      const dependents = activeDependentsFor(modules, moduleId);
      if (dependents.length > 0) {
        const dependentLabel = moduleLabelFa(String(dependents[0]?.id || ''), modules);
        setErrorMsg(`این ماژول تا زمان فعال بودن ${dependentLabel} قابل غیرفعال‌سازی نیست.`);
        setSuccessMsg('');
        return;
      }
    }

    setBusyModuleId(moduleId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await moduleRegistryApi.setModuleEnabled(moduleId, nextEnabled);
      if (Array.isArray(response?.modules)) {
        setModules(response.modules);
      } else if (response?.module) {
        setModules((prev) => prev.map((candidate) => (
          String(candidate?.id || '') === moduleId ? response.module : candidate
        )));
      }

      setSuccessMsg(`وضعیت ماژول ${moduleLabelFa(moduleId, modules)} به‌روزرسانی شد.`);
      if (typeof onRegistryUpdated === 'function') {
        await onRegistryUpdated();
      }
    } catch (error) {
      if (error?.payload?.code === 'module_dependency_blocked') {
        const dependentId = String(error?.payload?.dependentModule || '');
        const dependentLabel = moduleLabelFa(dependentId, modules);
        setErrorMsg(`امکان غیرفعال‌سازی وجود ندارد. ماژول ${dependentLabel} به آن وابسته است.`);
      } else {
        setErrorMsg(error?.message || 'به‌روزرسانی وضعیت ماژول ناموفق بود.');
      }
      setSuccessMsg('');
    } finally {
      setBusyModuleId('');
    }
  };

  return (
    <Card className="space-y-4" padding="lg">
      <div>
        <h2 className="text-sm font-black text-slate-900">مدیریت ماژول‌های سیستم</h2>
        <p className="mt-1 text-xs font-bold text-slate-500">فعال‌سازی یا غیرفعال‌سازی ماژول‌ها از هسته سیستم</p>
      </div>

      {errorMsg && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{errorMsg}</div>}
      {successMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">{successMsg}</div>}

      {isLoading ? (
        <div className="flex h-28 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-600">
          <Loader2 size={14} className="animate-spin" />
          در حال دریافت وضعیت ماژول‌ها...
        </div>
      ) : sortedModules.length === 0 ? (
        <EmptyState title="ماژولی برای نمایش وجود ندارد" description="رجیستری ماژول‌ها خالی است." />
      ) : (
        <div className="space-y-2">
          {sortedModules.map((module) => {
            const moduleId = String(module?.id || '');
            const isProtected = Boolean(module?.isProtected);
            const isEnabled = Boolean(module?.enabled);
            const isBusy = busyModuleId === moduleId;
            const dependencies = Array.isArray(module?.dependsOn) ? module.dependsOn : [];
            const disabled = isBusy || isProtected;

            return (
              <div key={moduleId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="truncate text-xs font-black text-slate-800">{moduleLabelFa(moduleId, modules)}</div>
                    {isEnabled ? <Badge tone="success">فعال</Badge> : <Badge tone="neutral">غیرفعال</Badge>}
                    {isProtected && (
                      <Badge tone="warning" className="inline-flex items-center gap-1">
                        <Lock size={10} />
                        محافظت‌شده
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    شناسه: <span dir="ltr">{moduleId}</span>
                    {dependencies.length > 0 ? ` | وابسته به: ${dependencies.join(', ')}` : ''}
                  </div>
                </div>

                <Button
                  onClick={() => handleToggleModule(module)}
                  disabled={disabled}
                  variant={isEnabled ? 'success' : 'secondary'}
                  size="md"
                  className="min-w-28"
                  title={isProtected ? 'ماژول محافظت‌شده است' : ''}
                >
                  {isBusy ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
                  {isEnabled ? 'فعال' : 'غیرفعال'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
