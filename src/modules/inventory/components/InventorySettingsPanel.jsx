import { useState } from 'react'
import { Button, Card } from '@/components/shared/ui'
import { InventoryWarehousesPanel } from '@/modules/inventory/components/InventoryWarehousesPanel'
import { InventoryLocationsPanel } from '@/modules/inventory/components/InventoryLocationsPanel'
import { InventoryLotsPanel } from '@/modules/inventory/components/InventoryLotsPanel'

const SETTINGS_TABS = [
  { id: 'warehouses', label: 'انبارها' },
  { id: 'locations', label: 'مکان‌ها' },
  { id: 'lots', label: 'لات‌ها' },
]

export const InventorySettingsPanel = ({ session }) => {
  const [activeTab, setActiveTab] = useState('warehouses')

  return (
    <div className="space-y-3">
      <Card padding="md" className="space-y-3">
        <div>
          <div className="text-sm font-bold text-slate-700">تنظیمات انبار نسخه ۲</div>
          <div className="mt-1 text-xs text-slate-500">مدیریت انبارها، مکان‌های ذخیره‌سازی و لات‌های دسته‌بندی محصولات</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {SETTINGS_TABS.map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'primary' : 'secondary'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card padding="md">
        {activeTab === 'warehouses' && <InventoryWarehousesPanel session={session} />}
        {activeTab === 'locations' && <InventoryLocationsPanel session={session} />}
        {activeTab === 'lots' && <InventoryLotsPanel session={session} />}
      </Card>
    </div>
  )
}
