import { useState } from 'react'
import { OperationFormModal } from '@/modules/inventory/components/OperationFormModal'
import { OperationsPanel } from '@/modules/inventory/components/OperationsPanel'
import { getInventoryOperationConfig } from '@/modules/inventory/config/inventoryConfig'

export const InventoryOperationsWorkspace = ({ session, activeTab, activeDetailTab }) => {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const activeOperationType = activeTab === 'production'
    ? activeDetailTab
    : activeTab

  const resolvedType = getInventoryOperationConfig(activeOperationType).id

  return (
    <>
      <OperationsPanel
        key={`${resolvedType}:${refreshKey}`}
        operationType={resolvedType}
        session={session}
        onNew={() => setShowForm(true)}
      />

      {showForm ? (
        <OperationFormModal
          operationType={resolvedType}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false)
            setRefreshKey((current) => current + 1)
          }}
        />
      ) : null}
    </>
  )
}
