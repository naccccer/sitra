import { Card } from '@/components/shared/ui'
import { InventoryLotsArchivePanel } from '@/modules/inventory/components/InventoryLotsArchivePanel'
import { InventoryProductsArchivePanel } from '@/modules/inventory/components/InventoryProductsArchivePanel'

export const InventoryCatalogWorkspace = ({ session, activeTab }) => (
  <Card padding="md">
    {activeTab === 'products' ? <InventoryProductsArchivePanel session={session} /> : null}
    {activeTab === 'lots' ? <InventoryLotsArchivePanel session={session} /> : null}
  </Card>
)
