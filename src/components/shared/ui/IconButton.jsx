import React, { forwardRef } from 'react';
import { Button } from '@/components/shared/ui/Button';
import { Tooltip } from '@/components/shared/ui/Tooltip';
import { getActionPreset } from '@/components/shared/ui/actionPresets';

export const IconButton = forwardRef(({
  action = '',
  label = '',
  tooltip = '',
  tooltipSide = 'top',
  size = 'icon',
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
  const iconSize = size === 'iconSm' ? 13 : 16;

  const button = (
    <Button
      ref={ref}
      size={size}
      variant={variant || preset?.variant || 'secondary'}
      aria-label={resolvedLabel}
      title={resolvedTitle}
      {...props}
    >
      {children || (ResolvedIcon ? <ResolvedIcon size={iconSize} aria-hidden="true" /> : null)}
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
