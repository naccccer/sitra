import { useEffect, useMemo, useState } from 'react'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Button, Card } from '@/components/shared/ui'
import { InventoryV2TableScaffold } from '@/modules/inventory/components/InventoryV2TableScaffold'
import { InventoryReceiptsPanel } from '@/modules/inventory/components/InventoryReceiptsPanel'
import { InventoryDeliveriesPanel } from '@/modules/inventory/components/InventoryDeliveriesPanel'
import { InventoryTransfersPanel } from '@/modules/inventory/components/InventoryTransfersPanel'
import { InventoryAdjustmentsPanel } from '@/modules/inventory/components/InventoryAdjustmentsPanel'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const EMPTY_PERMISSIONS = Object.freeze([])

const TAB_DEFINITIONS = [
  { id: 'dashboard',       label: 'Dashboard',       permission: null },
  { id: 'products',        label: 'Products',         permission: 'inventory.v2_products.read' },
  { id: 'receipts',        label: 'Receipts',         permission: 'inventory.v2_operations.read' },
  { id: 'deliveries',      label: 'Deliveries',       permission: 'inventory.v2_operations.read' },
  { id: 'transfers',       label: 'Transfers',        permission: 'inventory.v2_operations.read' },
  { id: 'productionMoves', label: 'Production Moves', permission: 'inventory.v2_operations.read' },
  { id: 'adjustments',     label: 'Adjustments',      permission: 'inventory.v2_operations.read' },
  { id: 'counts',          label: 'Counts',           permission: 'inventory.v2_operations.read' },
  { id: 'replenishment',   label: 'Replenishment',    permission: 'inventory.v2_reports.read' },
  { id: 'reports',         label: 'Reports',          permission: 'inventory.v2_reports.read' },
  { id: 'settings',        label: 'Settings',         permission: 'inventory.v2_settings.read' },
]

const SCAFFOLD_META = {
  products:        { title: 'Products',         description: 'Product templates and variants.', columns: ['Name', 'Type', 'UoM', 'Status'] },
  productionMoves: { title: 'Production Moves', description: 'Production consume/output — Phase 3.', columns: ['Operation', 'Type', 'Status', 'Created At'] },
  counts:          { title: 'Counts',           description: 'Cycle and annual count sessions — Phase 4.', columns: ['Session', 'Warehouse', 'Status', 'Started At'] },
  replenishment:   { title: 'Replenishment',    description: 'Min/Max proposals — Phase 4.', columns: ['Product', 'Available', 'Min', 'Suggested Qty'] },
  reports:         { title: 'Reports',          description: 'Operational reports — Phase 4.', columns: ['Report', 'Range', 'Rows', 'Updated At'] },
  settings:        { title: 'Settings',         description: 'Inventory V2 configuration.', columns: ['Setting', 'Value', 'Scope', 'Updated At'] },
}

export const InventoryV2Page = ({ session }) => {
  const permissions  = Array.isArray(session?.permissions) ? session.permissions : EMPTY_PERMISSIONS
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}
  const canAccessInventory = Boolean(capabilities.canAccessInventory)

  const visibleTabs = useMemo(
    () => TAB_DEFINITIONS.filter((tab) => !tab.permission || permissions.includes(tab.permission)),
    [permissions],
  )

  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts]   = useState([])

  useEffect(() => {
    if (!permissions.includes('inventory.v2_products.read')) return
    let mounted = true
    inventoryApi.fetchV2Products().then((res) => {
      if (mounted) setProducts(Array.isArray(res?.products) ? res.products : [])
    }).catch(() => { if (mounted) setProducts([]) })
    return () => { mounted = false }
  }, [permissions])

  const resolvedTab = visibleTabs.find((t) => t.id === activeTab) ? activeTab : (visibleTabs[0]?.id ?? 'dashboard')

  if (!canAccessInventory) {
    return <AccessDenied message="دسترسی کافی برای ماژول انبار وجود ندارد." />
  }

  const dashboardCards = [
    { label: 'Products',   value: products.length },
    { label: 'Warehouses', value: permissions.includes('inventory.v2_warehouses.read') ? 'Enabled' : 'Hidden' },
    { label: 'Locations',  value: permissions.includes('inventory.v2_locations.read')  ? 'Enabled' : 'Hidden' },
    { label: 'Lots',       value: permissions.includes('inventory.v2_lots.read')       ? 'Enabled' : 'Hidden' },
  ]

  const productRows = permissions.includes('inventory.v2_products.read')
    ? products.slice(0, 25).map((p) => [p?.name ?? '-', p?.productType ?? '-', p?.uom ?? '-', p?.isActive ? 'Active' : 'Inactive'])
    : []

  const renderContent = () => {
    switch (resolvedTab) {
      case 'dashboard':
        return (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardCards.map((card) => (
              <Card key={card.label} padding="md">
                <div className="text-xs font-bold text-slate-500">{card.label}</div>
                <div className="mt-1 text-xl font-black text-slate-900">{card.value}</div>
              </Card>
            ))}
          </section>
        )
      case 'receipts':
        return <InventoryReceiptsPanel session={session} />
      case 'deliveries':
        return <InventoryDeliveriesPanel session={session} />
      case 'transfers':
        return <InventoryTransfersPanel session={session} />
      case 'adjustments':
        return <InventoryAdjustmentsPanel session={session} />
      case 'products': {
        const m = SCAFFOLD_META.products
        return <InventoryV2TableScaffold title={m.title} description={m.description} columns={m.columns} rows={productRows} />
      }
      default: {
        const meta = SCAFFOLD_META[resolvedTab]
        if (!meta) return null
        return <InventoryV2TableScaffold title={meta.title} description={meta.description} columns={meta.columns} rows={[]} />
      }
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4" dir="rtl">
      <Card padding="md" className="space-y-3">
        <div>
          <div className="text-base font-black text-slate-900">Inventory V2</div>
          <div className="text-xs font-bold text-slate-500">Phase 2 — Core Stock Operations active</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={resolvedTab === tab.id ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      {renderContent()}
    </div>
  )
}
