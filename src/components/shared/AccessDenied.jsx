import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Badge, Card } from '@/components/shared/ui';

export const AccessDenied = ({ message }) => (
  <Card className="mx-auto max-w-xl text-center" tone="muted" padding="lg">
    <div className="mb-3 inline-flex rounded-xl bg-amber-100 p-2 text-amber-700">
      <ShieldAlert size={18} />
    </div>
    <div className="mb-2">
      <Badge tone="warning">دسترسی محدود</Badge>
    </div>
    <h2 className="text-sm font-black text-amber-900">{message}</h2>
  </Card>
);
