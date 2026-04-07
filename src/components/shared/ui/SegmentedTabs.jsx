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
  <div className={cn('flex gap-1 overflow-x-auto rounded-[var(--radius-2xl)] bg-[rgb(var(--ui-surface-muted))]/92 p-1.5 hide-scrollbar', className)}>
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        aria-pressed={activeId === tab.id}
        className={cn(
          'focus-ring whitespace-nowrap rounded-[var(--radius-xl)] px-3 py-2 text-xs font-black transition',
          activeId === tab.id
            ? 'bg-[rgb(var(--ui-primary))] text-white shadow-[var(--shadow-soft)]'
            : 'text-[rgb(var(--ui-text-muted))] hover:bg-white/70 hover:text-[rgb(var(--ui-text))]',
          tabClassName,
        )}
      >
        <span className={cn('inline-flex items-center', wrapperClassName)}>{tab.label}</span>
      </button>
    ))}
  </div>
);
