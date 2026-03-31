import React from 'react';
import { cn } from '@/components/shared/ui/cn';

const TONE_CLASSNAMES = {
  neutral: 'bg-[rgba(var(--ui-border),0.45)] text-[rgb(var(--ui-text-muted))]',
  info: 'bg-[rgba(var(--ui-info),0.14)] text-[rgb(var(--ui-info))]',
  success: 'bg-[rgba(var(--ui-success),0.14)] text-[rgb(var(--ui-success))]',
  warning: 'bg-[rgba(var(--ui-warning),0.16)] text-[rgb(var(--ui-warning))]',
  danger: 'bg-[rgba(var(--ui-danger),0.15)] text-[rgb(var(--ui-danger))]',
};

const EMPHASIS_CLASSNAMES = {
  soft: '',
  solid: 'border-transparent text-[rgb(var(--ui-primary-contrast))]',
  outline: 'bg-transparent',
};

const SOLID_TONE_CLASSNAMES = {
  neutral: 'bg-[rgb(var(--ui-text))]',
  info: 'bg-[rgb(var(--ui-info))]',
  success: 'bg-[rgb(var(--ui-success))]',
  warning: 'bg-[rgb(var(--ui-warning))]',
  danger: 'bg-[rgb(var(--ui-danger))]',
};

const OUTLINE_TONE_CLASSNAMES = {
  neutral: 'border-[rgba(var(--ui-border-strong),0.55)] text-[rgb(var(--ui-text-muted))]',
  info: 'border-[rgba(var(--ui-info),0.35)] text-[rgb(var(--ui-info))]',
  success: 'border-[rgba(var(--ui-success),0.35)] text-[rgb(var(--ui-success))]',
  warning: 'border-[rgba(var(--ui-warning),0.35)] text-[rgb(var(--ui-warning))]',
  danger: 'border-[rgba(var(--ui-danger),0.35)] text-[rgb(var(--ui-danger))]',
};

export const Badge = ({ className = '', tone = 'neutral', emphasis = 'soft', ...props }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-black',
      emphasis === 'solid' ? (SOLID_TONE_CLASSNAMES[tone] || SOLID_TONE_CLASSNAMES.neutral) : '',
      emphasis === 'outline' ? (OUTLINE_TONE_CLASSNAMES[tone] || OUTLINE_TONE_CLASSNAMES.neutral) : 'border-transparent',
      EMPHASIS_CLASSNAMES[emphasis] || EMPHASIS_CLASSNAMES.soft,
      emphasis === 'soft' ? (TONE_CLASSNAMES[tone] || TONE_CLASSNAMES.neutral) : '',
      className,
    )}
    {...props}
  />
);
