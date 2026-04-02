import React from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Button, Card, Input, Select } from '@/components/shared/ui';

export const CreateUserForm = ({ createDraft, setCreateDraft, availableRoleOptions, isCreating, onSubmit }) => (
  <Card padding="md" className="space-y-3">
    <div className="text-sm font-black text-[rgb(var(--ui-text))]">ایجاد کاربر جدید</div>
    <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
      <Input
        type="text"
        value={createDraft.username}
        onChange={(e) => setCreateDraft((prev) => ({ ...prev, username: e.target.value }))}
        placeholder="نام کاربری"
        className="h-10 text-sm"
        dir="ltr"
      />
      <Input
        type="text"
        value={createDraft.fullName}
        onChange={(e) => setCreateDraft((prev) => ({ ...prev, fullName: e.target.value }))}
        placeholder="نام کاربر *"
        className="h-10 text-sm"
      />
      <Input
        type="text"
        value={createDraft.jobTitle}
        onChange={(e) => setCreateDraft((prev) => ({ ...prev, jobTitle: e.target.value }))}
        placeholder="سمت (اختیاری)"
        className="h-10 text-sm"
      />
      <Input
        type="password"
        value={createDraft.password}
        onChange={(e) => setCreateDraft((prev) => ({ ...prev, password: e.target.value }))}
        placeholder="رمز عبور (حداقل 6)"
        className="h-10 text-sm"
        dir="ltr"
      />
      <Select
        value={createDraft.role}
        onChange={(e) => setCreateDraft((prev) => ({ ...prev, role: e.target.value }))}
        className="h-10 text-sm"
      >
        {availableRoleOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select>
      <Button
        type="button"
        onClick={onSubmit}
        disabled={isCreating}
        action="create"
        showActionIcon
        className="h-10 text-xs"
      >
        {isCreating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
        افزودن کاربر
      </Button>
    </div>
  </Card>
);
