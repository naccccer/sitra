import { useState } from 'react'
import { Card } from '@/components/shared/ui'
import { OperationsPanel } from '@/modules/inventory/components/OperationsPanel'
import { OperationFormModal } from '@/modules/inventory/components/OperationFormModal'

export const InventoryCountsPanel = ({ session }) => {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleCreated = () => {
    setShowForm(false)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="space-y-3">
      <Card padding="md">
        <div className="text-sm font-bold text-slate-700">شمارش موجودی</div>
        <div className="mt-1 text-xs text-slate-500">
          نشست‌های شمارش دوره‌ای موجودی انبار. پس از ثبت، تفاوت‌ها به صورت تعدیل خودکار ثبت می‌شوند.
        </div>
      </Card>
      <OperationsPanel
        key={refreshKey}
        operationType="count"
        session={session}
        onNew={() => setShowForm(true)}
      />
      {showForm && (
        <OperationFormModal
          operationType="count"
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
