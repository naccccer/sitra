import React from 'react';
import { Button } from '@/components/shared/ui/Button';
import { Select } from '@/components/shared/ui/Select';
import { cn } from '@/components/shared/ui/cn';

export const PaginationBar = ({
  page = 1,
  totalPages = 1,
  totalCount = 0,
  pageSize = 25,
  pageSizeOptions = [],
  onPageChange = () => {},
  onPageSizeChange = null,
  continuation = null,
  className = '',
}) => (
  <div className={cn('flex w-full flex-col gap-2 py-1', className)}>
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-bold text-[rgb(var(--ui-text-muted))]">
        صفحه {page} از {Math.max(1, totalPages)} - {totalCount} نتیجه
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        {onPageSizeChange && pageSizeOptions.length > 0 ? (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">تعداد ردیف:</span>
            <Select
              className="min-w-[80px] whitespace-nowrap bg-transparent shadow-none"
              size="sm"
              value={String(pageSize)}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option} ردیف
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
          قبلی
        </Button>
        <span className="rounded-[var(--radius-md)] px-2 py-1 text-xs font-black text-[rgb(var(--ui-text))]">{page}</span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(Math.min(totalPages, page + 1))}>
          بعدی
        </Button>
      </div>
    </div>

    {continuation ? (
      <div className="flex justify-center border-t border-[rgb(var(--ui-border-soft))] pt-2">
        {continuation}
      </div>
    ) : null}
  </div>
);
