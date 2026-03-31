import React from 'react';
import { cn } from '@/components/shared/ui/cn';

export const SectionHeader = ({
  eyebrow = '',
  title = '',
  description = '',
  action = null,
  actions = null,
  className = '',
}) => (
  <div className={cn('flex flex-col gap-3 md:flex-row md:items-end md:justify-between', className)}>
    <div>
      {eyebrow ? <div className="section-kicker">{eyebrow}</div> : null}
      {title ? <h2 className="section-title">{title}</h2> : null}
      {description ? <p className="section-subtitle">{description}</p> : null}
    </div>
    {actions || action ? <div className="shrink-0">{actions || action}</div> : null}
  </div>
);
