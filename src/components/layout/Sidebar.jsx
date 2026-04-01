import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronDown, ChevronLeft, LogOut, X } from 'lucide-react'
import { Tooltip } from '@/components/shared/ui'
import { isModuleEnabled } from '@/kernel/moduleRegistry'
import { getVisibleAccountingTabs } from '@/modules/accounting/navigation'
import { useTabSettings } from '@/modules/accounting/hooks/useTabSettings'
import { getVisibleInventoryTabs } from '@/modules/inventory/navigation'
import { normalizeProfile, profileBrandInitial, profileLogoSrc } from '@/utils/profile'
import { getNavSections, getQueryTab, navChildLinkClass, navLinkClass, pathMatches, toNavTarget } from '@/components/layout/sidebarNav'

// UI copy anchors: عملیات روزانه | پیکربندی | اطلاعات پایه | ممیزی فعالیت‌ها
const EMPTY_PERMISSIONS = Object.freeze([])

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
  const desktopSidebarWidth = isRailCollapsed ? '5.75rem' : '14rem'
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
      if (grouped.length > 0) grouped[0] = { ...grouped[0], items: [...grouped[0].items, ...ungrouped] }
      else grouped.push({ id: 'fallback', label: '', items: ungrouped })
    }
    return grouped.length > 0 ? grouped : [{ id: 'system-fallback', label: '', items: section.items }]
  }

  const accordionItems = visibleSections.flatMap((section) => section.items).filter((item) => Array.isArray(item.children) && item.children.length > 0)
  const matchedGroup = accordionItems.find((item) => isTargetActive(item) || item.children.some((child) => isTargetActive(child)))
  const activeGroupId = matchedGroup?.id || null
  const openGroupId = isRailCollapsed ? null : manualGroupState.id ? (manualGroupState.collapsed ? null : manualGroupState.id) : activeGroupId
  const visualActiveGroupId = openGroupId || activeGroupId

  const wrapWithTooltip = (node, content) => (
    isRailCollapsed
      ? <Tooltip content={content} side="left" wrapperClassName="flex w-full">{node}</Tooltip>
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
      <item.icon size={17} />
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
          <item.icon size={17} />
          <span aria-hidden="true" className="max-w-0 overflow-hidden whitespace-nowrap opacity-0">
            {item.label}
          </span>
        </NavLink>,
        item.label,
      )
    }

    const isGroupOpen = openGroupId === item.id
    return (
      <div key={item.id || item.to} className="space-y-1.5">
        <button
          type="button"
          onClick={() => setManualGroupState((prev) => (prev.id === item.id ? { id: item.id, collapsed: !prev.collapsed } : { id: item.id, collapsed: false }))}
          className={`${navLinkClass(isActive, false, tone)} w-full`}
          aria-expanded={isGroupOpen}
          aria-controls={`${item.id}-submenu`}
          aria-label={item.label}
        >
          <item.icon size={17} />
          <span className={`flex-1 overflow-hidden whitespace-nowrap text-start transition-[max-width,opacity,transform] duration-[var(--motion-base)] ${textRevealClass}`}>
            {item.label}
          </span>
          <span className="transition-transform duration-[var(--motion-base)]">
            {isGroupOpen ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
          </span>
        </button>
        {isGroupOpen && (
          <div id={`${item.id}-submenu`} className={`space-y-1 rounded-[var(--radius-lg)] border p-1.5 ${tone === 'owner' ? 'border-[rgb(var(--ui-accent-border))]/80 bg-[rgb(var(--ui-accent-muted))]/90' : 'border-[rgb(var(--ui-border-soft))] bg-white/80'}`}>
            {item.children.map((child) => (
              <NavLink key={`${child.to}:${child.tab || ''}`} to={toNavTarget(child)} onClick={onNavigate} className={() => navChildLinkClass(isTargetActive(child), tone)}>
                <span className="truncate">{child.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside
      style={{ '--sidebar-shell-width': desktopSidebarWidth }}
      className={`print-hide fixed inset-y-0 right-0 z-40 flex w-[14rem] shrink-0 flex-col overflow-hidden border-l border-white/70 bg-white/92 px-3 py-3 shadow-[var(--shadow-overlay)] backdrop-blur-xl transition-[width,min-width,flex-basis,padding,transform,border-radius,box-shadow] duration-300 ease-out lg:static lg:z-auto lg:h-full lg:w-[var(--sidebar-shell-width)] lg:min-w-[var(--sidebar-shell-width)] lg:basis-[var(--sidebar-shell-width)] lg:translate-x-0 lg:rounded-[28px] lg:border lg:border-white/80 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      dir="rtl"
    >
      <button type="button" onClick={onCloseMobile} title="بستن منو" className="shell-mobile-dismiss focus-ring mb-2 inline-flex h-10 w-10 items-center justify-center self-end rounded-[var(--radius-lg)] text-slate-700 lg:hidden">
        <X size={16} />
      </button>

      {wrapWithTooltip(
        <div className={`shell-brand-surface mb-3 rounded-[24px] transition-[padding,border-radius] duration-[var(--motion-base)] ${isRailCollapsed ? 'p-2' : 'px-3 py-3'}`}>
          <div className={`flex items-center transition-[gap] duration-[var(--motion-base)] ${isRailCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="shell-brand-mark flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[18px] text-base font-black text-white transition-transform duration-[var(--motion-base)]">
              {showLogo ? <img src={logoSrc} alt={normalizedProfile.brandName} onError={() => setFailedLogoSrc(logoSrc)} className="h-full w-full object-cover" /> : fallbackLetter}
            </div>
            <div className={`overflow-hidden transition-[max-width,opacity,transform] duration-[var(--motion-base)] ${textRevealClass}`}>
              <div className="text-sm font-black text-[rgb(var(--ui-text))]">{normalizedProfile.brandName}</div>
              <div className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">{normalizedProfile.panelSubtitle}</div>
            </div>
          </div>
        </div>,
        normalizedProfile.brandName,
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto ${isRailCollapsed ? 'px-0' : 'pe-1'}`}>
        <nav className="space-y-4">
          {visibleSections.map((section) => (
            <div key={section.id} className="space-y-2">
              {!isRailCollapsed && (
                <div className="px-1 text-[10px] font-black text-[rgb(var(--ui-text-muted))] transition-opacity duration-[var(--motion-base)]">
                  {section.label}
                </div>
              )}
              {getSectionGroups(section).map((group, groupIndex, allGroups) => (
                <div key={group.id} className="space-y-2">
                  {!isRailCollapsed && section.id === 'system' && group.label && <div className="px-1 text-[10px] font-bold text-slate-500">{group.label}</div>}
                  <div className="space-y-1.5">
                    {group.items.map((item) => {
                      const tone = item.id === 'owner' ? 'owner' : 'default'
                      const isActive = Array.isArray(item.children) && item.children.length > 0
                        ? visualActiveGroupId === item.id
                        : false
                      if (!Array.isArray(item.children) || item.children.length === 0) return <React.Fragment key={item.to}>{renderLeaf(item, tone)}</React.Fragment>
                      return renderGroup(item, tone, isActive)
                    })}
                  </div>
                  {!isRailCollapsed && section.id === 'system' && groupIndex < allGroups.length - 1 && <div className="my-1 h-px bg-[rgb(var(--ui-border-soft))]" />}
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
            className={`focus-ring flex min-h-11 w-full items-center rounded-[var(--radius-lg)] border border-[rgb(var(--ui-danger-border))] bg-[rgb(var(--ui-danger-bg))] px-3 text-xs font-black text-[rgb(var(--ui-danger-text))] transition duration-[var(--motion-fast)] hover:-translate-y-px hover:bg-[rgb(var(--ui-danger-bg))]/85 ${isRailCollapsed ? 'lg:w-11 lg:justify-center lg:px-0' : 'gap-1.5'}`}
          >
            <LogOut size={15} />
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
    </aside>
  )
}
