import { PayrollSurfaceCard } from './PayrollSurfaceCard'

export function PayrollMetricCard({ emphasis = false, label, value }) {
  return (
    <PayrollSurfaceCard
      density="compact"
      className={emphasis ? 'border-slate-300 bg-slate-100 text-slate-900' : ''}
    >
      <div className={`text-[11px] font-bold ${emphasis ? 'text-slate-600' : 'text-slate-500'}`}>{label}</div>
      <div className={`mt-1 text-sm font-black ${emphasis ? 'text-slate-900' : ''}`}>{value}</div>
    </PayrollSurfaceCard>
  )
}
