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
  iconClassName = '',
  iconInnerClassName = '',
}) => (
  <Card className={cn('universal-state-card', className)} tone={tone} padding="lg">
    <div className={cn('universal-state-icon mx-auto mb-3', iconClassName)}>
      {Icon ? <Icon size={18} className={cn('text-[rgb(var(--ui-text-muted))]', iconInnerClassName)} aria-hidden="true" /> : null}
    </div>
    <h3 className="text-sm font-black text-[rgb(var(--ui-text))]">{title}</h3>
    {description ? <p className="mt-1 text-xs font-bold leading-6 text-[rgb(var(--ui-text-muted))]">{description}</p> : null}
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </Card>
);
