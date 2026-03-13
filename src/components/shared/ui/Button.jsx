import React, { forwardRef } from 'react';
import { cn } from '@/components/shared/ui/cn';

const VARIANT_CLASSNAMES = {
  primary: 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100',
  ghost: 'border-transparent bg-transparent text-slate-700 hover:bg-slate-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
};

const SIZE_CLASSNAMES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3 text-xs',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 p-0',
};

export const Button = forwardRef(({
  className = '',
  variant = 'secondary',
  size = 'md',
  type = 'button',
  ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg border font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      VARIANT_CLASSNAMES[variant] || VARIANT_CLASSNAMES.secondary,
      SIZE_CLASSNAMES[size] || SIZE_CLASSNAMES.md,
      className,
    )}
    {...props}
  />
));

Button.displayName = 'Button';
