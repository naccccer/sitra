import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Button, Card } from '@/components/shared/ui'
import { AccountsPanel } from '../components/accounts/AccountsPanel'
import { PayrollPanel } from '../components/payroll/PayrollPanel'
import { VouchersPanel } from '../components/vouchers/VouchersPanel'
import { TrialBalanceReport } from '../components/reports/TrialBalanceReport'
import { GeneralLedgerReport } from '../components/reports/GeneralLedgerReport'
import { ArSummaryReport } from '../components/reports/ArSummaryReport'
import { PnlSummaryReport } from '../components/reports/PnlSummaryReport'
import { FiscalYearPanel } from '../components/settings/FiscalYearPanel'
import { SalesBridgePanel } from '../components/bridge/SalesBridgePanel'
import { HelpPanel } from '../components/help/HelpPanel'
import { useTabSettings } from '../hooks/useTabSettings'
import { getVisibleAccountingTabs } from '../navigation'

export const AccountingPage = ({ session }) => {
  const permissions = useMemo(() => (Array.isArray(session?.permissions) ? session.permissions : []), [session])
  const capabilities = session?.capabilities ?? {}
  const canAccessAccounting = Boolean(capabilities.canAccessAccounting)
  const [searchParams, setSearchParams] = useSearchParams()
  const { isVisible } = useTabSettings()
  const visibleTabs = useMemo(() => getVisibleAccountingTabs(permissions, isVisible), [permissions, isVisible])
  const currentTab = String(searchParams.get('tab') || '').trim()
  const resolvedTab = visibleTabs.find((tab) => tab.id === currentTab)?.id ?? visibleTabs[0]?.id

  if (!canAccessAccounting) {
    return <AccessDenied message="دسترسی کافی برای ماژول حسابداری وجود ندارد." />
  }

  const renderContent = () => {
    switch (resolvedTab) {
      case 'vouchers': return <VouchersPanel session={session} />
      case 'accounts': return <AccountsPanel session={session} />
      case 'trial_balance': return <TrialBalanceReport />
      case 'general_ledger': return <GeneralLedgerReport />
      case 'ar_summary': return <ArSummaryReport />
      case 'pnl': return <PnlSummaryReport />
      case 'bridge': return <SalesBridgePanel session={session} />
      case 'payroll': return <PayrollPanel session={session} />
      case 'settings': return <FiscalYearPanel session={session} />
      case 'help': return <HelpPanel />
      default: return null
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4" dir="rtl">
      <Card padding="md" className="space-y-3">
        <div>
          <div className="text-base font-black text-slate-900">حسابداری</div>
          <div className="text-xs font-bold text-slate-500">ثبت دوطرفه، سرفصل های استاندارد ایران، گزارشات مالی و حقوق و دستمزد متصل به منابع انسانی</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <Button key={tab.id} size="sm" variant={resolvedTab === tab.id ? 'primary' : 'secondary'} onClick={() => setSearchParams({ tab: tab.id })}>
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>
      {renderContent()}
    </div>
  )
}
