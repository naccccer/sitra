import React from 'react';
import { Badge } from '@/components/shared/ui/Badge';
import { Card } from '@/components/shared/ui/Card';
import { UniversalState } from '@/components/shared/ui/UniversalState';
import { WorkspaceDetailPanel } from '@/components/shared/ui/WorkspaceDetailPanel';
import { cn } from '@/components/shared/ui/cn';

const ALIGN_CLASSNAMES = { start: 'text-start', center: 'text-center', end: 'text-end' };
const ROW_TONE_CLASSNAMES = {
  default: 'even:bg-[linear-gradient(180deg,rgba(250,250,251,0.98),rgba(242,244,248,0.94))] even:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.95),0_10px_26px_rgba(18,33,74,0.08)] hover:bg-[rgb(var(--ui-accent-muted))]/32',
  muted: 'bg-[rgb(var(--ui-surface-muted))]/55 text-[rgb(var(--ui-text-muted))]',
};

export const DataTable = ({ children, className = '', minWidthClass = 'min-w-full', toolbar = null, footer = null }) => (
  <Card className={cn('overflow-hidden bg-white', className)} padding="none">
    {toolbar ? (
      <div className="px-4 py-4">
        {toolbar}
      </div>
    ) : null}
    <div className="px-4">
      <div className="overflow-x-auto">
        <table className={cn('w-full border-separate border-spacing-0 text-sm', minWidthClass)}>{children}</table>
      </div>
    </div>
    {footer ? (
      <div className="rounded-b-[var(--radius-xl)] border-t border-[rgb(var(--ui-border-soft))] bg-[linear-gradient(180deg,rgba(247,247,248,0.99),rgba(240,240,242,0.96))] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_-8px_24px_rgba(18,33,74,0.08)]">
        {footer}
      </div>
    ) : null}
  </Card>
);

export const DataTableHead = ({ children, className = '' }) => (
  <thead
    className={cn(
      'border-b border-[rgb(var(--ui-primary))]/75 bg-[linear-gradient(180deg,rgba(16,20,30,0.98),rgba(8,12,24,0.96))] text-[12px] font-extrabold text-white/90 shadow-[inset_0_-1px_0_rgba(255,255,255,0.05),0_10px_22px_rgba(18,33,74,0.18)] backdrop-blur-[18px]',
      className,
    )}
  >
    {children}
  </thead>
);

export const DataTableBody = ({ children, className = '' }) => (
  <tbody className={cn('bg-white', className)}>{children}</tbody>
);

export const DataTableRow = ({ children, className = '', selected = false, expanded = false, tone = 'default', ...props }) => (
  <tr className={cn('shadow-[inset_0_-1px_0_rgba(88,99,124,0.12)] transition-colors last:shadow-none', ROW_TONE_CLASSNAMES[tone] || ROW_TONE_CLASSNAMES.default, selected ? 'bg-[rgb(var(--ui-info-bg))]/52' : '', expanded ? 'bg-[rgb(var(--ui-accent-muted))]/42' : '', className)} {...props}>{children}</tr>
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
      <UniversalState
        state={state}
        title={title || (state === 'loading' ? 'در حال بارگذاری داده‌ها' : '')}
        description={description}
        action={action}
      />
    </td>
  </tr>
);

export const DataTableDetail = ({ colSpan = 1, children, className = '', title = '', description = '', actions = null, summary = null }) => (
  <tr>
    <td colSpan={colSpan} className="p-3">
      <WorkspaceDetailPanel title={title} description={description} actions={actions} summary={summary} className={className}>
        {children}
      </WorkspaceDetailPanel>
    </td>
  </tr>
);
