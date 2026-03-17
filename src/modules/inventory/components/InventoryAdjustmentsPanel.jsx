import { useState } from 'react'
import { OperationsPanel } from '@/modules/inventory/components/OperationsPanel'
import { OperationFormModal } from '@/modules/inventory/components/OperationFormModal'

export const InventoryAdjustmentsPanel = ({ session }) => {
  const [showForm, setShowForm] = useState(false)

  const handleCreated = () => {
    setShowForm(false)
  }

  return (
    <>
      <OperationsPanel
        operationType="adjustment"
        session={session}
        onNew={() => setShowForm(true)}
      />
      {showForm && (
        <OperationFormModal
          operationType="adjustment"
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
