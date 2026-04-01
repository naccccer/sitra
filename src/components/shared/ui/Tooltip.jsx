import React from 'react';
import { cn } from '@/components/shared/ui/cn';

const SIDE_CLASSNAMES = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  right: 'right-full top-1/2 mr-2 -translate-y-1/2',
  bottom: 'left-1/2 top-full mt-2 -translate-x-1/2',
  left: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

export const Tooltip = ({
  children,
  content = '',
  side = 'left',
  disabled = false,
  className = '',
}) => {
  if (disabled || !content) return children;

  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-[90] whitespace-nowrap rounded-xl border border-[rgb(var(--ui-border-soft))] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[rgb(var(--ui-text))] opacity-0 shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition-[opacity,visibility] duration-150 delay-300 invisible group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-hover/tooltip:delay-300 group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:delay-0',
          SIDE_CLASSNAMES[side] || SIDE_CLASSNAMES.left,
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
};
