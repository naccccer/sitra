import React from 'react';
import { Card } from '@/components/shared/ui/Card';
import { cn } from '@/components/shared/ui/cn';

const TONE_CLASSNAMES = {
  neutral: '',
  accent: 'bg-[rgb(var(--ui-accent-muted))] border-[rgb(var(--ui-accent-border))]',
  info: 'bg-[rgb(var(--ui-info-bg))] border-[rgb(var(--ui-info-border))]',
  success: 'bg-[rgb(var(--ui-success-bg))] border-[rgb(var(--ui-success-border))]',
  warning: 'bg-[rgb(var(--ui-warning-bg))] border-[rgb(var(--ui-warning-border))]',
};

export const StatCard = ({
  icon: Icon,
  label = '',
  value = '',
  meta = '',
  tone = 'neutral',
  className = '',
  action = null,
}) => (
  <Card className={cn('relative overflow-hidden', TONE_CLASSNAMES[tone] || '', className)} padding="md">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <div className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{label}</div>
        <div className="text-2xl font-black tracking-tight text-[rgb(var(--ui-text))]">{value}</div>
      </div>
      {Icon ? (
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] border border-[rgb(var(--ui-border-soft))] bg-[rgb(var(--ui-accent-muted))]/45 text-[rgb(var(--ui-primary))] shadow-[var(--shadow-soft)]">
          <Icon size={18} />
        </div>
      ) : null}
    </div>
    {meta ? <div className="mt-4 text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{meta}</div> : null}
    {action ? <div className="mt-4">{action}</div> : null}
  </Card>
);
