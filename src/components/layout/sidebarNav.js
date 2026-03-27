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

export const navLinkClass = (isActive, isCollapsed) => (
  `focus-ring flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-[13px] font-black transition-colors ${
    isCollapsed ? 'lg:justify-center lg:px-2' : ''
  } ${
    isActive
      ? 'bg-slate-900 text-white shadow-[0_6px_14px_rgba(15,23,42,0.24)]'
      : 'bg-slate-50/60 text-slate-700 hover:bg-slate-100/70'
  }`
)

export const navChildLinkClass = (isActive) => (
  `focus-ring flex items-center rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
    isActive
      ? 'bg-white text-slate-900 ring-1 ring-slate-200 shadow-[0_2px_8px_rgba(15,23,42,0.08)]'
      : 'text-slate-700 hover:bg-white/80'
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
        id: 'owner',
        to: '/owner',
        label: 'اتاق فرمان',
        icon: ShieldCheck,
        capability: 'canManageSystemSettings',
        children: [
          { to: '/owner/modules', label: 'کنترل ماژول‌ها', capability: 'canManageSystemSettings' },
        ],
      },
      {
        id: 'master-data',
        to: '/master-data',
        label: 'اطلاعات پایه',
        icon: Database,
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
        id: 'management',
        to: '/management',
        label: 'ممیزی فعالیت‌ها',
        icon: SlidersHorizontal,
        when: (capabilities) => Boolean(capabilities.canViewAuditLogs),
        children: [
          { to: '/management/audit', label: 'ممیزی فعالیت‌ها', capability: 'canViewAuditLogs' },
        ],
      },
      {
        to: '/users-access',
        label: 'کاربران و دسترسی',
        icon: Users,
        capability: 'canManageUsers',
        moduleId: 'users-access',
      },
    ],
  },
]

export const getQueryTab = (search) => String(new URLSearchParams(search).get('tab') || '').trim()

export const toNavTarget = (item) => (
  item.tab ? { pathname: item.to, search: `?tab=${encodeURIComponent(item.tab)}` } : item.to
)
