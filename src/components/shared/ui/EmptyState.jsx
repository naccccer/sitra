import React from 'react';
import { Card } from '@/components/shared/ui/Card';
import { cn } from '@/components/shared/ui/cn';

export const EmptyState = ({
  title = 'داده‌ای برای نمایش وجود ندارد',
  description = '',
  className = '',
  action = null,
  surface = 'quiet',
}) => (
  <Card
    className={cn('text-center', className)}
    surface={surface}
    padding="lg"
  >
    <h3 className="text-sm font-black text-[rgb(var(--ui-text))]">{title}</h3>
    {description ? <p className="mt-1 text-xs font-bold text-[rgb(var(--ui-text-muted))]">{description}</p> : null}
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </Card>
);
