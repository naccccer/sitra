import React from 'react';
import { cn } from '@/components/shared/ui/cn';

const TONE_CLASSNAMES = {
  info: 'border-[rgb(var(--ui-info-border))] bg-[rgb(var(--ui-info-bg))] text-[rgb(var(--ui-info-text))]',
  success: 'border-[rgb(var(--ui-success-border))] bg-[rgb(var(--ui-success-bg))] text-[rgb(var(--ui-success-text))]',
  warning: 'border-[rgb(var(--ui-warning-border))] bg-[rgb(var(--ui-warning-bg))] text-[rgb(var(--ui-warning-text))]',
  danger: 'border-[rgb(var(--ui-danger-border))] bg-[rgb(var(--ui-danger-bg))] text-[rgb(var(--ui-danger-text))]',
  neutral: 'border-[rgb(var(--ui-border))] bg-[rgb(var(--ui-surface-muted))] text-[rgb(var(--ui-text-muted))]',
  archived: 'border-[rgb(var(--ui-state-archived-border))] bg-[rgb(var(--ui-state-archived-bg))] text-[rgb(var(--ui-state-archived-text))]',
};

export const InlineAlert = ({
  tone = 'neutral',
  className = '',
  children,
  title = '',
  actions = null,
}) => (
  <div
    className={cn(
      'rounded-[var(--radius-xl)] border px-4 py-3 text-xs font-black shadow-[var(--shadow-soft)]',
      TONE_CLASSNAMES[tone] || TONE_CLASSNAMES.neutral,
      className,
    )}
  >
    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
      <div>
        {title ? <div className="mb-1 text-sm text-current">{title}</div> : null}
        {children}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  </div>
);
