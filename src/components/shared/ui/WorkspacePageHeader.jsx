import React from 'react';
import { cn } from '@/components/shared/ui/cn';
import { SectionHeader } from '@/components/shared/ui/SectionHeader';

export const WorkspacePageHeader = ({
  eyebrow = '',
  title = '',
  description = '',
  actions = null,
  summary = null,
  className = '',
}) => (
  <div className={cn('space-y-3 px-1', className)}>
    <SectionHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
    {summary ? <div className="flex flex-wrap items-center gap-2">{summary}</div> : null}
  </div>
);
