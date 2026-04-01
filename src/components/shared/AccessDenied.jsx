import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { Badge, Card } from '@/components/shared/ui';

export const AccessDenied = ({ message }) => (
  <Card className="mx-auto max-w-xl text-center" tone="muted" padding="lg">
    <div className="mb-3 inline-flex rounded-xl bg-[rgb(var(--ui-accent-muted))] p-2 text-[rgb(var(--ui-accent-strong))]">
      <ShieldAlert size={18} />
    </div>
    <div className="mb-2">
      <Badge tone="warning">دسترسی محدود</Badge>
    </div>
    <h2 className="text-sm font-black text-[rgb(var(--ui-primary))]">{message}</h2>
  </Card>
);
