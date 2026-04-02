import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Select } from '@/components/shared/ui/Select';
import { cn } from '@/components/shared/ui/cn';

const SIZE_CLASSNAMES = {
  sm: {
    container: 'min-w-[104px]',
    display: 'h-9 px-2 text-[10px]',
    icon: 14,
    select: 'h-9',
  },
  md: {
    container: 'min-w-[124px]',
    display: 'h-10 px-3 text-xs',
    icon: 16,
    select: 'h-10',
  },
};

export const SelectPill = ({
  className = '',
  displayClassName = '',
  selectClassName = '',
  size = 'sm',
  value = '',
  options = [],
  onChange = () => {},
  getDisplayProps = null,
  placeholder = '',
  ...props
}) => {
  const resolvedSize = SIZE_CLASSNAMES[size] || SIZE_CLASSNAMES.sm;
  const selectedOption = options.find((option) => String(option.value) === String(value)) || null;
  const displayProps = getDisplayProps ? getDisplayProps(selectedOption) || {} : {};
  const label = displayProps.label || selectedOption?.label || placeholder;

  return (
    <div className={cn('relative', resolvedSize.container, className)}>
      <div
        className={cn(
          'pointer-events-none grid grid-cols-[18px_minmax(0,1fr)_18px] items-center rounded-[var(--radius-md)] border border-[rgb(var(--ui-border-soft))] bg-white font-semibold text-[rgb(var(--ui-primary))] shadow-[0_6px_16px_rgba(18,33,74,0.08)]',
          resolvedSize.display,
          displayProps.className,
          displayClassName,
        )}
      >
        <ChevronDown size={resolvedSize.icon} className="justify-self-start text-[rgb(var(--ui-primary))]" />
        <span className="block truncate text-center">{label}</span>
        <span aria-hidden="true" />
      </div>

      <Select
        size={size}
        value={value}
        onChange={onChange}
        className={cn('absolute inset-0 cursor-pointer appearance-none opacity-0', resolvedSize.select, selectClassName)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
};
