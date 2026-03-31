import React, { useRef, useState } from 'react'
import { Download, Plus, Trash2, Upload, X } from 'lucide-react'
import {
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
  FilterRow,
  IconButton,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import { PriceInput } from '@/components/shared/PriceInput'
import { toPN } from '@/utils/helpers'
import {
  buildMatrixExportFileName,
  parseMatrixImportText,
  serializeMatrixExcelXml,
} from '@/modules/master-data/services/matrixImportExport'

export const MatrixSettingsSection = ({
  draft,
  setDraft,
  newThickness,
  setNewThickness,
  isAddingCol,
  setIsAddingCol,
}) => {
  const fileInputRef = useRef(null)
  const [isImporting, setIsImporting] = useState(false)

  const downloadTextFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleMatrixUpdate = (id, field, value) => {
    setDraft((previous) => ({
      ...previous,
      glasses: previous.glasses.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    }))
  }

  const handleMatrixPriceUpdate = (id, thickness, value) => {
    setDraft((previous) => ({
      ...previous,
      glasses: previous.glasses.map((row) => {
        if (row.id !== id) return row
        const nextPrices = { ...row.prices }
        if (value === '') delete nextPrices[thickness]
        else nextPrices[thickness] = value
        return { ...row, prices: nextPrices }
      }),
    }))
  }

  const handleExportExcel = () => {
    try {
      const content = serializeMatrixExcelXml(draft)
      downloadTextFile(content, buildMatrixExportFileName('xls'), 'application/vnd.ms-excel;charset=utf-8')
    } catch (error) {
      alert(error?.message || 'خروجی Excel انجام نشد.')
    }
  }

  const handleImportTrigger = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)

    try {
      const text = await file.text()
      const extension = file.name.split('.').pop()
      const parsed = parseMatrixImportText(text, extension)
      const confirmed = window.confirm('با ایمپورت فایل، ماتریس فعلی جایگزین می‌شود. ادامه می‌دهید؟')
      if (!confirmed) return

      setDraft((previous) => ({
        ...previous,
        thicknesses: parsed.thicknesses,
        glasses: parsed.glasses,
      }))
      setIsAddingCol(false)
      setNewThickness('')
      alert('ایمپورت ماتریس با موفقیت انجام شد.')
    } catch (error) {
      alert(error?.message || 'ایمپورت فایل ناموفق بود.')
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <WorkspaceToolbar
        summary={<span className="text-[11px] font-bold text-[rgb(var(--ui-text-muted))]">ورودی: CSV / Excel | خروجی: Excel</span>}
        actions={(
          <>
            <Button size="sm" variant="success" onClick={handleExportExcel} leadingIcon={Download}>خروجی Excel</Button>
            <Button size="sm" variant="secondary" onClick={handleImportTrigger} disabled={isImporting} leadingIcon={Upload}>
              {isImporting ? 'در حال پردازش...' : 'ایمپورت فایل'}
            </Button>
          </>
        )}
      >
        <FilterRow>
          <div className="text-sm font-black text-[rgb(var(--ui-text))]">ماتریس قیمت شیشه</div>
        </FilterRow>
      </WorkspaceToolbar>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.tsv,.xml,.xls"
        onChange={handleImportFile}
        className="hidden"
      />

      <DataTable minWidthClass="min-w-max whitespace-nowrap">
        <DataTableHead>
          <tr>
            <DataTableHeaderCell align="center" className="w-12">ردیف</DataTableHeaderCell>
            <DataTableHeaderCell align="center" className="w-40">نوع شیشه</DataTableHeaderCell>
            <DataTableHeaderCell align="center" className="w-32">فرآیند</DataTableHeaderCell>
            {draft.thicknesses.map((thickness) => (
              <DataTableHeaderCell key={thickness} align="center" className="w-28">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
                  <span className="font-black text-slate-700">{toPN(thickness)} میل</span>
                  <IconButton
                    variant="ghost"
                    label={`حذف ضخامت ${toPN(thickness)}`}
                    tooltip={`حذف ضخامت ${toPN(thickness)}`}
                    onClick={() => setDraft((previous) => ({ ...previous, thicknesses: previous.thicknesses.filter((item) => item !== thickness) }))}
                  >
                    <X size={14} />
                  </IconButton>
                </div>
              </DataTableHeaderCell>
            ))}
            <DataTableHeaderCell align="center" className="w-28">
              {isAddingCol ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    const thickness = parseInt(newThickness, 10)
                    if (thickness && !draft.thicknesses.includes(thickness)) {
                      setDraft((previous) => ({ ...previous, thicknesses: [...previous.thicknesses, thickness].sort((a, b) => a - b) }))
                    }
                    setIsAddingCol(false)
                    setNewThickness('')
                  }}
                >
                  <input
                    type="number"
                    autoFocus
                    value={newThickness}
                    onChange={(event) => setNewThickness(event.target.value)}
                    placeholder="ضخامت"
                    className="w-full rounded-lg border border-blue-300 bg-white px-2 py-1 text-center text-xs outline-none"
                  />
                </form>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setIsAddingCol(true)} leadingIcon={Plus}>ستون</Button>
              )}
            </DataTableHeaderCell>
            <DataTableHeaderCell align="center" className="w-12">حذف</DataTableHeaderCell>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {draft.glasses.length === 0 ? (
            <DataTableState colSpan={draft.thicknesses.length + 5} title="ردیفی برای ماتریس ثبت نشده است." />
          ) : draft.glasses.map((row, index) => (
            <DataTableRow key={row.id}>
              <DataTableCell align="center" tone="emphasis">{toPN(index + 1)}</DataTableCell>
              <DataTableCell align="center">
                <input
                  type="text"
                  value={row.title}
                  onChange={(event) => handleMatrixUpdate(row.id, 'title', event.target.value)}
                  className="w-full rounded-lg bg-transparent py-1.5 text-center font-black outline-none focus:bg-slate-100"
                />
              </DataTableCell>
              <DataTableCell align="center">
                <select
                  value={row.process || 'raw'}
                  onChange={(event) => handleMatrixUpdate(row.id, 'process', event.target.value)}
                  className={`w-full rounded-lg border py-1.5 text-center font-black outline-none ${(row.process || 'raw') === 'raw' ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
                >
                  <option value="raw">خام</option>
                  <option value="sekurit">سکوریت</option>
                </select>
              </DataTableCell>
              {draft.thicknesses.map((thickness) => (
                <DataTableCell key={`${row.id}-${thickness}`} align="center" className="focus-within:bg-blue-50/30">
                  <PriceInput value={row.prices[thickness] || ''} onChange={(value) => handleMatrixPriceUpdate(row.id, thickness, value)} />
                </DataTableCell>
              ))}
              <DataTableCell />
              <DataTableCell align="center">
                <IconButton
                  variant="ghost"
                  label="حذف ردیف"
                  tooltip="حذف ردیف"
                  onClick={() => setDraft((previous) => ({ ...previous, glasses: previous.glasses.filter((item) => item.id !== row.id) }))}
                >
                  <Trash2 size={14} />
                </IconButton>
              </DataTableCell>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>

      <Button
        action="create"
        showActionIcon
        variant="secondary"
        size="sm"
        onClick={() => setDraft((previous) => ({ ...previous, glasses: [...previous.glasses, { id: Date.now().toString(), title: '', process: 'raw', prices: {} }] }))}
      >
        افزودن ردیف شیشه
      </Button>
    </div>
  )
}
