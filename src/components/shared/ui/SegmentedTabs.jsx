import React from 'react';
import { cn } from '@/components/shared/ui/cn';

export const SegmentedTabs = ({
  tabs = [],
  activeId = null,
  onChange = () => {},
  className = '',
  tabClassName = '',
  wrapperClassName = '',
}) => (
  <div className={cn('flex gap-1 overflow-x-auto rounded-[var(--radius-xl)] bg-[rgb(var(--ui-surface-muted))] p-1 hide-scrollbar', className)}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        aria-pressed={activeId === tab.id}
        className={cn(
          'focus-ring whitespace-nowrap rounded-[var(--radius-lg)] px-3 py-1.5 text-xs font-black transition-colors',
          activeId === tab.id
            ? 'bg-[rgb(234,88,12)] text-white shadow-[0_8px_20px_rgba(234,88,12,0.24)]'
            : 'text-[rgb(var(--ui-text-muted))] hover:text-[rgb(var(--ui-text))]',
          tabClassName,
        )}
      >
        <span className={cn('inline-flex items-center', wrapperClassName)}>{tab.label}</span>
      </button>
    ))}
  </div>
);
