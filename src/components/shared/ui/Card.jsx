import React from 'react';
import { cn } from '@/components/shared/ui/cn';

const PADDING_CLASSNAMES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const TONE_CLASSNAMES = {
  default: 'workspace-surface text-[rgb(var(--ui-text))]',
  muted: 'workspace-surface workspace-surface--muted text-[rgb(var(--ui-text))]',
  inverse: 'border-transparent bg-[rgb(var(--ui-primary))] text-white shadow-[var(--shadow-strong)]',
  accent: 'border-[rgb(var(--ui-accent-border))] bg-[rgb(var(--ui-accent-muted))]/72 text-[rgb(var(--ui-accent-strong))] shadow-[var(--shadow-soft)]',
  glass: 'workspace-surface bg-white/86 text-[rgb(var(--ui-text))]',
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
