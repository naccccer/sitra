export function PayrollSectionHeader({ action = null, subtitle = '', title }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <div className="text-sm font-black text-slate-900">{title}</div>
        {subtitle ? <div className="text-xs font-bold text-slate-500">{subtitle}</div> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
