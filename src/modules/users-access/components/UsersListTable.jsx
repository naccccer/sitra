import React from 'react';
import { Loader2, Pencil, RotateCcw, Save, Trash2, X } from 'lucide-react';
import { roleLabel, roleBadgeClass, formatDateTime } from '../hooks/useAdminUsersSettings';

export const UsersListTable = ({
  users,
  isLoading,
  session,
  busyUserId,
  editingUserId,
  editDraft,
  setEditDraft,
  availableRoleOptions,
  onStartEditing,
  onCancelEditing,
  onSaveUser,
  onToggleActive,
}) => (
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
                          onClick={() => onSaveUser({
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
                          onClick={onCancelEditing}
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
                          onClick={() => onStartEditing(user)}
                          className="h-8 px-2 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-black inline-flex items-center gap-1"
                        >
                          <Pencil size={12} />
                          ویرایش
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleActive(user)}
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
);
