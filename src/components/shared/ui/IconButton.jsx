import React, { forwardRef } from 'react';
import { Button } from '@/components/shared/ui/Button';
import { Tooltip } from '@/components/shared/ui/Tooltip';
import { getActionPreset } from '@/components/shared/ui/actionPresets';

export const IconButton = forwardRef(({
  action = '',
  label = '',
  tooltip = '',
  tooltipSide = 'top',
  children = null,
  variant,
  title,
  ...props
}, ref) => {
  const preset = getActionPreset(action);
  const ResolvedIcon = preset?.icon || null;
  const resolvedLabel = label || preset?.label || tooltip;
  const resolvedTooltip = tooltip || resolvedLabel;
  const resolvedTitle = resolvedTooltip ? undefined : (title || resolvedLabel);

  const button = (
    <Button
      ref={ref}
      size="icon"
      variant={variant || preset?.variant || 'secondary'}
      aria-label={resolvedLabel}
      title={resolvedTitle}
      {...props}
    >
      {children || (ResolvedIcon ? <ResolvedIcon size={16} aria-hidden="true" /> : null)}
    </Button>
  );

  if (!resolvedTooltip) return button;

  return (
    <Tooltip content={resolvedTooltip} side={tooltipSide}>
      {button}
    </Tooltip>
  );
});

IconButton.displayName = 'IconButton';
