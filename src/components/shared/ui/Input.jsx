import React, { forwardRef } from 'react';
import { cn } from '@/components/shared/ui/cn';

export const Input = forwardRef(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'focus-ring h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 placeholder:text-slate-400',
      className,
    )}
    {...props}
  />
));

Input.displayName = 'Input';
