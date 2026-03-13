import React from 'react';
import { cn } from '@/components/shared/ui/cn';

const TONE_CLASSNAMES = {
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
};

export const Badge = ({ className = '', tone = 'neutral', ...props }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-black',
      TONE_CLASSNAMES[tone] || TONE_CLASSNAMES.neutral,
      className,
    )}
    {...props}
  />
);
