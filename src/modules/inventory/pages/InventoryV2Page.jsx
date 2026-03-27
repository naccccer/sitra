import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Button, Card } from '@/components/shared/ui'
import { InventoryProductsPanel } from '@/modules/inventory/components/InventoryProductsPanel'
import { InventoryReceiptsPanel } from '@/modules/inventory/components/InventoryReceiptsPanel'
import { InventoryDeliveriesPanel } from '@/modules/inventory/components/InventoryDeliveriesPanel'
import { InventoryTransfersPanel } from '@/modules/inventory/components/InventoryTransfersPanel'
import { InventoryAdjustmentsPanel } from '@/modules/inventory/components/InventoryAdjustmentsPanel'
import { InventoryProductionPanel } from '@/modules/inventory/components/InventoryProductionPanel'
import { InventoryCountsPanel } from '@/modules/inventory/components/InventoryCountsPanel'
import { InventoryReplenishmentPanel } from '@/modules/inventory/components/InventoryReplenishmentPanel'
import { InventoryReportsPanel } from '@/modules/inventory/components/InventoryReportsPanel'
import { InventorySettingsPanel } from '@/modules/inventory/components/InventorySettingsPanel'
import { getVisibleInventoryTabs } from '@/modules/inventory/navigation'

const EMPTY_PERMISSIONS = Object.freeze([])

export const InventoryV2Page = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : EMPTY_PERMISSIONS
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}
  const canAccessInventory = Boolean(capabilities.canAccessInventory)
  const [searchParams, setSearchParams] = useSearchParams()

  const visibleTabs = useMemo(() => getVisibleInventoryTabs(permissions), [permissions])
  const currentTab = String(searchParams.get('tab') || '').trim()
  const resolvedTab = visibleTabs.find((tab) => tab.id === currentTab)?.id ?? (visibleTabs[0]?.id ?? 'dashboard')

  if (!canAccessInventory) {
    return <AccessDenied message="دسترسی کافی برای ماژول انبار وجود ندارد." />
  }

  const renderContent = () => {
    switch (resolvedTab) {
      case 'dashboard':
        return (
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'محصولات', perm: 'inventory.v2_products.read' },
              { label: 'انبارها', perm: 'inventory.v2_warehouses.read' },
              { label: 'مکان‌های ذخیره', perm: 'inventory.v2_locations.read' },
              { label: 'لات‌ها', perm: 'inventory.v2_lots.read' },
            ].map((card) => (
              <Card key={card.label} padding="md">
                <div className="text-xs font-bold text-slate-500">{card.label}</div>
                <div className="mt-1 text-xl font-black text-slate-900">
                  {permissions.includes(card.perm) ? 'فعال' : 'مخفی'}
                </div>
              </Card>
            ))}
          </section>
        )
      case 'products':
        return <InventoryProductsPanel session={session} />
      case 'receipts':
        return <InventoryReceiptsPanel session={session} />
      case 'deliveries':
        return <InventoryDeliveriesPanel session={session} />
      case 'transfers':
        return <InventoryTransfersPanel session={session} />
      case 'adjustments':
        return <InventoryAdjustmentsPanel session={session} />
      case 'productionMoves':
        return <InventoryProductionPanel session={session} />
      case 'counts':
        return <InventoryCountsPanel session={session} />
      case 'replenishment':
        return <InventoryReplenishmentPanel session={session} />
      case 'reports':
        return <InventoryReportsPanel session={session} />
      case 'settings':
        return <InventorySettingsPanel session={session} />
      default:
        return null
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4" dir="rtl">
      <Card padding="md" className="space-y-3">
        <div>
          <div className="text-base font-black text-slate-900">انبار نسخه ۲</div>
          <div className="text-xs font-bold text-slate-500">نسخه عملیاتی کامل با یکپارچگی فروش و تولید</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={resolvedTab === tab.id ? 'primary' : 'secondary'}
              onClick={() => setSearchParams({ tab: tab.id })}
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

