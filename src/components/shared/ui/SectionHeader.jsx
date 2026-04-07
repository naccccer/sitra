import React from 'react';
import { CircleAlert } from 'lucide-react';
import { Tooltip } from '@/components/shared/ui/Tooltip';
import { cn } from '@/components/shared/ui/cn';

export const SectionHeader = ({
  eyebrow = '',
  title = '',
  description = '',
  action = null,
  actions = null,
  className = '',
}) => (
  <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between', className)}>
    <div className="min-w-0">
      {eyebrow ? <div className="page-header-kicker">{eyebrow}</div> : null}
      {title ? (
        <div className="mt-1 flex items-center gap-2">
          <h2 className="page-header-title">{title}</h2>
          {description ? (
            <Tooltip content={description} side="bottom-right">
              <span
                tabIndex={0}
                role="img"
                aria-label="توضیحات"
                className="focus-ring inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[rgb(var(--ui-text-muted))]"
              >
                <CircleAlert size={14} />
              </span>
            </Tooltip>
          ) : null}
        </div>
      ) : null}
    </div>
    {actions || action ? <div className="shrink-0 lg:pt-1">{actions || action}</div> : null}
  </div>
);
