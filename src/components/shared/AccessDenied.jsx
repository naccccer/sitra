import React from 'react';
import { Badge, UniversalState } from '@/components/shared/ui';

export const AccessDenied = ({ message }) => (
  <div className="mx-auto max-w-xl space-y-3 text-center">
    <div className="flex justify-center">
      <Badge tone="warning">دسترسی محدود</Badge>
    </div>
    <UniversalState state="disabled" title={message} description="در صورت نیاز با مدیر سیستم برای فعال سازی مجوز مناسب هماهنگ کنید." />
  </div>
);
