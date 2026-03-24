import { ModalShell } from '@/components/shared/ui'
import { HumanResourcesDirectoryPanel } from './HumanResourcesDirectoryPanel'
import { HumanResourcesEmployeeForm } from './HumanResourcesEmployeeForm'
import { HumanResourcesImportModal } from './HumanResourcesImportModal'

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
  onQueryChange,
  onReload,
  onRestoreEmployee,
  onSubmitForm,
  query,
  selectedEmployee,
}) {
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
        onOpenImport={onOpenImportModal}
        onQueryChange={onQueryChange}
        onReload={onReload}
        onRestoreEmployee={onRestoreEmployee}
        query={query}
      />

      <ModalShell
        isOpen={modalOpen}
        title={form.id ? 'ویرایش پرسنل' : 'ثبت پرسنل جدید'}
        description="اطلاعات پرسنل را ثبت یا به‌روزرسانی کنید."
        onClose={onCloseModal}
        maxWidthClass="max-w-4xl"
      >
        <HumanResourcesEmployeeForm
          busyKey={busyKey}
          canWriteEmployees={canWriteEmployees}
          form={form}
          formError={formError}
          onFormChange={onFormChange}
          onSubmitForm={onSubmitForm}
          selectedEmployee={selectedEmployee}
        />
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
