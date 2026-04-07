import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Card, WorkspaceShellTemplate } from '@/components/shared/ui'
import { InventoryCatalogWorkspace } from '@/modules/inventory/components/InventoryCatalogWorkspace'
import { InventoryHelpPanel } from '@/modules/inventory/components/InventoryHelpPanel'
import { InventoryHierarchyTabs } from '@/modules/inventory/components/InventoryHierarchyTabs'
import { InventoryOperationsWorkspace } from '@/modules/inventory/components/InventoryOperationsWorkspace'
import { InventorySettingsPanel } from '@/modules/inventory/components/InventorySettingsPanel'
import { InventoryStockWorkspace } from '@/modules/inventory/components/InventoryStockWorkspace'
import {
  getInventoryOperationConfig,
  getVisibleInventoryTabs,
  INVENTORY_CATALOG_TABS,
  INVENTORY_OPERATION_WORKSPACE_TABS,
  INVENTORY_SETTINGS_TABS,
  INVENTORY_STOCK_TABS,
} from '@/modules/inventory/config/inventoryConfig'

const EMPTY_PERMISSIONS = Object.freeze([])

const getDefaultChildTab = (tabId) => {
  switch (tabId) {
    case 'catalog':
      return INVENTORY_CATALOG_TABS[0]?.id ?? ''
    case 'operations':
      return INVENTORY_OPERATION_WORKSPACE_TABS[0]?.id ?? ''
    case 'stock':
      return INVENTORY_STOCK_TABS[0]?.id ?? ''
    case 'settings':
      return INVENTORY_SETTINGS_TABS[0]?.id ?? ''
    default:
      return ''
  }
}

export const InventoryV2Page = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : EMPTY_PERMISSIONS
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}
  const canAccessInventory = Boolean(capabilities.canAccessInventory)
  const [searchParams, setSearchParams] = useSearchParams()

  const visibleTabs = useMemo(() => getVisibleInventoryTabs(permissions), [permissions])
  const currentTab = String(searchParams.get('tab') || '').trim()
  const resolvedTab = visibleTabs.find((tab) => tab.id === currentTab)?.id ?? (visibleTabs[0]?.id ?? '')
  const currentSubtab = String(searchParams.get('subtab') || '').trim()
  const currentDetail = String(searchParams.get('detail') || '').trim()

  const childTabs = (() => {
    switch (resolvedTab) {
      case 'catalog':
        return INVENTORY_CATALOG_TABS
      case 'operations':
        return INVENTORY_OPERATION_WORKSPACE_TABS
      case 'stock':
        return INVENTORY_STOCK_TABS
      case 'settings':
        return INVENTORY_SETTINGS_TABS
      default:
        return []
    }
  })()

  const resolvedChildTab = childTabs.find((tab) => tab.id === currentSubtab)?.id ?? getDefaultChildTab(resolvedTab)
  const productionTabs = resolvedChildTab === 'production'
    ? ['production_consume', 'production_output'].map((id) => {
      const config = getInventoryOperationConfig(id)
      return { id: config.id, label: config.workspaceLabel }
    })
    : []
  const resolvedDetailTab = productionTabs.find((tab) => tab.id === currentDetail)?.id ?? (productionTabs[0]?.id ?? '')

  const updateNav = (next) => {
    const tab = next.tab ?? resolvedTab
    const subtab = Object.prototype.hasOwnProperty.call(next, 'subtab') ? next.subtab : resolvedChildTab
    const detail = Object.prototype.hasOwnProperty.call(next, 'detail') ? next.detail : resolvedDetailTab

    const params = new URLSearchParams()
    if (tab) params.set('tab', tab)
    if (subtab) params.set('subtab', subtab)
    if (detail) params.set('detail', detail)
    setSearchParams(params)
  }

  if (!canAccessInventory) {
    return <AccessDenied message="دسترسی کافی برای ماژول انبار وجود ندارد." />
  }

  if (!resolvedTab) {
    return <AccessDenied message="برای این ماژول هیچ بخش قابل‌نمایشی با سطح دسترسی فعلی شما فعال نیست." />
  }

  const renderContent = () => {
    switch (resolvedTab) {
      case 'help':
        return <InventoryHelpPanel />
      case 'catalog':
        return <InventoryCatalogWorkspace session={session} activeTab={resolvedChildTab} />
      case 'operations':
        return <InventoryOperationsWorkspace session={session} activeTab={resolvedChildTab} activeDetailTab={resolvedDetailTab} />
      case 'stock':
        return <InventoryStockWorkspace session={session} activeTab={resolvedChildTab} />
      case 'settings':
        return <InventorySettingsPanel session={session} activeTab={resolvedChildTab} />
      default:
        return null
    }
  }

  return (
    <WorkspaceShellTemplate
      eyebrow="انبار"
      title="میزکار عملیات انبار"
      description="کاتالوگ، عملیات، موجودی و تنظیمات با گرامر یکپارچه جدول/فیلتر/اقدام."
      tabs={(
        <Card padding="md">
          <InventoryHierarchyTabs
            tabs={visibleTabs}
            activeTabId={resolvedTab}
            onTabChange={(tabId) => {
              const nextSubtab = getDefaultChildTab(tabId)
              const nextDetail = nextSubtab === 'production' ? 'production_consume' : ''
              updateNav({ tab: tabId, subtab: nextSubtab, detail: nextDetail })
            }}
            childTabs={childTabs}
            activeChildId={resolvedChildTab}
            onChildChange={(childId) => {
              const nextDetail = childId === 'production' ? 'production_consume' : ''
              updateNav({ subtab: childId, detail: nextDetail })
            }}
            grandchildTabs={productionTabs}
            activeGrandchildId={resolvedDetailTab}
            onGrandchildChange={(detailId) => updateNav({ detail: detailId })}
          />
        </Card>
      )}
    >
      {renderContent()}
    </WorkspaceShellTemplate>
  )
}
