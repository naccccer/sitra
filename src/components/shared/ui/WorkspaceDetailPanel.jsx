import React from 'react';
import { cn } from '@/components/shared/ui/cn';

export const WorkspaceDetailPanel = ({
  title = '',
  description = '',
  actions = null,
  summary = null,
  children,
  className = '',
}) => (
  <div className={cn('rounded-[var(--radius-xl)] border border-[rgb(var(--ui-border))] bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]', className)}>
    {(title || description || actions) ? (
      <div className="mb-3 flex flex-col gap-3 border-b border-[rgb(var(--ui-border-soft))] pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          {title ? <div className="text-sm font-black text-[rgb(var(--ui-text))]">{title}</div> : null}
          {description ? <div className="mt-1 text-xs font-bold text-[rgb(var(--ui-text-muted))]">{description}</div> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    ) : null}
    {summary ? <div className="mb-3 flex flex-wrap gap-2 border-b border-[rgb(var(--ui-border-soft))] pb-3">{summary}</div> : null}
    {children}
  </div>
);
