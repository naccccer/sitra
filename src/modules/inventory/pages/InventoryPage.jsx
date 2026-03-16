import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { Button, Card } from '@/components/shared/ui'
import { InventoryDashboardPanel } from '@/modules/inventory/components/InventoryDashboardPanel'
import { InventoryItemsPanel } from '@/modules/inventory/components/InventoryItemsPanel'
import { InventoryDocumentsPanel } from '@/modules/inventory/components/InventoryDocumentsPanel'
import { InventoryRequestsPanel } from '@/modules/inventory/components/InventoryRequestsPanel'
import { InventoryCountsPanel } from '@/modules/inventory/components/InventoryCountsPanel'
import { InventoryReportsPanel } from '@/modules/inventory/components/InventoryReportsPanel'
import { DEFAULT_INVENTORY_ITEMS } from '@/modules/inventory/constants/inventoryDefaults'
import { inventoryApi } from '@/modules/inventory/services/inventoryApi'

const SECTION_OVERVIEW = 'overview'
const normalizeTitle = (value) => String(value || '').trim().toLocaleLowerCase('fa-IR')

export const InventoryPage = ({ session }) => {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : []
  const capabilities = session?.capabilities && typeof session.capabilities === 'object' ? session.capabilities : {}
  const canAccessInventory = Boolean(capabilities.canAccessInventory)
  const canWriteItems = permissions.includes('inventory.items.write')
  const canReadItems = permissions.includes('inventory.items.read')
  const canWriteDocuments = permissions.includes('inventory.documents.write')
  const canReadDocuments = permissions.includes('inventory.documents.read')
  const canCreateRequests = permissions.includes('inventory.requests.create')
  const canReadRequests = permissions.includes('inventory.requests.read')
  const canApproveRequests = permissions.includes('inventory.requests.approve')
  const canWriteCounts = permissions.includes('inventory.counts.write')
  const canReadCounts = permissions.includes('inventory.counts.read')
  const canReadReports = permissions.includes('inventory.reports.read')

  const [warehouses, setWarehouses] = useState([])
  const [items, setItems] = useState([])
  const [documents, setDocuments] = useState([])
  const [requests, setRequests] = useState([])
  const [sessions, setSessions] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [sessionLines, setSessionLines] = useState([])
  const [reportType, setReportType] = useState('stock')
  const [reportRows, setReportRows] = useState([])
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState(SECTION_OVERVIEW)
  const [baseLoaded, setBaseLoaded] = useState(false)
  const [isSeedingDefaults, setIsSeedingDefaults] = useState(false)
  const [hasAutoSeedAttempted, setHasAutoSeedAttempted] = useState(false)

  const loadBaseData = useCallback(async () => {
    setError('')
    try {
      const tasks = [inventoryApi.fetchWarehouses()]
      if (canReadItems) tasks.push(inventoryApi.fetchItems())
      if (canReadDocuments) tasks.push(inventoryApi.fetchDocuments({ includeLines: true }))
      if (canReadRequests) tasks.push(inventoryApi.fetchRequests({ mine: !canApproveRequests }))
      if (canReadCounts) tasks.push(inventoryApi.fetchCounts())
      const results = await Promise.all(tasks)
      let index = 0
      const warehousesRes = results[index++]
      setWarehouses(Array.isArray(warehousesRes?.warehouses) ? warehousesRes.warehouses : [])
      if (canReadItems) {
        const itemsRes = results[index++]
        setItems(Array.isArray(itemsRes?.items) ? itemsRes.items : [])
      } else {
        setItems([])
      }
      if (canReadDocuments) {
        const docsRes = results[index++]
        setDocuments(Array.isArray(docsRes?.documents) ? docsRes.documents : [])
      } else {
        setDocuments([])
      }
      if (canReadRequests) {
        const requestsRes = results[index++]
        setRequests(Array.isArray(requestsRes?.requests) ? requestsRes.requests : [])
      } else {
        setRequests([])
      }
      if (canReadCounts) {
        const countsRes = results[index++]
        setSessions(Array.isArray(countsRes?.sessions) ? countsRes.sessions : [])
      } else {
        setSessions([])
      }
      setBaseLoaded(true)
    } catch (e) {
      setError(e?.message || 'دریافت اطلاعات انبار ناموفق بود.')
    }
  }, [canApproveRequests, canReadCounts, canReadDocuments, canReadItems, canReadRequests])

  const loadReport = useCallback(async () => {
    if (!canReadReports) return
    try {
      const response = await inventoryApi.fetchReport({ report: reportType })
      setReportRows(Array.isArray(response?.rows) ? response.rows : [])
    } catch (e) {
      setError(e?.message || 'دریافت گزارش ناموفق بود.')
    }
  }, [canReadReports, reportType])

  const loadSelectedSession = useCallback(async (nextSessionId) => {
    const id = String(nextSessionId || '')
    setSelectedSessionId(id)
    if (!id) {
      setSessionLines([])
      return
    }
    try {
      const response = await inventoryApi.fetchCounts({ sessionId: id })
      setSessionLines(Array.isArray(response?.lines) ? response.lines : [])
    } catch (e) {
      setError(e?.message || 'دریافت خطوط انبارگردانی ناموفق بود.')
    }
  }, [])

  const seedDefaultItems = useCallback(async () => {
    if (!canWriteItems) return
    const existingTitles = new Set(items.map((item) => normalizeTitle(item?.title)))
    const missing = DEFAULT_INVENTORY_ITEMS.filter((item) => !existingTitles.has(normalizeTitle(item.title)))
    if (missing.length === 0) return
    setError('')
    setIsSeedingDefaults(true)
    try {
      for (const item of missing) await inventoryApi.createItem(item)
      await loadBaseData()
      setActiveSection('items')
    } catch (e) {
      setError(e?.message || 'ایجاد کالاهای پیش فرض ناموفق بود.')
    } finally {
      setIsSeedingDefaults(false)
    }
  }, [canWriteItems, items, loadBaseData])

  useEffect(() => { void loadBaseData() }, [loadBaseData])
  useEffect(() => { void loadReport() }, [loadReport])
  useEffect(() => {
    if (hasAutoSeedAttempted || !baseLoaded || !canReadItems || !canWriteItems) return
    setHasAutoSeedAttempted(true)
    if (items.length === 0) void seedDefaultItems()
  }, [baseLoaded, canReadItems, canWriteItems, hasAutoSeedAttempted, items.length, seedDefaultItems])

  const workflowSections = useMemo(() => {
    const sections = []
    if (canReadItems || canWriteItems) sections.push({
      id: 'items',
      label: 'کالاها',
      description: 'تعریف آیتم‌ها، واحدها و مشخصات پایه.',
      badge: `${items.length} کالا`,
    })
    if (canReadDocuments || canWriteDocuments) {
      const draftCount = documents.filter((doc) => doc.status === 'draft').length
      sections.push({
        id: 'documents',
        label: 'اسناد',
        description: 'رسید، حواله، انتقال و تعدیل با چرخه پیش نویس تا پست.',
        badge: `${draftCount} پیش نویس`,
      })
    }
    if (canReadRequests) {
      const pendingCount = requests.filter((request) => request.status === 'pending').length
      sections.push({
        id: 'requests',
        label: 'درخواست ها',
        description: 'ثبت و تایید/رد درخواست های خروج انبار.',
        badge: `${pendingCount} در انتظار`,
      })
    }
    if (canReadCounts) {
      const openCount = sessions.filter((sessionItem) => sessionItem.status === 'open').length
      sections.push({
        id: 'counts',
        label: 'انبارگردانی',
        description: 'شروع نشست شمارش، ثبت خطوط و بستن نشست.',
        badge: openCount > 0 ? `${openCount} باز` : 'بدون نشست باز',
      })
    }
    if (canReadReports) sections.push({
      id: 'reports',
      label: 'گزارشات',
      description: 'موجودی، کاردکس، گردش اسناد و وضعیت درخواست ها.',
      badge: `${reportRows.length} ردیف`,
    })
    return sections
  }, [canReadCounts, canReadDocuments, canReadItems, canReadReports, canReadRequests, canWriteDocuments, canWriteItems, documents, items.length, reportRows.length, requests, sessions])

  const allowedSectionIds = useMemo(() => [SECTION_OVERVIEW, ...workflowSections.map((section) => section.id)], [workflowSections])
  useEffect(() => {
    if (allowedSectionIds.includes(activeSection)) return
    setActiveSection(SECTION_OVERVIEW)
  }, [activeSection, allowedSectionIds])

  const summary = useMemo(() => ({
    itemsTotal: items.length,
    activeItems: items.filter((item) => item.isActive).length,
    inactiveItems: items.filter((item) => !item.isActive).length,
    documentsTotal: documents.length,
    draftDocuments: documents.filter((doc) => doc.status === 'draft').length,
    postedDocuments: documents.filter((doc) => doc.status === 'posted').length,
    requestsTotal: requests.length,
    pendingRequests: requests.filter((request) => request.status === 'pending').length,
    sessionsTotal: sessions.length,
    openSessions: sessions.filter((sessionItem) => sessionItem.status === 'open').length,
  }), [documents, items, requests, sessions])

  const actions = useMemo(() => ({
    async createItem(payload) { await inventoryApi.createItem(payload); await loadBaseData() },
    async updateItem(payload) { await inventoryApi.updateItem(payload); await loadBaseData() },
    async toggleItem(id, isActive) { await inventoryApi.setItemActive(id, isActive); await loadBaseData() },
    async createDocument(payload) { await inventoryApi.createDocument(payload); await loadBaseData(); await loadReport() },
    async postDocument(id) { await inventoryApi.patchDocument({ action: 'post', id }); await loadBaseData(); await loadReport() },
    async cancelDocument(id) { await inventoryApi.patchDocument({ action: 'cancel', id }); await loadBaseData() },
    async createRequest(payload) { await inventoryApi.createRequest(payload); await loadBaseData() },
    async patchRequest(payload) { await inventoryApi.patchRequest(payload); await loadBaseData(); await loadReport() },
    async startSession(payload) { await inventoryApi.createCount(payload); await loadBaseData() },
    async upsertLine(payload) { await inventoryApi.createCount(payload); await loadSelectedSession(payload.sessionId); await loadReport() },
    async closeSession(payload) { await inventoryApi.patchCount(payload); await loadBaseData(); await loadSelectedSession(''); await loadReport() },
  }), [loadBaseData, loadReport, loadSelectedSession])

  if (!canAccessInventory) return <AccessDenied message="دسترسی کافی به ماژول انبار وجود ندارد." />
  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <Card padding="md" className="space-y-2">
        <div className="text-base font-black text-slate-900">ماژول انبار کارخانه شیشه</div>
        <div className="text-xs font-bold text-slate-500">صفحه شروع به صورت داشبورد مرحله ای طراحی شده تا جریان کار شفاف و کم خطا باشد.</div>
        <div className="flex flex-wrap items-center gap-2">
          {[{ id: SECTION_OVERVIEW, label: 'داشبورد' }, ...workflowSections.map((section) => ({ id: section.id, label: section.label }))].map((tab) => (
            <Button key={tab.id} size="sm" variant={activeSection === tab.id ? 'primary' : 'secondary'} onClick={() => setActiveSection(tab.id)}>
              {tab.label}
            </Button>
          ))}
        </div>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{error}</div>}
      </Card>

      {activeSection === SECTION_OVERVIEW && (
        <InventoryDashboardPanel
          summary={summary}
          sectionOptions={workflowSections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          canSeedDefaults={canReadItems && canWriteItems}
          isSeedingDefaults={isSeedingDefaults}
          onSeedDefaults={() => void seedDefaultItems()}
        />
      )}

      {activeSection === 'items' && (canReadItems || canWriteItems) && (
        <InventoryItemsPanel items={items} canWrite={canWriteItems} onCreate={actions.createItem} onUpdate={actions.updateItem} onToggleActive={actions.toggleItem} />
      )}
      {activeSection === 'documents' && (canReadDocuments || canWriteDocuments) && (
        <InventoryDocumentsPanel warehouses={warehouses} items={items} documents={documents} canWrite={canWriteDocuments} onCreate={actions.createDocument} onPost={actions.postDocument} onCancel={actions.cancelDocument} />
      )}
      {activeSection === 'requests' && canReadRequests && (
        <InventoryRequestsPanel warehouses={warehouses} items={items} requests={requests} canCreate={canCreateRequests} canApprove={canApproveRequests} onCreate={actions.createRequest} onPatch={actions.patchRequest} />
      )}
      {activeSection === 'counts' && canReadCounts && (
        <InventoryCountsPanel warehouses={warehouses} items={items} sessions={sessions} selectedSessionId={selectedSessionId} lines={sessionLines} canWrite={canWriteCounts} onSelectSession={loadSelectedSession} onStartSession={actions.startSession} onUpsertLine={actions.upsertLine} onCloseSession={actions.closeSession} />
      )}
      {activeSection === 'reports' && canReadReports && (
        <InventoryReportsPanel reportType={reportType} setReportType={setReportType} rows={reportRows} onRun={loadReport} />
      )}
    </div>
  )
}
