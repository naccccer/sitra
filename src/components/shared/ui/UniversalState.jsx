import React from 'react';
import { Archive, CheckCircle2, LoaderCircle, TriangleAlert } from 'lucide-react';
import { Card } from '@/components/shared/ui/Card';
import { EmptyState } from '@/components/shared/ui/EmptyState';
import { InlineAlert } from '@/components/shared/ui/InlineAlert';
import { cn } from '@/components/shared/ui/cn';

const STATE_ICON = {
  archived: Archive,
  success: CheckCircle2,
};

export const UniversalState = ({
  state = 'empty',
  title = '',
  description = '',
  action = null,
  className = '',
}) => {
  if (state === 'loading') {
    return (
      <Card className={cn('text-center', className)} tone="muted" padding="lg">
        <div className="inline-flex items-center gap-2 rounded-[var(--radius-xl)] border border-[rgb(var(--ui-state-loading-border))] bg-[rgb(var(--ui-state-loading-bg))] px-4 py-3 text-sm font-black text-[rgb(var(--ui-state-loading-text))]">
          <LoaderCircle size={18} className="animate-spin" />
          {title || 'در حال بارگذاری'}
        </div>
        {description ? <p className="mt-2 text-xs font-bold text-[rgb(var(--ui-text-muted))]">{description}</p> : null}
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <InlineAlert tone="danger" title={title || 'خطا'} className={className}>
        <div className="inline-flex items-center gap-1.5">
          <TriangleAlert size={14} aria-hidden="true" />
          <span>{description || 'بخش موردنظر در حال حاضر قابل نمایش نیست.'}</span>
        </div>
      </InlineAlert>
    );
  }

  if (state === 'success' || state === 'archived') {
    const Icon = STATE_ICON[state];
    return (
      <EmptyState
        title={title || (state === 'success' ? 'عملیات با موفقیت انجام شد' : 'این رکورد بایگانی شده است')}
        description={description}
        action={action}
        icon={Icon}
        tone={state === 'success' ? 'accent' : 'muted'}
        className={className}
      />
    );
  }

  return (
    <EmptyState
      title={title || 'داده‌ای برای نمایش وجود ندارد'}
      description={description}
      action={action}
      className={className}
    />
  );
};
