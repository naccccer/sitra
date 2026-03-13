import React, { forwardRef } from 'react';
import { cn } from '@/components/shared/ui/cn';

export const Select = forwardRef(({ className = '', children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'focus-ring h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));

Select.displayName = 'Select';
