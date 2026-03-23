import { useState } from 'react'
import { OperationsPanel } from '@/modules/inventory/components/OperationsPanel'
import { OperationFormModal } from '@/modules/inventory/components/OperationFormModal'

export const InventoryReceiptsPanel = ({ session }) => {
  const [showForm, setShowForm] = useState(false)

  const handleCreated = () => {
    setShowForm(false)
  }

  return (
    <>
      <OperationsPanel
        operationType="receipt"
        session={session}
        onNew={() => setShowForm(true)}
      />
      {showForm && (
        <OperationFormModal
          operationType="receipt"
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}
    </>
  )
}
