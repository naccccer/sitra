import { useState } from 'react'
import { OperationsPanel } from '@/modules/inventory/components/OperationsPanel'
import { OperationFormModal } from '@/modules/inventory/components/OperationFormModal'

export const InventoryTransfersPanel = ({ session }) => {
  const [showForm, setShowForm] = useState(false)

  const handleCreated = () => {
    setShowForm(false)
  }

  return (
    <>
      <OperationsPanel
        operationType="transfer"
        session={session}
        onNew={() => setShowForm(true)}
      />
      {showForm && (
        <OperationFormModal
          operationType="transfer"
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
