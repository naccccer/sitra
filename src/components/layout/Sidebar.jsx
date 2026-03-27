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

  const accordionItems = visibleSections
    .flatMap((section) => section.items)
    .filter((item) => Array.isArray(item.children) && item.children.length > 0)

  const matchedGroup = accordionItems.find((item) => (
    isTargetActive(item) || item.children.some((child) => isTargetActive(child))
  ))
  const activeGroupId = matchedGroup?.id || null

  let openGroupId = manualGroupState.collapsed ? null : manualGroupState.id
  if (activeGroupId) {
    openGroupId = manualGroupState.collapsed && manualGroupState.id === activeGroupId ? null : activeGroupId
  }

  const canCreateOrders = Boolean(capabilities.canManageOrders) && isModuleEnabled(modules, 'sales')

  return (
    <aside
      className={`print-hide fixed inset-y-0 right-0 z-40 flex w-64 shrink-0 flex-col overflow-hidden border-l border-slate-200/90 bg-white/95 px-3 py-3 shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:h-screen lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${isCollapsed ? 'lg:w-20' : 'lg:w-60'}`}
      dir="rtl"
    >
      <button
        type="button"
        onClick={onCloseMobile}
        title="بستن منو"
        className="focus-ring mb-2 inline-flex h-9 w-9 items-center justify-center self-end rounded-xl bg-white text-slate-700 lg:hidden"
      >
        <X size={16} />
      </button>

      <div className={`mb-3 rounded-2xl bg-slate-900 text-white shadow-md ${isCollapsed ? 'p-2 lg:p-2' : 'px-2.5 py-2.5'}`}>
        <div className={`flex items-center ${isCollapsed ? 'gap-2 lg:justify-center' : 'gap-2'}`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 text-base font-black shadow-inner">
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
            <div className="text-sm font-black">{normalizedProfile.brandName}</div>
            <div className="text-[10px] text-slate-300">{normalizedProfile.panelSubtitle}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pe-1">
        <nav className="space-y-3">
          {visibleSections.map((section) => (
            <div key={section.id} className="space-y-1.5">
              <div className={`px-1 text-[10px] font-black text-slate-400 ${isCollapsed ? 'lg:hidden' : ''}`}>{section.label}</div>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const hasChildren = Array.isArray(item.children) && item.children.length > 0
                  const isGroupOpen = hasChildren && openGroupId === item.id

                  if (!hasChildren) {
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={Boolean(item.end)}
                        onClick={onNavigate}
                        className={({ isActive }) => navLinkClass(isActive, isCollapsed)}
                        title={item.label}
                      >
                        <Icon size={16} />
                        <span className={`text-start ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                      </NavLink>
                    )
                  }

                  return (
                    <div key={item.id || item.to} className="space-y-1">
                      <NavLink
                        to={toNavTarget(item)}
                        onClick={() => {
                          setManualGroupState(() => (
                            openGroupId === item.id
                              ? { id: item.id, collapsed: true }
                              : { id: item.id, collapsed: false }
                          ))
                          onNavigate()
                        }}
                        className={() => navLinkClass(
                          isTargetActive(item) || item.children.some((child) => isTargetActive(child)),
                          isCollapsed,
                        )}
                        title={item.label}
                      >
                        <Icon size={16} />
                        <span className={`flex-1 text-start ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                        <span className={isCollapsed ? 'lg:hidden' : ''}>
                          {isGroupOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                        </span>
                      </NavLink>

                      {isGroupOpen && (
                        <div className={`space-y-1 rounded-xl bg-slate-100/80 p-1 pe-1.5 ring-1 ring-slate-200/70 ${isCollapsed ? 'lg:hidden' : ''}`}>
                          {item.children.map((child) => (
                            <NavLink
                              key={`${child.to}:${child.tab || ''}`}
                              to={toNavTarget(child)}
                              onClick={onNavigate}
                              className={() => navChildLinkClass(isTargetActive(child))}
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
            </div>
          ))}
        </nav>

        <div className="mt-3">
          {canCreateOrders && (
            <NavLink
              to="/orders/new"
              onClick={onNavigate}
              title="ثبت سفارش جدید"
              className={`focus-ring flex items-center rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-black text-white transition-colors hover:bg-emerald-500 ${isCollapsed ? 'lg:justify-center lg:px-2' : 'justify-center gap-1'}`}
            >
              <PlusCircle size={14} />
              <span className={isCollapsed ? 'lg:hidden' : ''}>ثبت سفارش جدید</span>
            </NavLink>
          )}
        </div>
      </div>

      <div className="mt-auto space-y-2 border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={onLogout}
          className={`focus-ring flex w-full items-center rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-black text-rose-700 transition-colors hover:bg-rose-100 ${isCollapsed ? 'lg:justify-center lg:px-2' : 'gap-1.5'}`}
          title="خروج"
        >
          <LogOut size={14} />
          <span className={isCollapsed ? 'lg:hidden' : ''}>خروج</span>
        </button>
      </div>
    </aside>
  )
}
