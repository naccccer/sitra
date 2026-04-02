import React from 'react';
import { cn } from '@/components/shared/ui/cn';

const PADDING_CLASSNAMES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const TONE_CLASSNAMES = {
  default: 'border-transparent bg-[rgb(var(--ui-surface-muted))]/72 text-[rgb(var(--ui-text))] shadow-[var(--shadow-soft)]',
  muted: 'border-transparent bg-[rgb(var(--ui-surface-muted))]/56 text-[rgb(var(--ui-text))] shadow-[var(--shadow-soft)]',
  inverse: 'border-transparent bg-[rgb(var(--ui-primary))] text-white shadow-[var(--shadow-strong)]',
  accent: 'border-transparent bg-[rgb(var(--ui-accent-muted))]/44 text-[rgb(var(--ui-primary))] shadow-[var(--shadow-soft)]',
  glass: 'border-white/70 bg-white/82 text-[rgb(var(--ui-text))] shadow-[var(--shadow-surface)] backdrop-blur-xl',
};

export const Card = ({
  className = '',
  padding = 'md',
  tone = 'default',
  interactive = false,
  ...props
}) => (
  <div
    className={cn(
      'rounded-[var(--radius-2xl)] border',
      interactive ? 'transition duration-[var(--motion-fast)] hover:-translate-y-px hover:shadow-[var(--shadow-surface)]' : '',
      PADDING_CLASSNAMES[padding] || PADDING_CLASSNAMES.md,
      TONE_CLASSNAMES[tone] || TONE_CLASSNAMES.default,
      className,
    )}
    {...props}
  />
);
