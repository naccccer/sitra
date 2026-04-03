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
  surface = 'default',
  className = '',
  iconStrokeWidth = 2,
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
      surface={surface}
      className={surface === 'table' ? `!text-[rgb(68,68,78)] hover:!text-[rgb(34,34,40)] ${className}` : className}
      aria-label={resolvedLabel}
      title={resolvedTitle}
      {...props}
    >
      {children || (ResolvedIcon ? <ResolvedIcon size={iconSize} strokeWidth={surface === 'table' ? 2.15 : iconStrokeWidth} aria-hidden="true" /> : null)}
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
