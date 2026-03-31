import React from 'react';
import { Search } from 'lucide-react';
import { toPN } from '@/utils/helpers';
import { Badge, FilterToolbar, Input } from '@/components/shared/ui';

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
  resultCount = 0,
}) => (
  <FilterToolbar
    className="print-hide"
    surface="glass"
    actions={(
      <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
        <Badge tone="neutral" emphasis="outline">نمایش {toPN(resultCount)} مورد</Badge>
        <div className="relative w-full md:w-80">
          <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--ui-text-muted))]" />
          <Input
            type="text"
            placeholder="جست‌وجو کد، نام یا موبایل..."
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            surface="quiet"
            className="pr-9"
          />
        </div>
      </div>
    )}
  >
    <div className="space-y-3">
      <div className="hide-scrollbar flex w-full gap-1 overflow-x-auto rounded-[var(--radius-lg)] border border-[rgba(var(--ui-border),0.78)] bg-[rgba(var(--ui-surface-muted),0.84)] p-1 md:w-auto">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`focus-ring whitespace-nowrap rounded-[var(--radius-md)] border px-3 py-2 text-[11px] font-black transition-[background-color,border-color,color,box-shadow] sm:text-xs ${
              activeOrdersTab === tab.id
                ? 'border-[rgba(var(--ui-primary),0.92)] bg-[rgb(var(--ui-primary))] text-[rgb(var(--ui-primary-contrast))] shadow-ui-soft'
                : 'border-transparent bg-transparent text-[rgb(var(--ui-text-muted))] hover:bg-[rgba(var(--ui-primary),0.06)] hover:text-[rgb(var(--ui-primary))]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge tone="neutral" emphasis="outline">کل فعال: {toPN(tabCounts.all)}</Badge>
        <Badge tone="warning">در انتظار: {toPN(tabCounts.pending)}</Badge>
        <Badge tone="info">در حال انجام: {toPN(tabCounts.processing)}</Badge>
        <Badge tone="success">تحویل‌شده: {toPN(tabCounts.delivered)}</Badge>
        <Badge tone="neutral">بایگانی: {toPN(tabCounts.archived)}</Badge>
      </div>
    </div>
  </FilterToolbar>
);
