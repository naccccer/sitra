import React from 'react';
import { Card } from '@/components/shared/ui/Card';
import { cn } from '@/components/shared/ui/cn';

export const EmptyState = ({
  title = 'داده‌ای برای نمایش وجود ندارد',
  description = '',
  className = '',
  action = null,
}) => (
  <Card
    className={cn('text-center', className)}
    tone="muted"
    padding="lg"
  >
    <h3 className="text-sm font-black text-slate-800">{title}</h3>
    {description ? <p className="mt-1 text-xs font-bold text-slate-500">{description}</p> : null}
    {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
  </Card>
);
