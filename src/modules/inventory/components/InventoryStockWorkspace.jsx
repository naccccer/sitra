import { InventoryReportsPanel } from '@/modules/inventory/components/InventoryReportsPanel'
import { InventoryReplenishmentPanel } from '@/modules/inventory/components/InventoryReplenishmentPanel'

export const InventoryStockWorkspace = ({ session, activeTab }) => (
  <>
    {activeTab === 'reports' ? <InventoryReportsPanel session={session} /> : null}
    {activeTab === 'replenishment' ? <InventoryReplenishmentPanel session={session} /> : null}
  </>
)
