import { Card } from '@/components/shared/ui'
import { InventoryLocationsArchivePanel } from '@/modules/inventory/components/InventoryLocationsArchivePanel'
import { InventoryWarehousesArchivePanel } from '@/modules/inventory/components/InventoryWarehousesArchivePanel'

export const InventorySettingsPanel = ({ session, activeTab }) => (
  <Card padding="md">
    {activeTab === 'warehouses' ? <InventoryWarehousesArchivePanel session={session} /> : null}
    {activeTab === 'locations' ? <InventoryLocationsArchivePanel session={session} /> : null}
  </Card>
)
