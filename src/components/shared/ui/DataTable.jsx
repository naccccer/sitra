import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { Badge } from '@/components/shared/ui/Badge';
import { Card } from '@/components/shared/ui/Card';
import { EmptyState } from '@/components/shared/ui/EmptyState';
import { InlineAlert } from '@/components/shared/ui/InlineAlert';
import { WorkspaceDetailPanel } from '@/components/shared/ui/WorkspaceDetailPanel';
import { cn } from '@/components/shared/ui/cn';

const ALIGN_CLASSNAMES = { start: 'text-start', center: 'text-center', end: 'text-end' };
const ROW_TONE_CLASSNAMES = {
  default: 'even:bg-[rgb(var(--ui-surface-muted))]/18 even:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-8px_16px_rgba(15,23,42,0.012)] hover:bg-[rgb(var(--ui-accent-muted))]/24',
  muted: 'bg-[rgb(var(--ui-surface-muted))]/55 text-[rgb(var(--ui-text-muted))]',
};

export const DataTable = ({ children, className = '', minWidthClass = 'min-w-full', footer = null }) => (
  <Card className={cn('overflow-hidden', className)} padding="none">
    <div className="overflow-x-auto">
      <table className={cn('w-full border-separate border-spacing-0 text-sm', minWidthClass)}>{children}</table>
    </div>
    {footer ? <div className="rounded-b-[var(--radius-xl)] bg-[rgb(var(--ui-surface-muted))] px-2 pb-2 pt-1.5">{footer}</div> : null}
  </Card>
);

export const DataTableHead = ({ children, className = '' }) => (
  <thead className={cn('border-b border-[rgb(var(--ui-border-soft))]/14 bg-[rgb(var(--ui-surface-muted))] text-[12px] font-extrabold text-[rgb(var(--ui-text))]/72', className)}>{children}</thead>
);

export const DataTableBody = ({ children, className = '' }) => (
  <tbody className={cn('bg-white', className)}>{children}</tbody>
);

export const DataTableRow = ({ children, className = '', selected = false, expanded = false, tone = 'default', ...props }) => (
  <tr className={cn('shadow-[inset_0_-1px_0_rgba(120,113,108,0.08)] transition-colors last:shadow-none', ROW_TONE_CLASSNAMES[tone] || ROW_TONE_CLASSNAMES.default, selected ? 'bg-[rgb(var(--ui-info-bg))]/45' : '', expanded ? 'bg-[rgb(var(--ui-accent-muted))]/32' : '', className)} {...props}>{children}</tr>
);

export const DataTableHeaderCell = ({ children, className = '', align = 'start', ...props }) => (
  <th className={cn('px-3 py-3 font-extrabold first:rounded-tr-[var(--radius-xl)] last:rounded-tl-[var(--radius-xl)]', ALIGN_CLASSNAMES[align] || ALIGN_CLASSNAMES.start, className)} {...props}>{children}</th>
);

export const DataTableCell = ({ children, className = '', align = 'start', tone = 'default', ...props }) => (
  <td className={cn('px-3 py-3', ALIGN_CLASSNAMES[align] || ALIGN_CLASSNAMES.start, tone === 'emphasis' ? 'font-semibold text-[rgb(var(--ui-text))]' : 'font-medium text-[rgb(var(--ui-text-muted))]', className)} {...props}>{children}</td>
);

export const DataTableStatusCell = ({ children, tone = 'neutral', className = '' }) => (
  <div className={cn('flex justify-center', className)}><Badge tone={tone}>{children}</Badge></div>
);

export const DataTableActions = ({ children, className = '' }) => (
  <div className={cn('flex items-center justify-center gap-1.5', className)}>{children}</div>
);

export const DataTableState = ({
  colSpan = 1,
  state = 'empty',
  title = '',
  description = '',
  action = null,
}) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-6">
      {state === 'loading' ? (
        <div className="flex items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-dashed border-[rgb(var(--ui-border))] bg-[rgb(var(--ui-surface-muted))]/45 px-4 py-6 text-sm font-black text-[rgb(var(--ui-text-muted))]">
          <LoaderCircle size={18} className="animate-spin" />
          {title || 'در حال بارگذاری داده‌ها'}
        </div>
      ) : state === 'error' ? (
        <InlineAlert tone="danger" title={title || 'خطا در بارگذاری'}>{description || 'بخش داده‌ها در حال حاضر قابل نمایش نیست.'}</InlineAlert>
      ) : (
        <EmptyState title={title || 'داده‌ای برای نمایش وجود ندارد'} description={description} action={action} />
      )}
    </td>
  </tr>
);

export const DataTableDetail = ({ colSpan = 1, children, className = '', title = '', description = '', actions = null }) => (
  <tr>
    <td colSpan={colSpan} className="p-3">
      <WorkspaceDetailPanel title={title} description={description} actions={actions} className={className}>
        {children}
      </WorkspaceDetailPanel>
    </td>
  </tr>
);
