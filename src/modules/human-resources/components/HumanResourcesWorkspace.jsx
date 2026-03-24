import { useState } from 'react'
import { ModalShell } from '@/components/shared/ui'
import { HumanResourcesDirectoryPanel } from './HumanResourcesDirectoryPanel'
import { HumanResourcesDocumentsTab } from './HumanResourcesDocumentsTab'
import { HumanResourcesEmployeeForm } from './HumanResourcesEmployeeForm'
import { HumanResourcesImportModal } from './HumanResourcesImportModal'

const MODAL_TABS = [
  { id: 'info', label: 'اطلاعات' },
  { id: 'documents', label: 'مدارک' },
]

export function HumanResourcesWorkspace({
  archiveMode,
  busyKey,
  canWriteEmployees,
  employees,
  error,
  form,
  formError,
  loading,
  modalOpen,
  importModalOpen,
  onArchiveEmployee,
  onArchiveModeToggle,
  onApplyImport,
  onCloseModal,
  onCloseImportModal,
  onEditEmployee,
  onFormChange,
  onNewEmployee,
  onOpenImportModal,
  onPageChange,
  onPageSizeChange,
  onQueryChange,
  onReload,
  onRestoreEmployee,
  onSubmitForm,
  page,
  pageSize,
  query,
  selectedEmployee,
  totalCount,
  totalPages,
}) {
  const [modalTab, setModalTab] = useState('info')
  const isEditing = Boolean(form.id)

  const handleCloseModal = () => {
    onCloseModal()
    setModalTab('info')
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700">
          {error}
        </div>
      ) : null}

      <HumanResourcesDirectoryPanel
        archiveMode={archiveMode}
        busyKey={busyKey}
        canWriteEmployees={canWriteEmployees}
        employees={employees}
        loading={loading}
        onArchiveEmployee={onArchiveEmployee}
        onArchiveModeToggle={onArchiveModeToggle}
        onEditEmployee={onEditEmployee}
        onNewEmployee={onNewEmployee}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onQueryChange={onQueryChange}
        onReload={onReload}
        onRestoreEmployee={onRestoreEmployee}
        page={page}
        pageSize={pageSize}
        query={query}
        totalCount={totalCount}
        totalPages={totalPages}
      />

      <ModalShell
        isOpen={modalOpen}
        title={isEditing ? 'ویرایش پرسنل' : 'ثبت پرسنل جدید'}
        description="اطلاعات پرسنل را ثبت یا به‌روزرسانی کنید."
        onClose={handleCloseModal}
        maxWidthClass="max-w-4xl"
      >
        {isEditing ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              {MODAL_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setModalTab(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition-colors ${modalTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {modalTab === 'info' ? (
              <HumanResourcesEmployeeForm
                busyKey={busyKey}
                canWriteEmployees={canWriteEmployees}
                form={form}
                formError={formError}
                onFormChange={onFormChange}
                onSubmitForm={onSubmitForm}
                selectedEmployee={selectedEmployee}
              />
            ) : (
              <HumanResourcesDocumentsTab
                employeeId={form.id}
                canWriteEmployees={canWriteEmployees}
              />
            )}
          </div>
        ) : (
          <HumanResourcesEmployeeForm
            busyKey={busyKey}
            canWriteEmployees={canWriteEmployees}
            form={form}
            formError={formError}
            onFormChange={onFormChange}
            onOpenImport={onOpenImportModal}
            onSubmitForm={onSubmitForm}
            selectedEmployee={selectedEmployee}
          />
        )}
      </ModalShell>

      <HumanResourcesImportModal
        employees={employees}
        isOpen={importModalOpen}
        onApplyImport={onApplyImport}
        onClose={onCloseImportModal}
      />
    </div>
  )
}
