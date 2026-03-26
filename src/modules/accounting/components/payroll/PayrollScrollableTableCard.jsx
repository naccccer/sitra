import { PayrollSurfaceCard } from './PayrollSurfaceCard'

export function PayrollScrollableTableCard({ children, className = '', maxHeightClass = 'max-h-72' }) {
  return (
    <PayrollSurfaceCard className={`overflow-hidden ${className}`.trim()} density="compact">
      <div className={`overflow-auto ${maxHeightClass}`.trim()}>{children}</div>
    </PayrollSurfaceCard>
  )
}
