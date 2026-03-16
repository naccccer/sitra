import { useEffect, useMemo, useState } from 'react'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Button, Card } from '@/components/shared/ui'
import { InventoryV2TableScaffold } from '@/modules/inventory/components/InventoryV2TableScaffold'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'
const EMPTY_PERMISSIONS = Object.freeze([])

const TAB_DEFINITIONS = [
  { id: 'dashboard', label: 'Dashboard', permission: null },
  { id: 'products', label: 'Products', permission: 'inventory.v2_products.read' },
  { id: 'receipts', label: 'Receipts', permission: 'inventory.v2_operations.read' },
  { id: 'deliveries', label: 'Deliveries', permission: 'inventory.v2_operations.read' },
  { id: 'transfers', label: 'Transfers', permission: 'inventory.v2_operations.read' },
  { id: 'productionMoves', label: 'Production Moves', permission: 'inventory.v2_operations.read' },
  { id: 'adjustments', label: 'Adjustments', permission: 'inventory.v2_operations.read' },
  { id: 'counts', label: 'Counts', permission: 'inventory.v2_operations.read' },
  { id: 'replenishment', label: 'Replenishment', permission: 'inventory.v2_reports.read' },
  { id: 'reports', label: 'Reports', permission: 'inventory.v2_reports.read' },
  { id: 'settings', label: 'Settings', permission: 'inventory.v2_settings.read' },
]

const TABLE_META = {
  products: {
    title: 'Inventory V2 Products',
    description: 'Product templates and variants will be managed in this tab.',
    columns: ['Name', 'Type', 'UoM', 'Status'],
  },
  receipts: { title: 'Receipts', description: 'Inbound operation queue scaffold.', columns: ['Operation', 'Warehouse', 'Status', 'Created At'] },
  deliveries: { title: 'Deliveries', description: 'Outbound operation queue scaffold.', columns: ['Operation', 'Warehouse', 'Status', 'Created At'] },
  transfers: { title: 'Transfers', description: 'Internal transfer queue scaffold.', columns: ['Operation', 'Source', 'Target', 'Status'] },
  productionMoves: { title: 'Production Moves', description: 'Production consume/output scaffold.', columns: ['Operation', 'Type', 'Status', 'Created At'] },
  adjustments: { title: 'Adjustments', description: 'Adjustment operation scaffold.', columns: ['Operation', 'Reason', 'Status', 'Created At'] },
  counts: { title: 'Counts', description: 'Cycle and annual count sessions scaffold.', columns: ['Session', 'Warehouse', 'Status', 'Started At'] },
  replenishment: { title: 'Replenishment', description: 'Min/Max proposal scaffold for Phase 2.', columns: ['Product', 'Available', 'Min', 'Suggested Qty'] },
  reports: { title: 'Reports', description: 'Operational reports scaffold for Phase 2.', columns: ['Report', 'Range', 'Rows', 'Updated At'] },
  settings: { title: 'Settings', description: 'Inventory V2 configuration scaffold.', columns: ['Setting', 'Value', 'Scope', 'Updated At'] },
}

export const InventoryV2Page = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : EMPTY_PERMISSIONS
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}
  const canAccessInventory = Boolean(capabilities.canAccessInventory)

  const visibleTabs = useMemo(() => {
    return TAB_DEFINITIONS.filter((tab) => !tab.permission || permissions.includes(tab.permission))
  }, [permissions])

  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState([])

  useEffect(() => {
    if (!permissions.includes('inventory.v2_products.read')) {
      return
    }

    let mounted = true
    inventoryApi.fetchV2Products().then((response) => {
      if (!mounted) return
      setProducts(Array.isArray(response?.products) ? response.products : [])
    }).catch(() => {
      if (mounted) setProducts([])
    })

    return () => {
      mounted = false
    }
  }, [permissions])
  const resolvedActiveTab = visibleTabs.find((tab) => tab.id === activeTab) ? activeTab : (visibleTabs[0]?.id || 'dashboard')

  if (!canAccessInventory) {
    return <AccessDenied message="دسترسی کافی برای ماژول انبار وجود ندارد." />
  }

  const dashboardCards = [
    { label: 'Products', value: products.length },
    { label: 'Warehouses', value: permissions.includes('inventory.v2_warehouses.read') ? 'Enabled' : 'Hidden' },
    { label: 'Locations', value: permissions.includes('inventory.v2_locations.read') ? 'Enabled' : 'Hidden' },
    { label: 'Lots', value: permissions.includes('inventory.v2_lots.read') ? 'Enabled' : 'Hidden' },
  ]

  const activeMeta = TABLE_META[resolvedActiveTab]
  const visibleProducts = permissions.includes('inventory.v2_products.read') ? products : []
  const productRows = visibleProducts.slice(0, 25).map((product) => [
    product?.name || '-',
    product?.productType || '-',
    product?.uom || '-',
    product?.isActive ? 'Active' : 'Inactive',
  ])

  return (
    <div className="mx-auto max-w-[1400px] space-y-4" dir="rtl">
      <Card padding="md" className="space-y-3">
        <div>
          <div className="text-base font-black text-slate-900">Inventory V2 Foundation</div>
          <div className="text-xs font-bold text-slate-500">Shell-only view for Phase 1 with role-aware tabs and table scaffolds.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={resolvedActiveTab === tab.id ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      {resolvedActiveTab === 'dashboard' && (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {dashboardCards.map((card) => (
            <Card key={card.label} padding="md">
              <div className="text-xs font-bold text-slate-500">{card.label}</div>
              <div className="mt-1 text-xl font-black text-slate-900">{card.value}</div>
            </Card>
          ))}
        </section>
      )}

      {activeMeta && resolvedActiveTab !== 'dashboard' && (
        <InventoryV2TableScaffold
          title={activeMeta.title}
          description={activeMeta.description}
          columns={activeMeta.columns}
          rows={resolvedActiveTab === 'products' ? productRows : []}
        />
      )}
    </div>
  )
}
