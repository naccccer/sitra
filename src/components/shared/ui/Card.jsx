import React from 'react';
import { cn } from '@/components/shared/ui/cn';

const PADDING_CLASSNAMES = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const TONE_CLASSNAMES = {
  default: 'border-slate-200 bg-white',
  muted: 'border-slate-200 bg-slate-50/70',
  inverse: 'border-slate-800 bg-slate-900 text-white',
};

export const Card = ({
  className = '',
  padding = 'md',
  tone = 'default',
  ...props
}) => (
  <div
    className={cn(
      'rounded-2xl border shadow-sm',
      PADDING_CLASSNAMES[padding] || PADDING_CLASSNAMES.md,
      TONE_CLASSNAMES[tone] || TONE_CLASSNAMES.default,
      className,
    )}
    {...props}
  />
);
