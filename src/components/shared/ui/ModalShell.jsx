import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/shared/ui/Button';
import { Card } from '@/components/shared/ui/Card';
import { IconButton } from '@/components/shared/ui/IconButton';
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
  eyebrow = '',
  headerAction = null,
  bodyClassName = '',
  footerClassName = '',
  headerClassName = '',
  overlayClassName = '',
  contentClassName = '',
  centerTitle = false,
}) => {
  if (!isOpen) return null;

    ? (
      <IconButton onClick={onClose} variant="ghost" label="بستن" tooltip="بستن">
        <X size={16} />
      </IconButton>
    )
    : <Button onClick={onClose} action="cancel" size="sm">بستن</Button>;

  const header = (
    <div
      className={cn(
        headerClassName
          ? 'rounded-t-3xl border-b px-4 py-3'
          : 'rounded-t-3xl border-b border-[rgb(var(--ui-border))] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,242,255,0.92))] px-4 py-3',
        headerClassName,
      )}
    >
      {centerTitle ? (
        <div className="relative flex min-h-11 items-center justify-center">
          <div className="min-w-0 text-center">
            {eyebrow ? <div className="section-kicker">{eyebrow}</div> : null}
            <h3 className="text-sm font-black text-current">{title}</h3>
            {description ? <p className="mt-1 text-xs font-bold text-current/75">{description}</p> : null}
          </div>
          <div className="absolute inset-y-0 end-0 flex items-center gap-2">
            {headerAction}
            {closeControl}
          </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? <div className="section-kicker">{eyebrow}</div> : null}
            <h3 className="text-sm font-black text-current">{title}</h3>
            {description ? <p className="mt-1 text-xs font-bold text-current/75">{description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            {closeControl}
          </div>
      )}
    </div>
  );
  const body = <div className={cn('max-h-[80vh] overflow-y-auto p-4', bodyClassName)}>{children}</div>;
  const footerNode = footer ? <div className={cn('rounded-b-3xl border-t border-[rgb(var(--ui-border))] bg-white px-4 py-3', footerClassName)}>{footer}</div> : null;

  if (plainContainer) {
    return (
      <div className={cn('fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm print-hide', overlayClassName)}>
        <div className={cn('w-full overflow-hidden rounded-3xl', maxWidthClass, contentClassName)}>
          {header}
          {body}
          {footerNode}
        </div>
      </div>
    );
  }
  return (
    <div className={cn('fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm print-hide', overlayClassName)}>
      <Card className={cn('w-full overflow-hidden rounded-3xl shadow-[var(--shadow-overlay)]', maxWidthClass, contentClassName)} padding="none">
        {header}
        {body}
        {footerNode}
      </Card>
