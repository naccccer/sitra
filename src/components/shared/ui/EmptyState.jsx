import React from 'react';
import { Card } from '@/components/shared/ui/Card';
import { cn } from '@/components/shared/ui/cn';

export const EmptyState = ({
  title = 'داده‌ای برای نمایش وجود ندارد',
  description = '',
  className = '',
  action = null,
  icon: Icon = null,
  tone = 'muted',
}) => (
  <Card className={cn('text-center', className)} tone={tone} padding="lg">
    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] border border-[rgb(var(--ui-border-soft))] bg-white/80 shadow-[var(--shadow-soft)]">
      {Icon ? <Icon size={18} className="text-[rgb(var(--ui-text-muted))]" aria-hidden="true" /> : null}
    </div>
    <h3 className="text-sm font-black text-[rgb(var(--ui-text))]">{title}</h3>
    {description ? <p className="mt-1 text-xs font-bold text-[rgb(var(--ui-text-muted))]">{description}</p> : null}
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </Card>
);
