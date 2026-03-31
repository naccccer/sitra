import React from 'react';
import { cn } from '@/components/shared/ui/cn';

const PADDING_CLASSNAMES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const TONE_CLASSNAMES = {
  default: 'surface-card',
  muted: 'surface-card-quiet',
  inverse: 'border-[rgba(var(--ui-text),0.92)] bg-[rgb(var(--ui-text))] text-[rgb(var(--ui-primary-contrast))] shadow-ui-surface',
};

const SURFACE_CLASSNAMES = {
  default: 'surface-card',
  quiet: 'surface-card-quiet',
  elevated: 'surface-card-elevated',
  glass: 'surface-card-glass',
  inset: 'surface-soft-inset',
  accent: 'surface-accent',
};

export const Card = ({
  className = '',
  padding = 'md',
  tone = 'default',
  surface = '',
  ...props
}) => (
  <div
    className={cn(
      'rounded-[var(--radius-xl)]',
      PADDING_CLASSNAMES[padding] || PADDING_CLASSNAMES.md,
      surface ? (SURFACE_CLASSNAMES[surface] || SURFACE_CLASSNAMES.default) : (TONE_CLASSNAMES[tone] || TONE_CLASSNAMES.default),
      className,
    )}
    {...props}
  />
);
