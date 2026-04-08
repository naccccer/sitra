import {
  BookOpen,
  ClipboardList,
  ContactRound,
  Database,
  LayoutDashboard,
  Package,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react'
import { isModuleEnabled } from '@/kernel/moduleRegistry'

export const pathMatches = (pathname, to) => Boolean(to) && (pathname === to || pathname.startsWith(`${to}/`))

export const navLinkClass = (isActive, isCollapsed, tone = 'default') => (
  `focus-ring flex items-center gap-2.5 rounded-[var(--radius-xl)] border text-[13px] font-black transition duration-[var(--motion-fast)] ${
    isCollapsed ? 'min-h-11 px-3 py-2 lg:mx-auto lg:h-11 lg:w-11 lg:flex-none lg:justify-center lg:gap-0 lg:p-0' : 'min-h-11 w-full px-3 py-2.5'
  } ${
    tone === 'control'
      ? isActive
        ? 'border-[rgb(var(--ui-accent-border))] bg-[rgb(var(--ui-accent-muted))] text-[rgb(var(--ui-accent-strong))] shadow-[var(--shadow-soft)]'
        : 'border-transparent bg-transparent text-[rgb(var(--ui-text-muted))] hover:border-[rgb(var(--ui-accent-border))] hover:bg-[rgb(var(--ui-accent-muted))]/66 hover:text-[rgb(var(--ui-accent-strong))]'
      : isActive
        ? 'border-[rgb(var(--ui-primary))] bg-[rgb(var(--ui-primary))] text-white shadow-[var(--shadow-soft)]'
        : 'border-transparent bg-transparent text-[rgb(var(--ui-text))] hover:border-[rgb(var(--ui-border-soft))] hover:bg-[rgb(var(--ui-surface-muted))]/76 hover:text-[rgb(var(--ui-primary))]'
  }`
)

export const navChildLinkClass = (isActive, tone = 'default') => (
  `focus-ring flex min-h-9 items-center rounded-full border px-3 py-1.5 text-[12px] font-bold transition duration-[var(--motion-fast)] ${
    tone === 'control'
      ? isActive
        ? 'border-[rgb(var(--ui-accent-border))] bg-white text-[rgb(var(--ui-accent-strong))] shadow-[var(--shadow-soft)]'
        : 'border-transparent bg-transparent text-[rgb(var(--ui-text-muted))] hover:bg-white/58 hover:text-[rgb(var(--ui-accent-strong))]'
      : isActive
        ? 'border-white/82 bg-white/94 text-[rgb(var(--ui-primary))] shadow-[0_10px_24px_rgba(20,20,24,0.08)]'
        : 'border-transparent bg-transparent text-[rgb(var(--ui-text-muted))] hover:bg-white/58 hover:text-[rgb(var(--ui-text))]'
  }`
)

export const getNavSections = ({ inventoryTabs, accountingTabs }) => [
  {
    id: 'workspace',
    label: 'ورود سریع',
    items: [
      { to: '/', label: 'خانه', icon: LayoutDashboard, end: true },
      { to: '/orders', label: 'سفارشات', icon: ClipboardList, capability: 'canManageOrders', moduleId: 'sales' },
      { to: '/customers', label: 'مشتریان', icon: ContactRound, capability: 'canManageCustomers', moduleId: 'customers' },
    ],
  },
  {
    id: 'operations',
    label: 'عملیات',
    items: [
      { to: '/human-resources', label: 'منابع انسانی', icon: UsersRound, capability: 'canAccessHumanResources', moduleId: 'human-resources' },
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
    id: 'control',
    label: 'کنترل و پیکربندی',
    tone: 'control',
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
          { to: '/master-data/pricing', label: 'قیمت گذاری', capability: 'canManageCatalog', moduleId: 'master-data' },
          { to: '/master-data/profile', label: 'پروفایل کسب و کار', capability: 'canManageProfile', moduleId: 'master-data' },
        ],
      },
      {
        id: 'security-access',
        to: '/management/audit',
        label: 'امنیت و دسترسی',
        icon: SlidersHorizontal,
        dynamicToFirstVisibleChild: true,
        children: [
          { to: '/management/audit', label: 'ممیزی فعالیت ها', capability: 'canViewAuditLogs' },
          { to: '/users-access', label: 'کاربران', capability: 'canManageUsers', moduleId: 'users-access' },
        ],
      },
      {
        id: 'owner',
        to: '/owner',
        label: 'اتاق فرمان',
        icon: ShieldCheck,
        capability: 'canManageSystemSettings',
        children: [
          { to: '/owner/modules', label: 'کنترل ماژول ها', capability: 'canManageSystemSettings' },
        ],
      },
    ],
  },
]

export const getQueryTab = (search) => String(new URLSearchParams(search).get('tab') || '').trim()

export const toNavTarget = (item) => (
  item.tab ? { pathname: item.to, search: `?tab=${encodeURIComponent(item.tab)}` } : item.to
)
