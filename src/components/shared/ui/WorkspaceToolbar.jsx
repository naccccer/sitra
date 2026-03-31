import React from 'react';
import { cn } from '@/components/shared/ui/cn';

export const WorkspaceToolbar = ({
  children,
  actions = null,
  summary = null,
  className = '',
}) => (
  <div className={cn('workspace-toolbar space-y-3', className)}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
    {summary ? <div className="flex flex-wrap items-center gap-2">{summary}</div> : null}
  </div>
);
