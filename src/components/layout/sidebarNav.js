import {
  BookOpen,
  ClipboardList,
  Database,
  LayoutDashboard,
  Package,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { isModuleEnabled } from '@/kernel/moduleRegistry'

export const pathMatches = (pathname, to) => Boolean(to) && (pathname === to || pathname.startsWith(`${to}/`))

export const navLinkClass = (isActive, isCollapsed, tone = 'default') => (
  `focus-ring flex items-center gap-2 rounded-[var(--radius-lg)] border px-2.5 py-2 text-[13px] font-black transition-[background-color,border-color,color,box-shadow] ${
    isCollapsed ? 'lg:justify-center lg:px-2' : ''
  } ${
    tone === 'owner'
      ? isActive
        ? 'border-[rgba(var(--ui-accent),0.82)] bg-[rgb(var(--ui-accent))] text-[rgb(var(--ui-primary))] shadow-ui-surface'
        : 'border-transparent bg-transparent text-[rgb(var(--ui-text-muted))] hover:border-[rgba(var(--ui-accent),0.22)] hover:bg-[rgba(var(--ui-accent),0.12)] hover:text-[rgb(var(--ui-primary))]'
      : isActive
        ? 'border-[rgba(var(--ui-primary),0.9)] bg-[rgb(var(--ui-primary))] text-[rgb(var(--ui-primary-contrast))] shadow-ui-surface'
        : 'border-transparent bg-transparent text-[rgb(var(--ui-text-muted))] hover:border-[rgba(var(--ui-border),0.75)] hover:bg-[rgba(var(--ui-primary),0.06)] hover:text-[rgb(var(--ui-primary))]'
  }`
)

export const navChildLinkClass = (isActive, tone = 'default') => (
  `focus-ring flex items-center rounded-[var(--radius-md)] border px-2.5 py-2 text-[12px] font-bold transition-[background-color,border-color,color,box-shadow] ${
    tone === 'owner'
      ? isActive
        ? 'border-[rgba(var(--ui-accent),0.82)] bg-[rgb(var(--ui-accent))] text-[rgb(var(--ui-primary))] shadow-ui-soft'
        : 'border-transparent text-[rgb(var(--ui-text-muted))] hover:border-[rgba(var(--ui-accent),0.18)] hover:bg-[rgba(var(--ui-accent),0.1)] hover:text-[rgb(var(--ui-primary))]'
      : isActive
        ? 'border-[rgba(var(--ui-primary),0.9)] bg-[rgb(var(--ui-primary))] text-[rgb(var(--ui-primary-contrast))] shadow-ui-soft'
        : 'border-transparent text-[rgb(var(--ui-text-muted))] hover:border-[rgba(var(--ui-border),0.7)] hover:bg-[rgba(var(--ui-primary),0.06)] hover:text-[rgb(var(--ui-primary))]'
  }`
)

export const getNavSections = ({ inventoryTabs, accountingTabs }) => [
  {
    id: 'daily',
    label: 'عملیات روزانه',
    items: [
      { to: '/', label: 'داشبورد', icon: LayoutDashboard, end: true, capability: 'canAccessDashboard', moduleId: 'sales' },
      { to: '/orders', label: 'سفارشات', icon: ClipboardList, capability: 'canManageOrders', moduleId: 'sales' },
      { to: '/customers', label: 'مشتریان', icon: Users, capability: 'canManageCustomers', moduleId: 'customers' },
      { to: '/human-resources', label: 'منابع انسانی', icon: Users, capability: 'canAccessHumanResources', moduleId: 'human-resources' },
      {
        id: 'inventory',
        to: '/inventory',
        label: 'انبار',
        icon: Package,
        capability: 'canAccessInventory',
        moduleId: 'inventory',
        children: inventoryTabs.map((tab) => ({ to: '/inventory', tab: tab.id, label: tab.label })),
      },
      {
        id: 'accounting',
        to: '/accounting',
        label: 'حسابداری',
        icon: BookOpen,
        capability: 'canAccessAccounting',
        moduleId: 'accounting',
        children: accountingTabs.map((tab) => ({ to: '/accounting', tab: tab.id, label: tab.label })),
      },
    ],
  },
  {
    id: 'system',
    label: 'پیکربندی',
    items: [
      {
        id: 'master-data',
        to: '/master-data',
        label: 'اطلاعات پایه',
        icon: Database,
        group: 'daily-config',
        when: (capabilities, modules) => (
          isModuleEnabled(modules, 'master-data')
          && Boolean(capabilities.canManageCatalog || capabilities.canManageProfile)
        ),
        children: [
          { to: '/master-data/pricing', label: 'قیمت‌گذاری', capability: 'canManageCatalog', moduleId: 'master-data' },
          { to: '/master-data/profile', label: 'پروفایل کسب‌وکار', capability: 'canManageProfile', moduleId: 'master-data' },
        ],
      },
      {
        id: 'security-access',
        to: '/management/audit',
        label: 'امنیت و دسترسی',
        icon: SlidersHorizontal,
        group: 'daily-config',
        dynamicToFirstVisibleChild: true,
        children: [
          { to: '/management/audit', label: 'ممیزی فعالیت‌ها', capability: 'canViewAuditLogs' },
          { to: '/users-access', label: 'کاربران و دسترسی', capability: 'canManageUsers', moduleId: 'users-access' },
        ],
      },
      {
        id: 'owner',
        to: '/owner',
        label: 'اتاق فرمان',
        icon: ShieldCheck,
        group: 'owner-config',
        capability: 'canManageSystemSettings',
        children: [
          { to: '/owner/modules', label: 'کنترل ماژول‌ها', capability: 'canManageSystemSettings' },
        ],
      },
    ],
  },
]

export const getQueryTab = (search) => String(new URLSearchParams(search).get('tab') || '').trim()

export const toNavTarget = (item) => (
  item.tab ? { pathname: item.to, search: `?tab=${encodeURIComponent(item.tab)}` } : item.to
)
