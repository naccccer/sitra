import React, { forwardRef } from 'react';
import { cn } from '@/components/shared/ui/cn';

const DENSITY_CLASSNAMES = {
  compact: 'h-9 text-xs',
  default: 'h-10 text-sm',
  comfortable: 'h-11 text-sm',
};

const SURFACE_CLASSNAMES = {
  default: 'bg-ui-surface',
  quiet: 'bg-ui-muted',
  glass: 'bg-ui-glass backdrop-blur-sm',
};

export const Input = forwardRef(({
  className = '',
  density = 'default',
  surface = 'default',
  ...props
}, ref) => (
  <input
    ref={ref}
    className={cn(
      'focus-ring w-full rounded-[var(--radius-md)] border border-[rgba(var(--ui-border),0.95)] px-3 font-bold text-[rgb(var(--ui-text))] placeholder:text-[rgb(var(--ui-text-muted))] shadow-[var(--shadow-inset)]',
      DENSITY_CLASSNAMES[density] || DENSITY_CLASSNAMES.default,
      SURFACE_CLASSNAMES[surface] || SURFACE_CLASSNAMES.default,
      className,
    )}
    {...props}
  />
));

Input.displayName = 'Input';
