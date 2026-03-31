import React, { cloneElement, isValidElement } from 'react';
import { cn } from '@/components/shared/ui/cn';

const SIZE_CLASSNAMES = {
  xs: 'ui-icon-xs',
  sm: 'ui-icon-sm',
  md: 'ui-icon-md',
  lg: 'ui-icon-lg',
};

export const SolidIcon = ({
  icon = null,
  className = '',
  size = 'sm',
}) => {
  if (!isValidElement(icon)) return icon;

  return cloneElement(icon, {
    'aria-hidden': true,
    focusable: false,
    className: cn(
      'ui-icon-solid',
      SIZE_CLASSNAMES[size] || SIZE_CLASSNAMES.sm,
      icon.props.className,
      className,
    ),
  });
};
