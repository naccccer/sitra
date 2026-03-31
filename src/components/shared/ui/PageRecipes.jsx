import React from 'react';
import { Card } from '@/components/shared/ui/Card';
import { SolidIcon } from '@/components/shared/ui/IconGlyph';
import { cn } from '@/components/shared/ui/cn';

const STAT_TONE_CLASSNAMES = {
  default: 'surface-card',
  accent: 'surface-accent',
  quiet: 'surface-card-quiet',
  elevated: 'surface-card-elevated',
  inset: 'surface-soft-inset',
};

const BANNER_TONE_CLASSNAMES = {
  info: 'border-[rgba(var(--ui-info),0.22)] bg-[rgba(var(--ui-info),0.1)] text-[rgb(var(--ui-info))]',
  success: 'border-[rgba(var(--ui-success),0.22)] bg-[rgba(var(--ui-success),0.1)] text-[rgb(var(--ui-success))]',
  warning: 'border-[rgba(var(--ui-warning),0.22)] bg-[rgba(var(--ui-warning),0.12)] text-[rgb(var(--ui-warning))]',
  danger: 'border-[rgba(var(--ui-danger),0.2)] bg-[rgba(var(--ui-danger),0.1)] text-[rgb(var(--ui-danger))]',
};

const ALIGN_CLASSNAMES = {
  start: 'text-start',
  center: 'text-center',
  end: 'text-end',
};

const CELL_TONE_CLASSNAMES = {
  default: 'text-[rgb(var(--ui-text))]',
  muted: 'text-[rgb(var(--ui-text-muted))]',
  accent: 'text-[rgb(var(--ui-primary))]',
  danger: 'text-[rgb(var(--ui-danger))]',
};

export const PageHeader = ({
  className = '',
  eyebrow = '',
  title = '',
  description = '',
  actions = null,
}) => (
  <div className={cn('motion-enter flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className="min-w-0">
      {eyebrow ? (
        <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[rgb(var(--ui-accent))]">
          {eyebrow}
        </div>
      ) : null}
      {title ? <h2 className="text-lg font-black text-[rgb(var(--ui-text))] lg:text-xl">{title}</h2> : null}
      {description ? <p className="mt-1 text-sm font-bold text-[rgb(var(--ui-text-muted))]">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

export const StatsStrip = ({ className = '', children }) => (
  <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4', className)}>
    {children}
  </div>
);

export const StatCard = ({
  className = '',
  tone = 'default',
  icon = null,
  title = '',
  value = '',
  hint = '',
  footer = null,
}) => (
  <div className={cn('motion-enter-soft rounded-[var(--radius-xl)] p-4', STAT_TONE_CLASSNAMES[tone] || STAT_TONE_CLASSNAMES.default, className)}>
    {icon ? (
      <div className="surface-icon-chip mb-3 h-9 w-9 text-[rgb(var(--ui-primary))]">
        <SolidIcon icon={icon} size="sm" />
      </div>
    ) : null}
    {title ? <div className="text-xs font-bold text-[rgb(var(--ui-text-muted))]">{title}</div> : null}
    {value !== '' && value !== null ? <div className="mt-1 text-2xl font-black text-[rgb(var(--ui-text))]">{value}</div> : null}
    {hint ? <div className="mt-1 text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{hint}</div> : null}
    {footer ? <div className="mt-3">{footer}</div> : null}
  </div>
);

export const FilterToolbar = ({
  className = '',
  children = null,
  actions = null,
  surface = 'quiet',
}) => (
  <Card
    className={cn('motion-enter-soft space-y-3', className)}
    surface={surface}
    padding="md"
  >
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  </Card>
);

export const WorkspaceCard = ({
  className = '',
  title = '',
  description = '',
  actions = null,
  footer = null,
  children = null,
  surface = 'default',
  padding = 'none',
  bodyClassName = '',
}) => (
  <Card className={cn('motion-enter-soft overflow-hidden', className)} surface={surface} padding={padding}>
    {(title || description || actions) ? (
      <div className="flex items-center justify-between gap-3 border-b border-[rgba(var(--ui-border),0.9)] px-4 py-3">
        <div className="min-w-0">
          {title ? <div className="text-sm font-black text-[rgb(var(--ui-text))]">{title}</div> : null}
          {description ? <div className="mt-1 text-xs font-bold text-[rgb(var(--ui-text-muted))]">{description}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    ) : null}
    <div className={cn('min-w-0', padding === 'none' ? '' : 'p-4', bodyClassName)}>{children}</div>
    {footer ? <div className="border-t border-[rgba(var(--ui-border),0.9)] px-4 py-3">{footer}</div> : null}
  </Card>
);

export const TableShell = ({
  className = '',
  tableClassName = '',
  children = null,
  footer = null,
}) => (
  <div className={cn('table-shell motion-enter-soft', className)}>
    <div className="overflow-x-auto">
      <div className={cn('min-w-0', tableClassName)}>{children}</div>
    </div>
    {footer ? <div className="border-t border-[rgba(var(--ui-border),0.9)] px-4 py-3">{footer}</div> : null}
  </div>
);

export const Table = ({ className = '', children = null }) => (
  <table className={cn('w-full text-xs', className)}>{children}</table>
);

export const TableHead = ({ className = '', children = null }) => (
  <thead className={cn('bg-[rgba(var(--ui-primary),0.035)] text-[11px] font-black text-[rgb(var(--ui-text-muted))]', className)}>
    {children}
  </thead>
);

export const TableBody = ({ className = '', children = null }) => (
  <tbody className={cn('divide-y divide-[rgba(var(--ui-border),0.68)] bg-[rgba(var(--ui-surface-elevated),0.98)]', className)}>
    {children}
  </tbody>
);

export const TableRow = ({
  className = '',
  children = null,
  interactive = false,
  selected = false,
}) => (
  <tr
    className={cn(
      'transition-[background-color,opacity] duration-200',
      interactive ? 'hover:bg-[rgba(var(--ui-primary),0.035)]' : '',
      selected ? 'bg-[rgba(var(--ui-primary),0.06)]' : '',
      className,
    )}
  >
    {children}
  </tr>
);

export const TableHeaderCell = ({
  className = '',
  children = null,
  align = 'center',
  ...props
}) => (
  <th
    className={cn(
      'border-s border-[rgba(var(--ui-border),0.42)] px-3 py-3 font-black first:border-s-0',
      ALIGN_CLASSNAMES[align] || ALIGN_CLASSNAMES.center,
      className,
    )}
    {...props}
  >
    {children}
  </th>
);

export const TableCell = ({
  className = '',
  children = null,
  align = 'center',
  tone = 'default',
  numeric = false,
  ...props
}) => (
  <td
    className={cn(
      'border-s border-[rgba(var(--ui-border),0.34)] px-3 py-3 first:border-s-0',
      ALIGN_CLASSNAMES[align] || ALIGN_CLASSNAMES.center,
      CELL_TONE_CLASSNAMES[tone] || CELL_TONE_CLASSNAMES.default,
      numeric ? 'tabular-nums' : '',
      className,
    )}
    {...props}
  >
    {children}
  </td>
);

export const StatusBanner = ({
  className = '',
  tone = 'info',
  title = '',
  description = '',
  action = null,
}) => (
  <div className={cn('motion-enter-soft rounded-[var(--radius-lg)] border px-4 py-3', BANNER_TONE_CLASSNAMES[tone] || BANNER_TONE_CLASSNAMES.info, className)}>
    {title ? <div className="text-xs font-black">{title}</div> : null}
    {description ? <div className="mt-1 text-xs font-bold opacity-90">{description}</div> : null}
    {action ? <div className="mt-3">{action}</div> : null}
  </div>
);

export const LoadingState = ({
  className = '',
  title = 'در حال بارگذاری',
  description = '',
  surface = 'quiet',
}) => (
  <Card className={cn('motion-enter-soft text-center', className)} surface={surface} padding="lg">
    <div className="mx-auto mb-3 h-10 w-10 animate-pulse rounded-full border border-[rgba(var(--ui-border),0.9)] bg-[rgba(var(--ui-surface-elevated),0.96)] shadow-ui-soft" />
    <div className="text-sm font-black text-[rgb(var(--ui-text))]">{title}</div>
    {description ? <div className="mt-1 text-xs font-bold text-[rgb(var(--ui-text-muted))]">{description}</div> : null}
  </Card>
);
