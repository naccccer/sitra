import React from 'react';
import { Search } from 'lucide-react';
import { FilterRow, IconButton, Input, SegmentedTabs, WorkspaceToolbar } from '@/components/shared/ui';

const TAB_OPTIONS = [
  { id: 'all', label: 'همه سفارش‌ها' },
  { id: 'pending', label: 'ثبت‌شده / پیگیری' },
  { id: 'processing', label: 'در حال انجام / آماده تحویل' },
  { id: 'delivered', label: 'تحویل‌شده' },
];

export const OrdersWorkspaceToolbar = ({
  activeOrdersTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  onArchiveModeToggle,
  onReload,
  loading = false,
  createAction = null,
}) => (
  <WorkspaceToolbar
    className="print-hide"
    actions={createAction}
  >
    <FilterRow className="justify-between gap-3">
      <SegmentedTabs tabs={TAB_OPTIONS} activeId={activeOrdersTab} onChange={onTabChange} className="w-full md:w-auto" />

      <div className="flex w-fit shrink-0 flex-nowrap items-center gap-2" dir="ltr">
        <div className="relative w-full md:w-80">
          <Search size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--ui-text-muted))]" />
          <Input
            type="text"
            placeholder="جستجو کد، نام یا موبایل..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            size="sm"
            className="bg-white/90 pr-9 text-[12px]"
          />
        </div>
        <IconButton
          action="archive"
          variant={activeOrdersTab === 'archived' ? 'primary' : 'secondary'}
          label={activeOrdersTab === 'archived' ? 'بازگشت به لیست اصلی' : 'نمایش بایگانی'}
          tooltip={activeOrdersTab === 'archived' ? 'بازگشت به لیست اصلی' : 'نمایش بایگانی'}
          onClick={onArchiveModeToggle}
        />
        <IconButton action="reload" label="بازخوانی" tooltip="بازخوانی" onClick={onReload} disabled={loading} loading={loading} />
      </div>
    </FilterRow>
  </WorkspaceToolbar>
);
