import React from 'react'
import { Tooltip } from '@/components/shared/ui/Tooltip'
import { CircleAlert } from 'lucide-react'
import { cn } from '@/components/shared/ui/cn'

export const RequiredMark = () => <span className="text-[rgb(var(--ui-danger-text))]">*</span>

export const FieldMessage = ({ children, tone = 'muted', className = '' }) => {
  if (!children) return null
  const toneClass = tone === 'danger'
    ? 'text-[rgb(var(--ui-danger-text))]'
    : tone === 'success'
      ? 'text-[rgb(var(--ui-success-text))]'
      : 'text-[rgb(var(--ui-text-muted))]'
  return <p className={cn('mt-1 text-[11px] font-bold', toneClass, className)}>{children}</p>
}

export const FormField = ({
  label,
  required = false,
  hint = '',
  error = '',
  className = '',
  children,
}) => (
  <div className={cn('space-y-1.5', className)}>
    {label ? (
      <label className="inline-flex items-center gap-1 text-xs font-black text-[rgb(var(--ui-text-muted))]">
        <span>{label}</span>
        {required ? <RequiredMark /> : null}
        {hint ? (
          <Tooltip content={hint} side="bottom-right">
            <span className="focus-ring inline-flex h-5 w-5 items-center justify-center rounded-full text-[rgb(var(--ui-text-muted))]" tabIndex={0} role="img" aria-label="راهنما">
              <CircleAlert size={12} />
            </span>
          </Tooltip>
        ) : null}
      </label>
    ) : null}
    {children}
    <FieldMessage tone={error ? 'danger' : 'muted'}>{error || null}</FieldMessage>
  </div>
)

export const FormSection = ({ title = '', description = '', children, className = '' }) => (
  <section className={cn('space-y-3 rounded-2xl border border-[rgb(var(--ui-border-soft))] bg-white/65 p-3', className)}>
    {title ? (
      <header className="space-y-1">
        <h4 className="text-xs font-black text-[rgb(var(--ui-text))]">{title}</h4>
        {description ? <p className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{description}</p> : null}
      </header>
    ) : null}
    {children}
  </section>
)
