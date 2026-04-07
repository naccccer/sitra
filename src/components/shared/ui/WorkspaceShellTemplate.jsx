import React from 'react';
import { WorkspacePageHeader } from '@/components/shared/ui/WorkspacePageHeader';
import { cn } from '@/components/shared/ui/cn';

export const WorkspaceShellTemplate = ({
  eyebrow = '',
  title = '',
  description = '',
  summary = null,
  actions = null,
  tabs = null,
  toolbar = null,
  children,
  className = '',
  showHeader = true,
}) => (
  <section className={cn('mx-auto max-w-[1400px] space-y-4', className)} dir="rtl">
    {showHeader ? (
      <WorkspacePageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        summary={summary}
        actions={actions}
      />
    ) : null}
    {tabs ? <div>{tabs}</div> : null}
    {toolbar ? <div>{toolbar}</div> : null}
    <div>{children}</div>
  </section>
);
