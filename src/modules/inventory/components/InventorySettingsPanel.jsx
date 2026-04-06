import { Card } from '@/components/shared/ui'
import { InventoryLocationsArchivePanel } from '@/modules/inventory/components/InventoryLocationsArchivePanel'
import { InventoryUomSettingsPanel } from '@/modules/inventory/components/InventoryUomSettingsPanel'
import { InventoryWarehousesArchivePanel } from '@/modules/inventory/components/InventoryWarehousesArchivePanel'

export const InventorySettingsPanel = ({ session, activeTab }) => (
  <Card padding="md">
    {activeTab === 'warehouses' ? <InventoryWarehousesArchivePanel session={session} /> : null}
    {activeTab === 'locations' ? <InventoryLocationsArchivePanel session={session} /> : null}
    {activeTab === 'uom-options' ? <InventoryUomSettingsPanel session={session} /> : null}
  </Card>
)
