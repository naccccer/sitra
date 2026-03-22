import React from 'react';
import { ChevronDown, ChevronLeft, Loader2, RotateCcw, Save } from 'lucide-react';
import { toPN } from '../../../utils/helpers';
import { roleLabel } from '../hooks/useAdminUsersSettings';

export const RolePermissionsMatrix = ({
  isLoading,
  isSavingMatrix,
  hasMatrixChanges,
  matrixRoles,
  groups,
  rolePermissions,
  expandedModules,
  moduleStatus,
  onReset,
  onSave,
  onToggleModule,
  onSetModuleEnabled,
  onTogglePermission,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
      <div>
        <div className="text-sm font-black text-slate-800">جدول نقش‌ها و مجوزهای دسترسی</div>
        <div className="text-[11px] font-bold text-slate-500">هر ستون یک نقش است. هر ماژول را می‌توانید برای هر نقش فعال کنید.</div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onReset}
          disabled={!hasMatrixChanges || isSavingMatrix}
          className={`h-8 px-2 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${(!hasMatrixChanges || isSavingMatrix) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          <RotateCcw size={12} />
          بازنشانی
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!hasMatrixChanges || isSavingMatrix}
          className={`h-8 px-2 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${(!hasMatrixChanges || isSavingMatrix) ? 'bg-emerald-100 text-emerald-400 cursor-not-allowed' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
        >
          {isSavingMatrix ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
          ذخیره جدول
        </button>
      </div>
    </div>

    {isLoading ? (
      <div className="p-6 text-center text-xs font-black text-slate-500 inline-flex w-full items-center justify-center gap-2">
        <Loader2 size={14} className="animate-spin" />
        در حال بارگذاری...
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed text-xs">
          <colgroup>
            <col className="w-[300px]" />
            {matrixRoles.map((role) => (
              <col key={`main-col-${role}`} className="w-[130px]" />
            ))}
          </colgroup>
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-2 text-right font-black">ماژول / مجوزها</th>
              {matrixRoles.map((role) => (
                <th key={role} className="p-2 text-center font-black">{roleLabel(role)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((group) => {
              const isExpanded = Boolean(expandedModules[group.id]);
              return (
                <React.Fragment key={group.id}>
                  <tr>
                    <td className="p-2">
                      <button
                        type="button"
                        onClick={() => onToggleModule(group.id)}
                        className="w-full flex items-center gap-2 text-right"
                      >
                        {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronLeft size={14} className="text-slate-500" />}
                        <span className="font-black text-slate-800">{group.label}</span>
                        <span className="text-[10px] font-bold text-slate-500">{toPN(group.items.length)} مورد</span>
                      </button>
                    </td>
                    {matrixRoles.map((role) => {
                      const status = moduleStatus(role, group);
                      return (
                        <td key={`${group.id}-${role}`} className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={status.checked}
                            disabled={isSavingMatrix}
                            onChange={() => onSetModuleEnabled(role, group, !status.checked)}
                            className="h-4 w-4 accent-slate-900 cursor-pointer"
                          />
                          <div className="mt-1 text-[10px] font-bold text-slate-400">
                            {toPN(status.enabled)}/{toPN(status.total)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={matrixRoles.length + 1} className="p-0">
                        <div className="border-t border-sky-200 bg-sky-50/60 p-2">
                          <table className="w-full min-w-[980px] table-fixed text-xs">
                            <colgroup>
                              <col className="w-[300px]" />
                              {matrixRoles.map((role) => (
                                <col key={`detail-col-${group.id}-${role}`} className="w-[130px]" />
                              ))}
                            </colgroup>
                            <tbody className="divide-y divide-sky-100">
                              {group.items.map((permission) => (
                                <tr key={`${group.id}-${permission.key}`} className="hover:bg-white/70">
                                  <td className="p-2 font-bold text-slate-700">{permission.label}</td>
                                  {matrixRoles.map((role) => {
                                    const checked = Array.isArray(rolePermissions?.[role]) && rolePermissions[role].includes(permission.key);
                                    return (
                                      <td key={`${group.id}-${permission.key}-${role}`} className="p-2 text-center">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={isSavingMatrix}
                                          onChange={() => onTogglePermission(role, permission.key)}
                                          className="h-4 w-4 accent-slate-900 cursor-pointer"
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
