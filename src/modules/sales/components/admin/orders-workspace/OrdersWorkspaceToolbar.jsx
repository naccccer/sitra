import React from 'react';
import { Search } from 'lucide-react';
import { Badge, FilterRow, Input, WorkspaceToolbar } from '@/components/shared/ui';
import { toPN } from '@/utils/helpers';

const TAB_OPTIONS = [
  { id: 'all', label: 'همه سفارش‌ها' },
  { id: 'pending', label: 'ثبت‌شده / پیگیری' },
  { id: 'processing', label: 'در حال انجام / آماده تحویل' },
  { id: 'delivered', label: 'تحویل‌شده' },
  { id: 'archived', label: 'بایگانی' },
];

export const OrdersWorkspaceToolbar = ({
  activeOrdersTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  tabCounts,
  filteredCount = 0,
  createAction = null,
}) => (
  <WorkspaceToolbar
    className="print-hide"
    actions={createAction}
    summary={(
      <>
        <Badge tone="accent">نتیجه جاری: {toPN(filteredCount)}</Badge>
        <Badge tone="neutral">کل فعال: {toPN(tabCounts.all)}</Badge>
        <Badge tone="warning">در انتظار: {toPN(tabCounts.pending)}</Badge>
        <Badge tone="info">در حال انجام: {toPN(tabCounts.processing)}</Badge>
        <Badge tone="success">تحویل‌شده: {toPN(tabCounts.delivered)}</Badge>
        <Badge tone="neutral">بایگانی: {toPN(tabCounts.archived)}</Badge>
      </>
    )}
  >
    <FilterRow className="justify-between gap-3">
      <div className="flex w-full gap-1 overflow-x-auto rounded-[var(--radius-lg)] bg-[rgb(var(--ui-surface-muted))] p-1 hide-scrollbar md:w-auto">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`focus-ring whitespace-nowrap rounded-[var(--radius-md)] px-2.5 py-1.5 text-[10px] font-semibold transition-colors sm:text-[11px] ${
              activeOrdersTab === tab.id
                ? 'bg-white text-[rgb(var(--ui-text))] shadow-[var(--shadow-soft)]'
                : 'text-[rgb(var(--ui-text-muted))] hover:text-[rgb(var(--ui-text))]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
    </FilterRow>
  </WorkspaceToolbar>
);
