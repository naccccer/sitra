import { PayrollSurfaceCard } from './PayrollSurfaceCard'

export function PayrollMetricCard({ emphasis = false, label, value }) {
  return (
    <PayrollSurfaceCard
      density="compact"
      className={emphasis ? 'border-slate-900 bg-slate-900 text-white' : ''}
    >
      <div className={`text-[11px] font-bold ${emphasis ? 'text-white/70' : 'text-slate-500'}`}>{label}</div>
      <div className="mt-1 text-sm font-black">{value}</div>
    </PayrollSurfaceCard>
  )
}
