import React from 'react';
import { Search } from 'lucide-react';
import { toPN } from '@/utils/helpers';
import { Badge, Card, Input } from '@/components/shared/ui';

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
}) => (
  <Card className="print-hide space-y-3" padding="md">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex w-full gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 hide-scrollbar md:w-auto">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`focus-ring whitespace-nowrap rounded-md px-3 py-2 text-[11px] font-black transition-colors sm:text-xs ${
              activeOrdersTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative w-full md:w-80">
        <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="جستجو کد، نام یا موبایل..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="bg-slate-50 pr-9"
        />
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-2 text-xs">
      <Badge tone="neutral">کل فعال: {toPN(tabCounts.all)}</Badge>
      <Badge tone="warning">در انتظار: {toPN(tabCounts.pending)}</Badge>
      <Badge tone="info">در حال انجام: {toPN(tabCounts.processing)}</Badge>
      <Badge tone="success">تحویل‌شده: {toPN(tabCounts.delivered)}</Badge>
      <Badge tone="neutral">بایگانی: {toPN(tabCounts.archived)}</Badge>
    </div>
  </Card>
);
