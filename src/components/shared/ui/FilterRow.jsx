import React from 'react';
import { cn } from '@/components/shared/ui/cn';

export const FilterRow = ({ children, className = '' }) => (
  <div className={cn('flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center', className)}>
    {children}
  </div>
);
