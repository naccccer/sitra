import React from 'react';
import { Loader2, UserPlus } from 'lucide-react';

export const CreateUserForm = ({ createDraft, setCreateDraft, availableRoleOptions, isCreating, onSubmit }) => (
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
        onClick={onSubmit}
        disabled={isCreating}
        className={`h-10 rounded-lg text-xs font-black inline-flex items-center justify-center gap-1.5 ${isCreating ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
      >
        {isCreating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
        افزودن کاربر
      </button>
    </div>
  </div>
);
