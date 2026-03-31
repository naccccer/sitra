import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronLeft, LogOut, PlusCircle, X } from 'lucide-react'
import { isModuleEnabled } from '@/kernel/moduleRegistry'
import { getVisibleAccountingTabs } from '@/modules/accounting/navigation'
import { useTabSettings } from '@/modules/accounting/hooks/useTabSettings'
import { getVisibleInventoryTabs } from '@/modules/inventory/navigation'
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '@/utils/profile'
import {
  getNavSections,
  getQueryTab,
  navChildLinkClass,
  navLinkClass,
  pathMatches,
  toNavTarget,
} from '@/components/layout/sidebarNav'
// UI copy anchors: عملیات روزانه | پیکربندی | اطلاعات پایه | ممیزی فعالیت‌ها
const EMPTY_PERMISSIONS = Object.freeze([])

export const Sidebar = ({
  profile,
  session,
  onLogout = () => {},
  isCollapsed = false,
  isOpen = false,
  onCloseMobile = () => {},
  onNavigate = () => {},
}) => {
  const location = useLocation()
  const normalizedProfile = normalizeProfile(profile)
  const logoSrc = profileLogoSrc(normalizedProfile.logoPath)
  const [failedLogoSrc, setFailedLogoSrc] = useState('')
  const [manualGroupState, setManualGroupState] = useState({ id: null, collapsed: false })
  const showLogo = Boolean(logoSrc) && failedLogoSrc !== logoSrc
  const fallbackLetter = profileBrandInitial(normalizedProfile)
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}
  const modules = Array.isArray(session?.modules) ? session.modules : []
  const permissions = Array.isArray(session?.permissions) ? session.permissions : EMPTY_PERMISSIONS
  const { isVisible } = useTabSettings()
  const inventoryTabs = getVisibleInventoryTabs(permissions)
  const accountingTabs = getVisibleAccountingTabs(permissions, isVisible)
  const navSections = getNavSections({ inventoryTabs, accountingTabs })

  const isVisibleItem = (item) => {
    if (typeof item.when === 'function' && !item.when(capabilities, modules)) return false
    if (item.capability && !capabilities[item.capability]) return false
    if (item.moduleId && !isModuleEnabled(modules, item.moduleId)) return false
    return true
  }

  const filterVisibleItems = (items = []) => (
    items.reduce((result, item) => {
      if (!isVisibleItem(item)) return result
      if (!Array.isArray(item.children) || item.children.length === 0) {
        result.push(item)
        return result
      }

      const visibleChildren = item.children.filter(isVisibleItem)
      if (visibleChildren.length === 0) return result
      result.push({ ...item, children: visibleChildren })
      return result
    }, [])
  )

  const visibleSections = navSections
    .map((section) => ({ ...section, items: filterVisibleItems(section.items) }))
    .filter((section) => section.items.length > 0)

  const defaultTabByPath = {}
  visibleSections.forEach((section) => {
    section.items.forEach((item) => {
      if (!Array.isArray(item.children)) return
      const firstTab = item.children.find((child) => child.to === item.to && child.tab)?.tab
      if (firstTab) defaultTabByPath[item.to] = firstTab
    })
  })

  const isTargetActive = (item) => {
    if (!pathMatches(location.pathname, item.to)) return false
    if (!item.tab) return true

    const currentTab = getQueryTab(location.search)
    if (currentTab) return currentTab === item.tab
    return defaultTabByPath[item.to] === item.tab
  }

  const getSectionGroups = (section) => {
    if (section.id !== 'system') return [{ id: `${section.id}-default`, label: '', items: section.items }]

    const groupDefs = [
      { id: 'daily-config', label: 'تنظیمات روزمره' },
      { id: 'owner-config', label: 'سطح مالک/پیشرفته' },
    ]

    const grouped = groupDefs
      .map((group) => ({ ...group, items: section.items.filter((item) => item.group === group.id) }))
      .filter((group) => group.items.length > 0)

    const ungrouped = section.items.filter((item) => !item.group)
    if (ungrouped.length > 0) {
      if (grouped.length > 0) {
        grouped[0] = { ...grouped[0], items: [...grouped[0].items, ...ungrouped] }
      } else {
        grouped.push({ id: 'fallback', label: '', items: ungrouped })
      }
    }

    return grouped.length > 0 ? grouped : [{ id: 'system-fallback', label: '', items: section.items }]
  }

  const accordionItems = visibleSections
    .flatMap((section) => section.items)
    .filter((item) => Array.isArray(item.children) && item.children.length > 0)

  const matchedGroup = accordionItems.find((item) => (
    isTargetActive(item) || item.children.some((child) => isTargetActive(child))
  ))
  const activeGroupId = matchedGroup?.id || null

  let openGroupId = null
  if (manualGroupState.id) {
    openGroupId = manualGroupState.collapsed ? null : manualGroupState.id
  } else if (activeGroupId) {
    openGroupId = activeGroupId
  }

  const visualActiveGroupId = openGroupId || activeGroupId

  const handleGroupToggle = (itemId) => {
    setManualGroupState((prev) => {
      if (prev.id === itemId) {
        return { id: itemId, collapsed: !prev.collapsed }
      }

      return { id: itemId, collapsed: false }
    })
  }

  const canCreateOrders = Boolean(capabilities.canManageOrders) && isModuleEnabled(modules, 'sales')

  return (
    <aside
      className={`print-hide fixed inset-y-0 right-0 z-40 flex w-72 shrink-0 flex-col overflow-hidden border-l border-[rgba(var(--ui-primary),0.08)] bg-[rgba(var(--ui-surface-glass),0.86)] px-3 py-3 shadow-ui-raised backdrop-blur-xl transition-transform duration-200 lg:static lg:z-auto lg:h-[calc(100vh-2rem)] lg:translate-x-0 lg:rounded-[var(--radius-2xl)] lg:border lg:bg-[rgba(var(--ui-surface-elevated),0.82)] ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${isCollapsed ? 'lg:w-24' : 'lg:w-72'}`}
      dir="rtl"
    >
      <button
        type="button"
        onClick={onCloseMobile}
        title="بستن منو"
        className="focus-ring surface-icon-chip mb-2 self-end text-[rgb(var(--ui-text-muted))] lg:hidden"
      >
        <X size={16} />
      </button>

      <div className={`surface-accent mb-3 overflow-hidden border px-3 py-3 ${isCollapsed ? 'lg:px-2 lg:py-2.5' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'gap-2 lg:justify-center' : 'gap-3'}`}>
          <div className="surface-icon-chip flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] text-base font-black text-[rgb(var(--ui-primary))]">
            {showLogo ? (
              <img
                src={logoSrc}
                alt={normalizedProfile.brandName}
                onError={() => setFailedLogoSrc(logoSrc)}
                className="h-full w-full object-cover"
              />
            ) : (
              fallbackLetter
            )}
          </div>
          <div className={isCollapsed ? 'lg:hidden' : ''}>
            <div className="text-sm font-black text-[rgb(var(--ui-primary))]">{normalizedProfile.brandName}</div>
            <div className="text-[10px] font-bold text-[rgb(var(--ui-text-muted))]">{normalizedProfile.panelSubtitle}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pe-1">
        <nav className="space-y-3">
          {visibleSections.map((section) => (
            <div key={section.id} className="space-y-1.5">
              <div className={`px-1 text-[10px] font-black uppercase tracking-[0.18em] text-[rgb(var(--ui-text-muted))] ${isCollapsed ? 'lg:hidden' : ''}`}>
                {section.label}
              </div>

              {getSectionGroups(section).map((group, groupIndex, allGroups) => (
                <div key={group.id} className="space-y-1.5">
                  {section.id === 'system' && group.label && (
                    <div className={`px-1 text-[10px] font-bold text-[rgb(var(--ui-text-muted))] ${isCollapsed ? 'lg:hidden' : ''}`}>{group.label}</div>
                  )}

                  <div className="space-y-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const hasChildren = Array.isArray(item.children) && item.children.length > 0
                      const isGroupOpen = hasChildren && openGroupId === item.id
                      const isGroupCurrentlyActive = hasChildren && visualActiveGroupId === item.id

                      if (!hasChildren) {
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            end={Boolean(item.end)}
                            onClick={onNavigate}
                            className={({ isActive }) => navLinkClass(isActive, isCollapsed, item.id === 'owner' ? 'owner' : 'default')}
                            title={item.label}
                          >
                            <Icon size={16} />
                            <span className={`text-start ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                          </NavLink>
                        )
                      }

                      return (
                        <div key={item.id || item.to} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleGroupToggle(item.id)}
                            className={`${navLinkClass(
                              isGroupCurrentlyActive,
                              isCollapsed,
                              item.id === 'owner' ? 'owner' : 'default',
                            )} w-full`}
                            title={item.label}
                            aria-expanded={isGroupOpen}
                            aria-controls={`${item.id}-submenu`}
                          >
                            <Icon size={16} />
                            <span className={`flex-1 text-start ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                            <span className={isCollapsed ? 'lg:hidden' : ''}>
                              {isGroupOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                            </span>
                          </button>

                          {isGroupOpen && (
                            <div
                              id={`${item.id}-submenu`}
                              className={`space-y-1 rounded-[var(--radius-lg)] border p-1 pe-1.5 ${
                                item.id === 'owner'
                                  ? 'border-[rgba(var(--ui-accent),0.28)] bg-[rgba(var(--ui-accent),0.1)]'
                                  : 'border-[rgba(var(--ui-primary),0.08)] bg-[rgba(var(--ui-primary),0.04)]'
                              } ${isCollapsed ? 'lg:hidden' : ''}`}
                            >
                              {item.children.map((child) => (
                                <NavLink
                                  key={`${child.to}:${child.tab || ''}`}
                                  to={toNavTarget(child)}
                                  onClick={onNavigate}
                                  className={() => navChildLinkClass(isTargetActive(child), item.id === 'owner' ? 'owner' : 'default')}
                                  title={child.label}
                                >
                                  <span className="truncate">{child.label}</span>
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {section.id === 'system' && groupIndex < allGroups.length - 1 && (
                    <div className={`my-1 h-px bg-[rgba(var(--ui-border),0.75)] ${isCollapsed ? 'lg:hidden' : ''}`} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-3">
          {canCreateOrders && (
            <NavLink
              to="/orders/new"
              onClick={onNavigate}
              title="ثبت سفارش جدید"
              className={`focus-ring flex items-center rounded-[var(--radius-lg)] border border-[rgba(var(--ui-primary),0.22)] bg-[linear-gradient(135deg,rgba(var(--ui-primary),0.94),rgba(var(--ui-primary-soft),0.94))] px-2.5 py-2 text-xs font-black text-[rgb(var(--ui-primary-contrast))] shadow-ui-soft transition-[filter,transform] hover:brightness-105 ${isCollapsed ? 'lg:justify-center lg:px-2' : 'justify-center gap-1.5'}`}
            >
              <PlusCircle size={14} />
              <span className={isCollapsed ? 'lg:hidden' : ''}>ثبت سفارش جدید</span>
            </NavLink>
          )}
        </div>
      </div>

      <div className="mt-auto space-y-2 border-t border-[rgba(var(--ui-border),0.8)] pt-3">
        <button
          type="button"
          onClick={onLogout}
          className={`focus-ring flex w-full items-center rounded-[var(--radius-lg)] border border-[rgba(var(--ui-danger),0.18)] bg-[rgba(var(--ui-danger),0.1)] px-2.5 py-2 text-xs font-black text-[rgb(var(--ui-danger))] transition-[background-color,border-color,color] hover:bg-[rgba(var(--ui-danger),0.16)] ${isCollapsed ? 'lg:justify-center lg:px-2' : 'gap-1.5'}`}
          title="خروج"
        >
          <LogOut size={14} />
          <span className={isCollapsed ? 'lg:hidden' : ''}>خروج</span>
        </button>
      </div>
    </aside>
  )
}
