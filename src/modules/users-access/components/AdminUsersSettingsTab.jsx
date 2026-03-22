import React from 'react';
import { ChevronDown, ChevronLeft, Loader2, Pencil, RotateCcw, Save, Trash2, UserPlus, X } from 'lucide-react';
import { toPN } from '../../../utils/helpers';
import {
  useAdminUsersSettings,
  roleLabel,
  roleBadgeClass,
  formatDateTime,
} from '../hooks/useAdminUsersSettings';

export const AdminUsersSettingsTab = ({ session, onRefreshSession }) => {
  const {
    users,
    matrixRoles,
    groups,
    isLoading,
    isCreating,
    busyUserId,
    isSavingMatrix,
    errorMsg,
    successMsg,
    rolePermissions,
    expandedModules,
    hasMatrixChanges,
    moduleStatus,
    createDraft,
    setCreateDraft,
    editingUserId,
    editDraft,
    setEditDraft,
    availableRoleOptions,
    handleCreateUser,
    handleUpdateUser,
    handleToggleActive,
    handleSaveMatrix,
    handleResetMatrix,
    setModuleEnabled,
    toggleRolePermission,
    toggleModuleExpanded,
    startEditing,
    cancelEditing,
  } = useAdminUsersSettings({ session, onRefreshSession });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 text-sm font-black text-slate-800">ایجاد کاربر جدید</div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <input
            type="text"
            value={createDraft.username}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, username: e.target.value }))}
            placeholder="نام کاربری"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
            dir="ltr"
          />
          <input
            type="text"
            value={createDraft.fullName}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, fullName: e.target.value }))}
            placeholder="نام کاربر *"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
          />
          <input
            type="text"
            value={createDraft.jobTitle}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, jobTitle: e.target.value }))}
            placeholder="سمت (اختیاری)"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
          />
          <input
            type="password"
            value={createDraft.password}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="رمز عبور (حداقل 6)"
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
            dir="ltr"
          />
          <select
            value={createDraft.role}
            onChange={(e) => setCreateDraft((prev) => ({ ...prev, role: e.target.value }))}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold bg-white"
          >
            {availableRoleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreateUser}
            disabled={isCreating}
            className={`h-10 rounded-lg text-xs font-black inline-flex items-center justify-center gap-1.5 ${isCreating ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
          >
            {isCreating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            افزودن کاربر
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black px-3 py-2">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-black px-3 py-2">{successMsg}</div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-black text-slate-800">جدول نقش‌ها و مجوزهای دسترسی</div>
            <div className="text-[11px] font-bold text-slate-500">هر ستون یک نقش است. هر ماژول را می‌توانید برای هر نقش فعال کنید.</div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetMatrix}
              disabled={!hasMatrixChanges || isSavingMatrix}
              className={`h-8 px-2 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${(!hasMatrixChanges || isSavingMatrix) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              <RotateCcw size={12} />
              بازنشانی
            </button>
            <button
              type="button"
              onClick={handleSaveMatrix}
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
                            onClick={() => toggleModuleExpanded(group.id)}
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
                                onChange={() => setModuleEnabled(role, group, !status.checked)}
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
                                              onChange={() => toggleRolePermission(role, permission.key)}
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

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 text-sm font-black text-slate-800">لیست کاربران</div>

        {isLoading ? (
          <div className="p-6 text-center text-xs font-black text-slate-500 inline-flex w-full items-center justify-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            در حال دریافت کاربران...
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-xs font-black text-slate-500">کاربری ثبت نشده است.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="p-2 text-right font-black">نام کاربری</th>
                  <th className="p-2 text-right font-black">نام</th>
                  <th className="p-2 text-right font-black">سمت</th>
                  <th className="p-2 text-right font-black">نقش</th>
                  <th className="p-2 text-right font-black">وضعیت</th>
                  <th className="p-2 text-right font-black">تاریخ ایجاد</th>
                  <th className="p-2 text-right font-black">آخرین به‌روزرسانی</th>
                  <th className="p-2 text-center font-black">اقدامات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isEditing = editingUserId === String(user.id);
                  const isBusy = busyUserId === String(user.id);
                  const isCurrentUser = String(session?.username || '') === String(user.username || '');

                  return (
                    <tr key={user.id} className={user.isActive ? '' : 'bg-slate-50/80'}>
                      <td className="p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.username}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, username: e.target.value }))}
                            className="h-8 w-full rounded-lg border border-slate-200 px-2 font-bold"
                            dir="ltr"
                          />
                        ) : (
                          <span className="font-black text-slate-800">{user.username}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.fullName}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, fullName: e.target.value }))}
                            className="h-8 w-full rounded-lg border border-slate-200 px-2 font-bold"
                          />
                        ) : (
                          <span className="font-black text-slate-700">{user.fullName || user.username}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDraft.jobTitle}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, jobTitle: e.target.value }))}
                            className="h-8 w-full rounded-lg border border-slate-200 px-2 font-bold"
                            placeholder="سمت (اختیاری)"
                          />
                        ) : (
                          <span className="font-bold text-slate-600">{user.jobTitle || '-'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {isEditing ? (
                          <select
                            value={editDraft.role}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, role: e.target.value }))}
                            className="h-8 rounded-lg border border-slate-200 px-2 font-bold"
                          >
                            {availableRoleOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${roleBadgeClass(user.role)}`}>
                            {roleLabel(user.role)}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${user.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {user.isActive ? 'فعال' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="p-2 font-bold text-slate-600">{formatDateTime(user.createdAt)}</td>
                      <td className="p-2 font-bold text-slate-600">{formatDateTime(user.updatedAt)}</td>
                      <td className="p-2">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="password"
                              value={editDraft.password}
                              onChange={(e) => setEditDraft((prev) => ({ ...prev, password: e.target.value }))}
                              placeholder="رمز جدید (اختیاری)"
                              className="h-8 w-36 rounded-lg border border-slate-200 px-2 text-[11px] font-bold"
                              dir="ltr"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateUser({
                                id: Number(user.id),
                                username: String(editDraft.username || '').trim(),
                                fullName: String(editDraft.fullName || '').trim(),
                                jobTitle: String(editDraft.jobTitle || '').trim(),
                                role: String(editDraft.role || 'manager'),
                                ...(editDraft.password ? { password: editDraft.password } : {}),
                              })}
                              disabled={isBusy}
                              className="h-8 px-2 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-black inline-flex items-center gap-1"
                            >
                              {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                              ذخیره
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="h-8 px-2 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black inline-flex items-center gap-1"
                            >
                              <X size={12} />
                              انصراف
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditing(user)}
                              className="h-8 px-2 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black inline-flex items-center gap-1"
                            >
                              <Pencil size={12} />
                              ویرایش
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(user)}
                              disabled={isBusy || (isCurrentUser && user.isActive)}
                              className={`h-8 px-2 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${user.isActive ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'} ${(isBusy || (isCurrentUser && user.isActive)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isBusy ? <Loader2 size={12} className="animate-spin" /> : user.isActive ? <Trash2 size={12} /> : <RotateCcw size={12} />}
                              {user.isActive ? 'غیرفعال‌کردن' : 'فعال‌سازی کاربر'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
