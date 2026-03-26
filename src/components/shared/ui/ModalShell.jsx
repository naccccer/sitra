import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/shared/ui/Button';
import { Card } from '@/components/shared/ui/Card';
import { cn } from '@/components/shared/ui/cn';

export const ModalShell = ({
  isOpen = false,
  title = '',
  description = '',
  onClose = () => {},
  children = null,
  footer = null,
  maxWidthClass = 'max-w-2xl',
  closeButtonMode = 'text',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm print-hide">
      <Card
        className={cn('w-full overflow-hidden shadow-2xl', maxWidthClass)}
        padding="none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">{title}</h3>
            {description ? <p className="mt-1 text-xs font-bold text-slate-500">{description}</p> : null}
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" aria-label="بستن" title="بستن">
            {closeButtonMode === 'icon' ? <X className="h-4 w-4" /> : 'بستن'}
          </Button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-4">{children}</div>

        {footer ? <div className="border-t border-slate-200 bg-white px-4 py-3">{footer}</div> : null}
      </Card>
    </div>
  );
};
