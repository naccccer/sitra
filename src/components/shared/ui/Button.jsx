import React, { forwardRef } from 'react';
import { cn } from '@/components/shared/ui/cn';

const VARIANT_CLASSNAMES = {
  primary: 'border-[rgba(var(--ui-primary),0.9)] bg-[rgb(var(--ui-primary))] text-[rgb(var(--ui-primary-contrast))] shadow-ui-surface hover:bg-[rgb(var(--ui-primary-soft))]',
  secondary: 'border-[rgba(var(--ui-border-strong),0.5)] bg-[rgba(var(--ui-surface-elevated),0.96)] text-[rgb(var(--ui-text))] shadow-ui-soft hover:border-[rgba(var(--ui-primary),0.18)] hover:bg-[rgba(var(--ui-primary),0.06)] hover:text-[rgb(var(--ui-primary))]',
  ghost: 'border-transparent bg-transparent text-[rgb(var(--ui-text-muted))] hover:bg-[rgba(var(--ui-primary),0.08)] hover:text-[rgb(var(--ui-primary))]',
  danger: 'border-[rgba(var(--ui-danger),0.24)] bg-[rgba(var(--ui-danger),0.12)] text-[rgb(var(--ui-danger))] hover:bg-[rgba(var(--ui-danger),0.18)]',
  success: 'border-[rgba(var(--ui-success),0.24)] bg-[rgba(var(--ui-success),0.12)] text-[rgb(var(--ui-success))] hover:bg-[rgba(var(--ui-success),0.18)]',
};

const SIZE_CLASSNAMES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3 text-xs',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-8 w-8 p-0',
};

const DENSITY_CLASSNAMES = {
  compact: 'gap-1',
  default: 'gap-1.5',
  comfortable: 'gap-2',
};

const EMPHASIS_CLASSNAMES = {
  default: '',
  soft: 'backdrop-blur-sm',
  quiet: 'shadow-none',
};

export const Button = forwardRef(({
  className = '',
  variant = 'secondary',
  size = 'md',
  density = 'default',
  emphasis = 'default',
  iconOnly = false,
  type = 'button',
  ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      'focus-ring inline-flex items-center justify-center rounded-[var(--radius-md)] border font-black transition-[background-color,border-color,color,box-shadow,transform] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0 [&_svg]:fill-current [&_svg]:stroke-current [&_svg]:[stroke-width:2.15]',
      VARIANT_CLASSNAMES[variant] || VARIANT_CLASSNAMES.secondary,
      SIZE_CLASSNAMES[iconOnly ? 'icon' : size] || SIZE_CLASSNAMES.md,
      DENSITY_CLASSNAMES[density] || DENSITY_CLASSNAMES.default,
      EMPHASIS_CLASSNAMES[emphasis] || EMPHASIS_CLASSNAMES.default,
      className,
    )}
    {...props}
  />
));

Button.displayName = 'Button';
