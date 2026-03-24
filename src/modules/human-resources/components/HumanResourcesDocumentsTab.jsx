import { useCallback, useEffect, useRef, useState } from 'react'
import { FileText, Trash2, Upload } from 'lucide-react'
import { Button, Card, EmptyState, Input } from '@/components/shared/ui'
import { humanResourcesApi } from '../services/humanResourcesApi'

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function HumanResourcesDocumentsTab({ employeeId, canWriteEmployees }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const fileInputRef = useRef(null)

  const loadDocuments = useCallback(async () => {
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

  const handleUpload = async () => {
    if (!file || !title.trim()) return
    setUploading(true)
    setError('')
    try {
      await humanResourcesApi.uploadDocument(employeeId, title.trim(), file)
      setTitle('')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadDocuments()
    } catch (uploadError) {
      setError(uploadError.message || 'آپلود مدرک ناموفق بود.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (documentId) => {
    const confirmed = window.confirm('این مدرک حذف شود؟')
    if (!confirmed) return
    setDeletingId(documentId)
    setError('')
    try {
      await humanResourcesApi.deleteDocument(documentId)
      await loadDocuments()
    } catch (deleteError) {
      setError(deleteError.message || 'حذف مدرک ناموفق بود.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card padding="md" className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
          {error}
        </div>
      ) : null}

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
            onClick={handleUpload}
            disabled={uploading || !file || !title.trim()}
          >
            <Upload className="h-3.5 w-3.5 me-1.5" />
            {uploading ? 'در حال آپلود...' : 'آپلود مدرک'}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <EmptyState
          title="در حال بارگذاری مدارک"
          description="لطفاً صبر کنید."
          className="border border-dashed border-slate-200"
        />
      ) : documents.length === 0 ? (
        <EmptyState
          title="مدرکی ثبت نشده است"
          description="برای این پرسنل هنوز مدرکی آپلود نشده است."
          className="border border-dashed border-slate-200"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500">
              <tr>
                <th className="px-3 py-2.5 text-right">عنوان</th>
                <th className="px-3 py-2.5">نام فایل</th>
                <th className="px-3 py-2.5">حجم</th>
                {canWriteEmployees ? <th className="px-3 py-2.5">عملیات</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-3 py-2.5 text-right font-black text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                      {doc.title}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-slate-600">
                    <a
                      href={doc.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {doc.originalName}
                    </a>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-slate-500">{formatFileSize(doc.fileSize)}</td>
                  {canWriteEmployees ? (
                    <td className="px-3 py-2.5">
                      <Button
                        size="icon"
                        variant="danger"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        title="حذف مدرک"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
