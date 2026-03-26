import { cn } from "@/components/shared/ui/cn";

export function PayrollSurface({ className = '', children }) {
  return <section className={cn('rounded-2xl border border-slate-200 bg-white p-3', className)}>{children}</section>
}

export function PayrollSectionHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
      <div>
        <div className="text-sm font-black text-slate-900">{title}</div>
        {subtitle ? <div className="text-[11px] font-bold text-slate-500">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
    </div>
  )
}

export function PayrollStat({ label, value, emphasize = false }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${emphasize ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50'}`}>
      <div className={`text-[11px] font-bold ${emphasize ? 'text-white/70' : 'text-slate-500'}`}>{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </div>
  )
}

export function PayrollTiny({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-center">
      <div className="text-[10px] font-bold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-slate-900">{value}</div>
    </div>
  )
}