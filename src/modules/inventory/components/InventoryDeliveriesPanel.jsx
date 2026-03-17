import { useState } from 'react'
import { OperationsPanel } from '@/modules/inventory/components/OperationsPanel'
import { OperationFormModal } from '@/modules/inventory/components/OperationFormModal'

export const InventoryDeliveriesPanel = ({ session }) => {
  const [showForm, setShowForm] = useState(false)

  const handleCreated = () => {
    setShowForm(false)
  }

  return (
    <>
      <OperationsPanel
        operationType="delivery"
        session={session}
        onNew={() => setShowForm(true)}
      />
      {showForm && (
        <OperationFormModal
          operationType="delivery"
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
