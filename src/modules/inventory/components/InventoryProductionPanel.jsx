import { useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { OperationsPanel } from '@/modules/inventory/components/OperationsPanel'
import { OperationFormModal } from '@/modules/inventory/components/OperationFormModal'

const SUB_TYPES = [
  { id: 'production_consume', label: 'مصرف تولید' },
  { id: 'production_output', label: 'خروجی تولید' },
]

export const InventoryProductionPanel = ({ session }) => {
  const [subType, setSubType] = useState('production_consume')
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="space-y-3">
      <Card padding="sm">
        <div className="flex flex-wrap gap-2">
          {SUB_TYPES.map((type) => (
            <Button
              key={type.id}
              size="sm"
              variant={subType === type.id ? 'primary' : 'secondary'}
              onClick={() => setSubType(type.id)}
            >
              {type.label}
            </Button>
          ))}
        </div>
      </Card>

      <OperationsPanel
        key={subType}
        operationType={subType}
        session={session}
        onNew={() => setShowForm(true)}
      />

      {showForm && (
        <OperationFormModal
          operationType={subType}
          onClose={() => setShowForm(false)}
          onCreated={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
