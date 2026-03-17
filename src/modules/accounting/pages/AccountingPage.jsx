import { useMemo, useState } from 'react'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Button, Card } from '@/components/shared/ui'
import { AccountsPanel } from '../components/accounts/AccountsPanel'
import { VouchersPanel } from '../components/vouchers/VouchersPanel'
import { TrialBalanceReport } from '../components/reports/TrialBalanceReport'
import { GeneralLedgerReport } from '../components/reports/GeneralLedgerReport'
import { ArSummaryReport } from '../components/reports/ArSummaryReport'
import { PnlSummaryReport } from '../components/reports/PnlSummaryReport'
import { FiscalYearPanel } from '../components/settings/FiscalYearPanel'
import { SalesBridgePanel } from '../components/bridge/SalesBridgePanel'

const TAB_DEFINITIONS = [
  { id: 'vouchers',       label: 'اسناد',            permission: 'accounting.vouchers.read' },
  { id: 'accounts',      label: 'سرفصل حساب‌ها',    permission: 'accounting.accounts.read' },
  { id: 'trial_balance', label: 'تراز آزمایشی',     permission: 'accounting.reports.read' },
  { id: 'general_ledger',label: 'دفتر کل',           permission: 'accounting.reports.read' },
  { id: 'ar_summary',    label: 'مانده مشتریان',     permission: 'accounting.reports.read' },
  { id: 'pnl',           label: 'درآمد/هزینه',       permission: 'accounting.reports.read' },
  { id: 'bridge',        label: 'پل فروش',           permission: 'accounting.sales_bridge.read' },
  { id: 'settings',      label: 'تنظیمات',           permission: 'accounting.fiscal_years.read' },
]

export const AccountingPage = ({ session }) => {
  const permissions = useMemo(
    () => (Array.isArray(session?.permissions) ? session.permissions : []),
    [session]
  )
  const capabilities = session?.capabilities ?? {}
  const canAccessAccounting = Boolean(capabilities.canAccessAccounting)

  const visibleTabs = useMemo(
    () => TAB_DEFINITIONS.filter((t) => !t.permission || permissions.includes(t.permission)),
    [permissions]
  )

  const [activeTab, setActiveTab] = useState('vouchers')
  const resolvedTab = visibleTabs.find((t) => t.id === activeTab)?.id ?? visibleTabs[0]?.id

  if (!canAccessAccounting) {
    return <AccessDenied message="دسترسی کافی برای ماژول حسابداری وجود ندارد." />
  }

  const renderContent = () => {
    switch (resolvedTab) {
      case 'vouchers':        return <VouchersPanel session={session} />
      case 'accounts':        return <AccountsPanel session={session} />
      case 'trial_balance':   return <TrialBalanceReport />
      case 'general_ledger':  return <GeneralLedgerReport />
      case 'ar_summary':      return <ArSummaryReport />
      case 'pnl':             return <PnlSummaryReport />
      case 'bridge':          return <SalesBridgePanel session={session} />
      case 'settings':        return <FiscalYearPanel session={session} />
      default:                return null
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4" dir="rtl">
      <Card padding="md" className="space-y-3">
        <div>
          <div className="text-base font-black text-slate-900">حسابداری</div>
          <div className="text-xs font-bold text-slate-500">
            ثبت دوطرفه — سرفصل‌های استاندارد ایران — گزارشات مالی
          </div>
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
