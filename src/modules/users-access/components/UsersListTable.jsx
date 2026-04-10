import React from 'react'
import { Loader2 } from 'lucide-react'
import {
  Badge,
  Button,
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
  FilterRow,
  IconButton,
  Input,
  Select,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import { formatDateTime, roleBadgeClass, roleLabel } from '../hooks/useAdminUsersSettings'

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
  view,
  onChangeView,
  onLifecycleAction,
}) => (
  <div dir="rtl">
    <DataTable
      minWidthClass="min-w-[1180px]"
      toolbar={(
        <WorkspaceToolbar embedded>
          <FilterRow>
            <div>
              <div className="text-sm font-black text-[rgb(var(--ui-text))]">لیست کاربران</div>
              <div className="text-xs font-bold text-[rgb(var(--ui-text-muted))]">مدیریت نقش، وضعیت و مشخصات پایه کاربران در یک جدول مشترک</div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant={view === 'active' ? 'primary' : 'secondary'} onClick={() => onChangeView('active')}>فعال</Button>
              <IconButton action="archive" selected={view === 'archived'} label={view === 'archived' ? 'بازگشت به فعال‌ها' : 'نمایش بایگانی'} tooltip={view === 'archived' ? 'بازگشت به فعال‌ها' : 'نمایش بایگانی'} onClick={() => onChangeView(view === 'archived' ? 'active' : 'archived')} />
            </div>
          </FilterRow>
        </WorkspaceToolbar>
      )}
    >
      <DataTableHead>
        <tr>
          <DataTableHeaderCell>نام کاربری</DataTableHeaderCell>
          <DataTableHeaderCell>نام</DataTableHeaderCell>
          <DataTableHeaderCell>سمت</DataTableHeaderCell>
          <DataTableHeaderCell align="center">نقش</DataTableHeaderCell>
          <DataTableHeaderCell align="center">وضعیت</DataTableHeaderCell>
          <DataTableHeaderCell align="center">تاریخ ایجاد</DataTableHeaderCell>
          <DataTableHeaderCell align="center">آخرین به‌روزرسانی</DataTableHeaderCell>
          <DataTableHeaderCell align="center">اقدامات</DataTableHeaderCell>
        </tr>
      </DataTableHead>
      <DataTableBody>
        {isLoading ? (
          <DataTableState colSpan={8} state="loading" title="در حال دریافت کاربران..." />
        ) : users.length === 0 ? (
          <DataTableState colSpan={8} title="کاربری ثبت نشده است." />
        ) : users.map((user) => {
          const isEditing = editingUserId === String(user.id)
          const isBusy = busyUserId === String(user.id)
          const isCurrentUser = String(session?.username || '') === String(user.username || '')

          return (
            <DataTableRow key={user.id} tone={user.isActive ? 'default' : 'muted'}>
              <DataTableCell tone="emphasis">
                {isEditing ? (
                  <Input
                    type="text"
                    value={editDraft.username}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, username: event.target.value }))}
                    size="sm"
                    dir="ltr"
                  />
                ) : (
                  <span className="font-black tabular-nums text-[rgb(var(--ui-text))]" dir="ltr">{user.username}</span>
                )}
              </DataTableCell>
              <DataTableCell tone="emphasis">
                {isEditing ? (
                  <Input
                    type="text"
                    value={editDraft.fullName}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, fullName: event.target.value }))}
                    size="sm"
                  />
                ) : (
                  <span className="font-black text-[rgb(var(--ui-text))]">{user.fullName || user.username}</span>
                )}
              </DataTableCell>
              <DataTableCell>
                {isEditing ? (
                  <Input
                    type="text"
                    value={editDraft.jobTitle}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, jobTitle: event.target.value }))}
                    size="sm"
                    placeholder="سمت (اختیاری)"
                  />
                ) : (
                  user.jobTitle || '-'
                )}
              </DataTableCell>
              <DataTableCell align="center">
                {isEditing ? (
                  <Select
                    value={editDraft.role}
                    onChange={(event) => setEditDraft((prev) => ({ ...prev, role: event.target.value }))}
                    size="sm"
                    className="min-w-[130px]"
                  >
                    {availableRoleOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                ) : (
                  <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${roleBadgeClass(user.role)}`}>
                    {roleLabel(user.role)}
                  </span>
                )}
              </DataTableCell>
              <DataTableCell align="center">
                <Badge tone={user.isActive ? 'success' : 'neutral'}>{user.isActive ? 'فعال' : 'بایگانی‌شده'}</Badge>
              </DataTableCell>
              <DataTableCell align="center" className="tabular-nums" dir="ltr">{formatDateTime(user.createdAt)}</DataTableCell>
              <DataTableCell align="center" className="tabular-nums" dir="ltr">{formatDateTime(user.updatedAt)}</DataTableCell>
              <DataTableCell align="center">
                {isEditing ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Input
                      type="password"
                      value={editDraft.password}
                      onChange={(event) => setEditDraft((prev) => ({ ...prev, password: event.target.value }))}
                      size="sm"
                      placeholder="رمز جدید (اختیاری)"
                      className="w-40"
                      dir="ltr"
                    />
                    <Button
                      action="save"
                      showActionIcon
                      size="sm"
                      onClick={() => onSaveUser({
                        id: Number(user.id),
                        username: String(editDraft.username || '').trim(),
                        fullName: String(editDraft.fullName || '').trim(),
                        jobTitle: String(editDraft.jobTitle || '').trim(),
                        role: String(editDraft.role || 'manager'),
                        ...(editDraft.password ? { password: editDraft.password } : {}),
                      })}
                      disabled={isBusy}
                      loading={isBusy}
                    >
                      ذخیره
                    </Button>
                    <Button action="cancel" showActionIcon size="sm" onClick={onCancelEditing}>انصراف</Button>
                  </div>
                ) : (
                  <DataTableActions>
                    <IconButton action="edit" label="ویرایش کاربر" tooltip="ویرایش کاربر" onClick={() => onStartEditing(user)} />
                    {view === 'active' ? (
                      <IconButton
                        action="archive"
                        label="بایگانی کاربر"
                        tooltip="بایگانی کاربر"
                        onClick={() => onLifecycleAction(user, 'archive')}
                        disabled={isBusy || isCurrentUser}
                      >
                        {isBusy ? <Loader2 size={14} className="animate-spin" /> : null}
                      </IconButton>
                    ) : (
                      <>
                        <IconButton
                          action="restore"
                          label="بازگردانی کاربر"
                          tooltip="بازگردانی کاربر"
                          onClick={() => onLifecycleAction(user, 'restore')}
                          disabled={isBusy}
                        />
                        <IconButton
                          action="delete"
                          label="حذف کاربر"
                          tooltip="حذف کاربر"
                          onClick={() => onLifecycleAction(user, 'delete')}
                          disabled={isBusy}
                        >
                          {isBusy ? <Loader2 size={14} className="animate-spin" /> : null}
                        </IconButton>
                      </>
                    )}
                  </DataTableActions>
                )}
              </DataTableCell>
            </DataTableRow>
          )
        })}
      </DataTableBody>
    </DataTable>
  </div>
)
