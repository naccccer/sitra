import React, { forwardRef } from 'react';
import { cn } from '@/components/shared/ui/cn';
import { getActionPreset } from '@/components/shared/ui/actionPresets';

const VARIANT_CLASSNAMES = {
  primary: 'border-transparent bg-[rgb(var(--ui-primary))] text-white shadow-[var(--shadow-soft)] hover:-translate-y-px hover:bg-[rgb(var(--ui-primary))]/95',
  secondary: 'border-transparent bg-[rgb(var(--ui-surface-muted))] text-[rgb(var(--ui-primary))] shadow-[var(--shadow-soft)] hover:-translate-y-px hover:bg-[rgb(var(--ui-bg-accent))]/82 hover:text-[rgb(var(--ui-primary))]',
  ghost: 'border-transparent bg-transparent text-[rgb(var(--ui-text-muted))] hover:bg-[rgb(var(--ui-surface-muted))] hover:text-[rgb(var(--ui-text))]',
  danger: 'border-transparent bg-[rgb(var(--ui-danger-bg))] text-[rgb(var(--ui-danger-text))] shadow-[var(--shadow-soft)] hover:-translate-y-px hover:bg-[rgb(var(--ui-danger-bg))]/85',
  success: 'border-transparent bg-[rgb(var(--ui-success-bg))] text-[rgb(var(--ui-success-text))] shadow-[var(--shadow-soft)] hover:-translate-y-px hover:bg-[rgb(var(--ui-success-bg))]/85',
  forest: 'border-transparent bg-[rgb(18,74,45)] text-white shadow-[0_14px_34px_rgba(18,74,45,0.24)] hover:-translate-y-px hover:bg-[rgb(13,57,34)]',
  accent: 'border-transparent bg-[rgb(var(--ui-accent))] text-white shadow-[var(--shadow-accent)] hover:-translate-y-px hover:bg-[rgb(var(--ui-accent-strong))]',
};

const SIZE_CLASSNAMES = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3 text-xs',
  lg: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 p-0',
  iconSm: 'h-8 w-8 p-0',
};

const SURFACE_CLASSNAMES = {
  default: '',
  table:
    'border-white/70 bg-white text-[rgb(var(--ui-primary))] shadow-[0_6px_16px_rgba(18,33,74,0.08)] hover:bg-white hover:text-[rgb(var(--ui-primary))]',
};

const SELECTED_SURFACE_CLASSNAMES = {
  table:
    'border-[rgb(var(--ui-accent-border))] bg-[rgb(var(--ui-accent-muted))]/72 text-[rgb(var(--ui-primary))] shadow-[0_8px_20px_rgba(18,33,74,0.12)]',
};

export const Button = forwardRef(({
  action = '',
  className = '',
  variant,
  surface = 'default',
  selected = false,
  size = 'md',
  type = 'button',
  leadingIcon: LeadingIcon = null,
  trailingIcon: TrailingIcon = null,
  showActionIcon = false,
  loading = false,
  children = null,
  disabled = false,
  ...props
}, ref) => {
  const preset = getActionPreset(action);
  const resolvedVariant = variant || preset?.variant || 'secondary';
  const resolvedContent = children ?? preset?.label ?? null;
  const ResolvedLeadingIcon = LeadingIcon || (showActionIcon ? preset?.icon || null : null);
  const iconSize = size === 'sm' ? 14 : (size === 'iconSm' ? 14 : 16);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'focus-ring inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border font-black transition duration-[var(--motion-fast)] disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSNAMES[resolvedVariant] || VARIANT_CLASSNAMES.secondary,
        SIZE_CLASSNAMES[size] || SIZE_CLASSNAMES.md,
        SURFACE_CLASSNAMES[surface] || SURFACE_CLASSNAMES.default,
        selected ? SELECTED_SURFACE_CLASSNAMES[surface] || '' : '',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : ResolvedLeadingIcon ? (
        <ResolvedLeadingIcon size={iconSize} aria-hidden="true" />
      ) : null}
      {resolvedContent}
      {TrailingIcon ? <TrailingIcon size={iconSize} aria-hidden="true" /> : null}
    </button>
  );
});

Button.displayName = 'Button';
