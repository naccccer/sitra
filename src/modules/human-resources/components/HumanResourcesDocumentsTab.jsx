import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import {
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  EmptyState,
  InlineAlert,
  Input,
} from '@/components/shared/ui'
import { toPN } from '@/utils/helpers'
import { humanResourcesApi } from '../services/humanResourcesApi'

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '-'
  if (bytes < 1024) return `${toPN(bytes)} B`
  if (bytes < 1024 * 1024) return `${toPN((bytes / 1024).toFixed(1))} KB`
  return `${toPN((bytes / (1024 * 1024)).toFixed(1))} MB`
}

export function HumanResourcesDocumentsTab({
  employeeId,
  canWriteEmployees,
  pendingDocuments,
  onPendingChange,
}) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteCandidateId, setDeleteCandidateId] = useState(null)
  const fileInputRef = useRef(null)

  const loadDocuments = useCallback(async () => {
    if (!employeeId) return
    setLoading(true)
    setError('')
    try {
      const response = await humanResourcesApi.fetchDocuments(employeeId)
      setDocuments(Array.isArray(response?.documents) ? response.documents : [])
    } catch (loadError) {
      setError(loadError.message || 'بارگذاری مدارک ناموفق بود.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const resetFileInput = () => {
    setTitle('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAdd = () => {
    if (!file || !title.trim()) return
    if (!employeeId) {
      onPendingChange([...pendingDocuments, { title: title.trim(), file }])
      resetFileInput()
      return
    }
    handleUpload()
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) return
    setUploading(true)
    setError('')
    try {
      await humanResourcesApi.uploadDocument(employeeId, title.trim(), file)
      resetFileInput()
      await loadDocuments()
    } catch (uploadError) {
      setError(uploadError.message || 'آپلود مدرک ناموفق بود.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId) => {
    setDeletingId(documentId)
    setError('')
    try {
      await humanResourcesApi.deleteDocument(documentId)
      setDeleteCandidateId(null)
      await loadDocuments()
    } catch (deleteError) {
      setError(deleteError.message || 'حذف مدرک ناموفق بود.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRemovePending = (index) => {
    onPendingChange(pendingDocuments.filter((_, i) => i !== index))
  }

  const allItems = employeeId ? documents : []
  const hasPending = !employeeId && pendingDocuments.length > 0
  const isEmpty = !loading && allItems.length === 0 && !hasPending

  return (
    <Card padding="md" className="space-y-4">
      {error ? <InlineAlert tone="danger" title="خطا">{error}</InlineAlert> : null}

      {canWriteEmployees ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <div className="text-xs font-black text-slate-900">افزودن مدرک جدید</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="عنوان مدرک (مثلاً کارت ملی)"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 file:me-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1 file:text-xs file:font-black file:text-white"
            />
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleAdd}
            disabled={uploading || !file || !title.trim()}
          >
            <Upload className="h-3.5 w-3.5 me-1.5" />
            {uploading ? 'در حال آپلود...' : !employeeId ? 'افزودن مدرک' : 'آپلود مدرک'}
          </Button>
          {!employeeId && pendingDocuments.length > 0 ? (
            <div className="text-[11px] font-bold text-amber-600">
              مدارک پس از ذخیره پرسنل آپلود خواهند شد.
            </div>
          ) : null}
        </div>
      ) : null}

      {hasPending ? (
        <DataTable minWidthClass="min-w-[620px]" className="border-amber-200">
          <DataTableHead className="bg-amber-50 text-amber-600">
            <tr>
              <DataTableHeaderCell>عنوان</DataTableHeaderCell>
              <DataTableHeaderCell align="center">نام فایل</DataTableHeaderCell>
              <DataTableHeaderCell align="center">حجم</DataTableHeaderCell>
              <DataTableHeaderCell align="center">عملیات</DataTableHeaderCell>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {pendingDocuments.map((doc, index) => (
              <DataTableRow key={`pending-${index}`}>
                <DataTableCell tone="emphasis">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 shrink-0 text-amber-400" />
                    {doc.title}
                  </div>
                </DataTableCell>
                <DataTableCell align="center">{doc.file.name}</DataTableCell>
                <DataTableCell align="center" className="tabular-nums" dir="ltr">{formatFileSize(doc.file.size)}</DataTableCell>
                <DataTableCell align="center">
                  <DataTableActions>
                    <Button size="icon" variant="danger" surface="table" onClick={() => handleRemovePending(index)} title="حذف">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DataTableActions>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      ) : null}

      {loading ? (
        <EmptyState
          title="در حال بارگذاری مدارک"
          description="لطفاً صبر کنید."
          className="border border-dashed border-slate-200"
        />
      ) : allItems.length > 0 ? (
        <DataTable minWidthClass="min-w-[620px]">
          <DataTableHead>
            <tr>
              <DataTableHeaderCell>عنوان</DataTableHeaderCell>
              <DataTableHeaderCell align="center">نام فایل</DataTableHeaderCell>
              <DataTableHeaderCell align="center">حجم</DataTableHeaderCell>
              {canWriteEmployees ? <DataTableHeaderCell align="center">عملیات</DataTableHeaderCell> : null}
            </tr>
          </DataTableHead>
          <DataTableBody>
            {allItems.map((doc) => (
              <DataTableRow key={doc.id}>
                <DataTableCell tone="emphasis">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    {doc.title}
                  </div>
                </DataTableCell>
                <DataTableCell align="center">
                  <a href={doc.filePath} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {doc.originalName}
                  </a>
                </DataTableCell>
                <DataTableCell align="center" className="tabular-nums" dir="ltr">{formatFileSize(doc.fileSize)}</DataTableCell>
                {canWriteEmployees ? (
                  <DataTableCell align="center">
                    <DataTableActions>
                      <Button
                        size="icon"
                        variant="danger"
                        surface="table"
                        onClick={() => setDeleteCandidateId(doc.id)}
                        disabled={deletingId === doc.id}
                        title="حذف مدرک"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </DataTableActions>
                  </DataTableCell>
                ) : null}
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      ) : isEmpty ? (
        <EmptyState
          title="مدرکی ثبت نشده است"
          description="برای این پرسنل هنوز مدرکی آپلود نشده است."
          className="border border-dashed border-slate-200"
        />
      ) : null}
      <ConfirmDialog
        isOpen={Boolean(deleteCandidateId)}
        title="حذف مدرک"
        description="این مدرک حذف شود؟"
        confirmLabel="حذف مدرک"
        loading={deletingId === deleteCandidateId}
        onCancel={() => setDeleteCandidateId(null)}
        onConfirm={() => (deleteCandidateId ? handleDelete(deleteCandidateId) : undefined)}
      />
    </Card>
  )
}
