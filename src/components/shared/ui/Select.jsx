import React, { forwardRef } from 'react';
import { cn } from '@/components/shared/ui/cn';

const SIZE_CLASSNAMES = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-10 px-3 text-sm',
  lg: 'h-11 px-4 text-sm',
};

export const Select = forwardRef(({
  className = '',
  children,
  size = 'md',
  invalid = false,
  ...props
}, ref) => (
  <select
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      'focus-ring w-full rounded-[var(--radius-md)] border bg-white font-bold text-[rgb(var(--ui-text))] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] transition duration-[var(--motion-fast)]',
      invalid
        ? 'border-[rgb(var(--ui-danger-border))] bg-[rgb(var(--ui-danger-bg))]/25'
        : 'border-[rgb(var(--ui-border))] hover:border-[rgb(var(--ui-accent-border))]',
      SIZE_CLASSNAMES[size] || SIZE_CLASSNAMES.md,
      className,
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = 'Select';
