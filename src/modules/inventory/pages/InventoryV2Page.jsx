import { useEffect, useMemo, useState } from 'react'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Button, Card } from '@/components/shared/ui'
import { InventoryV2TableScaffold } from '@/modules/inventory/components/InventoryV2TableScaffold'
import { InventoryReceiptsPanel } from '@/modules/inventory/components/InventoryReceiptsPanel'
import { InventoryDeliveriesPanel } from '@/modules/inventory/components/InventoryDeliveriesPanel'
import { InventoryTransfersPanel } from '@/modules/inventory/components/InventoryTransfersPanel'
import { InventoryAdjustmentsPanel } from '@/modules/inventory/components/InventoryAdjustmentsPanel'
import { InventoryProductionPanel } from '@/modules/inventory/components/InventoryProductionPanel'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const EMPTY_PERMISSIONS = Object.freeze([])

const TAB_DEFINITIONS = [
  { id: 'dashboard', label: 'داشبورد', permission: null },
  { id: 'products', label: 'محصولات', permission: 'inventory.v2_products.read' },
  { id: 'receipts', label: 'رسیدها', permission: 'inventory.v2_operations.read' },
  { id: 'deliveries', label: 'حواله ها', permission: 'inventory.v2_operations.read' },
  { id: 'transfers', label: 'انتقال ها', permission: 'inventory.v2_operations.read' },
  { id: 'productionMoves', label: 'حرکت های تولید', permission: 'inventory.v2_operations.read' },
  { id: 'adjustments', label: 'تعدیلات', permission: 'inventory.v2_operations.read' },
  { id: 'counts', label: 'شمارش ها', permission: 'inventory.v2_operations.read' },
  { id: 'replenishment', label: 'تامین مجدد', permission: 'inventory.v2_reports.read' },
  { id: 'reports', label: 'گزارشات', permission: 'inventory.v2_reports.read' },
  { id: 'settings', label: 'تنظیمات', permission: 'inventory.v2_settings.read' },
]

const SCAFFOLD_META = {
  products: {
    title: 'محصولات',
    description: 'تعریف قالب محصول و گونه های محصول.',
    columns: ['نام', 'نوع', 'واحد', 'وضعیت'],
  },
  counts: {
    title: 'شمارش ها',
    description: 'نشست های شمارش دوره ای و سالانه.',
    columns: ['کد نشست', 'انبار', 'وضعیت', 'تاریخ شروع'],
  },
  replenishment: {
    title: 'تامین مجدد',
    description: 'پیشنهاد خرید/تولید بر اساس حداقل و حداکثر.',
    columns: ['محصول', 'موجودی قابل دسترس', 'حداقل', 'پیشنهاد'],
  },
  reports: {
    title: 'گزارشات',
    description: 'خروجی های عملیاتی و کاردکس.',
    columns: ['گزارش', 'بازه', 'تعداد ردیف', 'آخرین به روزرسانی'],
  },
  settings: {
    title: 'تنظیمات',
    description: 'پیکربندی ماژول انبار نسخه ۲.',
    columns: ['کلید', 'مقدار', 'دامنه', 'آخرین تغییر'],
  },
}

const PRODUCT_TYPE_LABELS = {
  stockable: 'انبارشونده',
  consumable: 'مصرفی',
  service: 'خدماتی',
}

export const InventoryV2Page = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : EMPTY_PERMISSIONS
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}
  const canAccessInventory = Boolean(capabilities.canAccessInventory)

  const visibleTabs = useMemo(
    () => TAB_DEFINITIONS.filter((tab) => !tab.permission || permissions.includes(tab.permission)),
    [permissions],
  )

  const [activeTab, setActiveTab] = useState('dashboard')
  const [products, setProducts] = useState([])

  useEffect(() => {
    if (!permissions.includes('inventory.v2_products.read')) return
    let mounted = true
    inventoryApi.fetchV2Products().then((res) => {
      if (mounted) setProducts(Array.isArray(res?.products) ? res.products : [])
    }).catch(() => {
      if (mounted) setProducts([])
    })
    return () => {
      mounted = false
    }
  }, [permissions])

  const resolvedTab = visibleTabs.find((tab) => tab.id === activeTab) ? activeTab : (visibleTabs[0]?.id ?? 'dashboard')

  if (!canAccessInventory) {
    return <AccessDenied message="دسترسی کافی برای ماژول انبار وجود ندارد." />
  }

  const dashboardCards = [
    { label: 'تعداد محصولات', value: products.length },
    { label: 'انبارها', value: permissions.includes('inventory.v2_warehouses.read') ? 'فعال' : 'مخفی' },
    { label: 'مکان ها', value: permissions.includes('inventory.v2_locations.read') ? 'فعال' : 'مخفی' },
    { label: 'لات ها', value: permissions.includes('inventory.v2_lots.read') ? 'فعال' : 'مخفی' },
  ]

  const productRows = permissions.includes('inventory.v2_products.read')
    ? products.slice(0, 25).map((product) => [
      product?.name ?? '-',
      PRODUCT_TYPE_LABELS[product?.productType] ?? '-',
      product?.uom ?? '-',
      product?.isActive ? 'فعال' : 'غیرفعال',
    ])
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
      case 'productionMoves':
        return <InventoryProductionPanel session={session} />
      case 'products': {
        const meta = SCAFFOLD_META.products
        return <InventoryV2TableScaffold title={meta.title} description={meta.description} columns={meta.columns} rows={productRows} />
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
          <div className="text-base font-black text-slate-900">انبار نسخه ۲</div>
          <div className="text-xs font-bold text-slate-500">نسخه عملیاتی کامل با یکپارچگی فروش و تولید</div>
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
