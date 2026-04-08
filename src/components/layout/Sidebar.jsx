import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, LogOut, X } from 'lucide-react'
import { Tooltip } from '@/components/shared/ui'
import { isModuleEnabled } from '@/kernel/moduleRegistry'
import { getVisibleAccountingTabs } from '@/modules/accounting/navigation'
import { useTabSettings } from '@/modules/accounting/hooks/useTabSettings'
import { getVisibleInventoryTabs } from '@/modules/inventory/navigation'
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '@/utils/profile'
import { getNavSections, getQueryTab, navChildLinkClass, navLinkClass, pathMatches, toNavTarget } from '@/components/layout/sidebarNav'

// UI copy anchors: عملیات روزانه | پیکربندی | اطلاعات پایه | ممیزی فعالیت‌ها
const EMPTY_PERMISSIONS = Object.freeze([])
const SidebarItemIcon = ({ icon, size = 17 }) => (
  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center leading-none">
    {icon ? React.createElement(icon, { size }) : null}
  </span>
)

const getItemPrimaryTarget = (item) => {
  if (!Array.isArray(item.children) || item.children.length === 0) return toNavTarget(item)
  if (item.dynamicToFirstVisibleChild) return toNavTarget(item.children[0])
  const firstTabbedChild = item.children.find((child) => child.to === item.to && child.tab)
  return toNavTarget(firstTabbedChild || item)
}

export const Sidebar = ({ profile, session, onLogout = () => {}, isCollapsed = false, isOpen = false, onCloseMobile = () => {}, onNavigate = () => {} }) => {
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
  const isRailCollapsed = isCollapsed && !isOpen
  const desktopSidebarWidth = isRailCollapsed ? 'var(--shell-rail-width-collapsed)' : 'var(--shell-rail-width)'
  const textRevealClass = isRailCollapsed
    ? 'max-w-0 -translate-x-1 opacity-0'
    : 'max-w-[12rem] translate-x-0 opacity-100'

  const isVisibleItem = (item) => {
    if (typeof item.when === 'function' && !item.when(capabilities, modules)) return false
    if (item.capability && !capabilities[item.capability]) return false
    if (item.moduleId && !isModuleEnabled(modules, item.moduleId)) return false
    return true
  }

  const visibleSections = getNavSections({
    inventoryTabs: getVisibleInventoryTabs(permissions),
    accountingTabs: getVisibleAccountingTabs(permissions, isVisible),
  })
    .map((section) => ({
      ...section,
      items: section.items.reduce((result, item) => {
        if (!isVisibleItem(item)) return result
        if (!Array.isArray(item.children) || item.children.length === 0) {
          result.push(item)
          return result
        }
        const visibleChildren = item.children.filter(isVisibleItem)
        if (visibleChildren.length > 0) result.push({ ...item, children: visibleChildren })
        return result
      }, []),
    }))
    .filter((section) => section.items.length > 0)

  const defaultTabByPath = {}
  visibleSections.forEach((section) => {
    section.items.forEach((item) => {
      const firstTab = item.children?.find((child) => child.to === item.to && child.tab)?.tab
      if (firstTab) defaultTabByPath[item.to] = firstTab
    })
  })

  const isTargetActive = (item) => {
    if (!pathMatches(location.pathname, item.to)) return false
    if (!item.tab) return true
    const currentTab = getQueryTab(location.search)
    return currentTab ? currentTab === item.tab : defaultTabByPath[item.to] === item.tab
  }

  const getSectionGroups = (section) => {
    return [{ id: `${section.id}-default`, label: '', items: section.items }]
  }

  const accordionItems = visibleSections.flatMap((section) => section.items).filter((item) => Array.isArray(item.children) && item.children.length > 0)
  const matchedGroup = accordionItems.find((item) => isTargetActive(item) || item.children.some((child) => isTargetActive(child)))
  const activeGroupId = matchedGroup?.id || null
  const openGroupId = isRailCollapsed ? null : manualGroupState.id ? (manualGroupState.collapsed ? null : manualGroupState.id) : activeGroupId
  const visualActiveGroupId = openGroupId || activeGroupId

  const wrapWithTooltip = (node, content) => (
    isRailCollapsed
      ? <Tooltip content={content} side="left" wrapperClassName="flex w-full justify-center">{node}</Tooltip>
      : node
  )

  const renderLeaf = (item, tone) => wrapWithTooltip(
    <NavLink
      key={item.to}
      to={item.to}
      end={Boolean(item.end)}
      onClick={onNavigate}
      aria-label={item.label}
      className={({ isActive }) => navLinkClass(isActive, isRailCollapsed, tone)}
    >
      <SidebarItemIcon icon={item.icon} />
      <span
        aria-hidden={isRailCollapsed}
        className={`overflow-hidden whitespace-nowrap text-start transition-[max-width,opacity,transform] duration-[var(--motion-base)] ${textRevealClass}`}
      >
        {item.label}
      </span>
    </NavLink>,
    item.label,
  )

  const renderGroup = (item, tone, isActive) => {
    if (isRailCollapsed) {
      return wrapWithTooltip(
        <NavLink
          key={item.id || item.to}
          to={getItemPrimaryTarget(item)}
          onClick={onNavigate}
          aria-label={item.label}
          className={() => navLinkClass(isActive, true, tone)}
        >
          <SidebarItemIcon icon={item.icon} />
          <span aria-hidden="true" className="max-w-0 overflow-hidden whitespace-nowrap opacity-0">
            {item.label}
          </span>
        </NavLink>,
        item.label,
      )
    }

    const isGroupOpen = openGroupId === item.id
    return (
      <div key={item.id || item.to}>
        <button
          type="button"
          onClick={() => setManualGroupState((prev) => (prev.id === item.id ? { id: item.id, collapsed: !prev.collapsed } : { id: item.id, collapsed: false }))}
          className={`${navLinkClass(isActive, false, tone)} w-full`}
          aria-expanded={isGroupOpen}
          aria-controls={`${item.id}-submenu`}
          aria-label={item.label}
        >
          <SidebarItemIcon icon={item.icon} />
          <span className={`flex-1 overflow-hidden whitespace-nowrap text-start transition-[max-width,opacity,transform] duration-[var(--motion-base)] ${textRevealClass}`}>
            {item.label}
          </span>
          <span className={`transition-transform duration-[var(--motion-base)] ${isGroupOpen ? 'rotate-0' : '-rotate-90'}`}>
            <ChevronDown size={14} />
          </span>
        </button>
        <div
          id={`${item.id}-submenu`}
          aria-hidden={!isGroupOpen}
          className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out ${isGroupOpen ? 'mt-1 max-h-64 opacity-100' : 'mt-0 max-h-0 opacity-0'}`}
        >
          <div
            className={`relative ms-4 space-y-1.5 ps-4 transition-[transform,opacity] duration-300 ease-out before:absolute before:bottom-4 before:right-0 before:top-3 before:w-px before:bg-[linear-gradient(180deg,rgba(20,20,24,0.45),rgba(20,20,24,0.18)_82%,transparent)] before:content-[''] ${isGroupOpen ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0'}`}
          >
            {item.children.map((child) => (
              <NavLink key={`${child.to}:${child.tab || ''}`} to={toNavTarget(child)} onClick={onNavigate} className={() => navChildLinkClass(isTargetActive(child), tone)}>
                <span className="truncate">{child.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside
      style={{ '--sidebar-shell-width': desktopSidebarWidth }}
      className={`app-shell-nav print-hide fixed inset-y-0 left-0 z-40 flex w-[17.75rem] shrink-0 flex-col overflow-hidden border-r border-white/72 px-3 py-3 shadow-[var(--shadow-overlay)] backdrop-blur-[26px] transition-[width,min-width,flex-basis,padding,transform,border-radius,box-shadow] duration-300 ease-out lg:static lg:z-auto lg:h-full lg:w-[var(--sidebar-shell-width)] lg:min-w-[var(--sidebar-shell-width)] lg:basis-[var(--sidebar-shell-width)] lg:translate-x-0 lg:rounded-[30px] lg:border lg:border-white/72 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      dir="rtl"
    >
      <button type="button" onClick={onCloseMobile} title="بستن منو" className="shell-mobile-dismiss focus-ring mb-2 inline-flex h-10 w-10 items-center justify-center self-end rounded-[var(--radius-lg)] text-slate-700 lg:hidden">
        <X size={16} />
      </button>

      <div className="flex min-h-0 flex-1 flex-col px-1">

      {wrapWithTooltip(
        <div className={`shell-brand-surface mb-3 rounded-[26px] transition-[padding,border-radius,margin,width] duration-[var(--motion-base)] ${isRailCollapsed ? 'mx-auto w-fit p-1.5' : 'w-full px-3 py-3'}`}>
          <div className={`flex items-center transition-[gap] duration-[var(--motion-base)] ${isRailCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className={`shell-brand-mark flex shrink-0 items-center justify-center overflow-hidden text-base font-black text-white transition-[transform,border-radius,width,height] duration-[var(--motion-base)] ${isRailCollapsed ? 'h-10 w-10 rounded-[18px]' : 'h-12 w-12 rounded-[20px]'}`}>
              {showLogo ? <img src={logoSrc} alt={normalizedProfile.brandName} onError={() => setFailedLogoSrc(logoSrc)} className={`h-full w-full ${isRailCollapsed ? 'object-contain p-1' : 'object-cover'}`} /> : fallbackLetter}
            </div>
            {!isRailCollapsed && (
              <div className={`overflow-hidden transition-[max-width,opacity,transform] duration-[var(--motion-base)] ${textRevealClass}`}>
                <div className="text-sm font-black text-[rgb(var(--ui-text))]">{normalizedProfile.brandName}</div>
                <div className="mt-1 text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{normalizedProfile.panelSubtitle}</div>
              </div>
            )}
          </div>
        </div>,
        normalizedProfile.brandName,
      )}

      <div className="shell-scrollbar min-h-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: 'stable' }}>
        <nav className="space-y-4">
          {visibleSections.map((section) => (
            <div key={section.id} className="space-y-2">
              {!isRailCollapsed && (
                <div className="shell-section-label px-1 transition-opacity duration-[var(--motion-base)]">
                  {section.label}
                </div>
              )}
              {getSectionGroups(section).map((group) => (
                <div key={group.id} className="space-y-1.5">
                  {group.items.map((item) => {
                    const tone = section.tone || 'default'
                    const isActive = Array.isArray(item.children) && item.children.length > 0
                      ? visualActiveGroupId === item.id
                      : false
                    if (!Array.isArray(item.children) || item.children.length === 0) return <React.Fragment key={item.to}>{renderLeaf(item, tone)}</React.Fragment>
                    return renderGroup(item, tone, isActive)
                  })}
                </div>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-[rgb(var(--ui-border-soft))] pt-3 transition-[padding,border-color] duration-[var(--motion-base)]">
        {wrapWithTooltip(
          <button
            type="button"
            onClick={onLogout}
            aria-label="خروج"
            className={`focus-ring flex h-11 w-full items-center rounded-[var(--radius-xl)] border border-transparent bg-transparent px-3 text-[13px] font-black text-[rgb(var(--ui-text-muted))] transition duration-[var(--motion-fast)] hover:-translate-y-px hover:border-[rgb(var(--ui-border-soft))] hover:bg-[rgb(var(--ui-surface-muted))]/76 hover:text-[rgb(var(--ui-primary))] ${isRailCollapsed ? 'lg:w-11 lg:justify-center lg:px-0' : 'gap-2'}`}
          >
            <SidebarItemIcon icon={LogOut} size={16} />
            <span
              aria-hidden={isRailCollapsed}
              className={`overflow-hidden whitespace-nowrap transition-[max-width,opacity,transform] duration-[var(--motion-base)] ${textRevealClass}`}
            >
              خروج
            </span>
          </button>,
          'خروج',
        )}
      </div>
      </div>
    </aside>
  )
}
