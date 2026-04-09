import React, { useRef, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  FilterRow,
  WorkspaceToolbar,
} from '@/components/shared/ui'
import {
  buildMatrixExportFileName,
  parseMatrixImportText,
  serializeMatrixExcelXml,
} from '@/modules/master-data/services/matrixImportExport'
import { MatrixSettingsTable } from './MatrixSettingsTable'

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
  const [pendingImport, setPendingImport] = useState(null)

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

  const handleThicknessMove = (activeThickness, overThickness) => {
    setDraft((previous) => {
      const nextThicknesses = [...previous.thicknesses]
      const activeIndex = nextThicknesses.indexOf(activeThickness)
      const overIndex = nextThicknesses.indexOf(overThickness)
      if (activeIndex === -1 || overIndex === -1) return previous
      const [movedThickness] = nextThicknesses.splice(activeIndex, 1)
      nextThicknesses.splice(overIndex, 0, movedThickness)
      return { ...previous, thicknesses: nextThicknesses }
    })
  }

  const handleRowMove = (activeRowId, overRowId) => {
    setDraft((previous) => {
      const nextGlasses = [...previous.glasses]
      const activeIndex = nextGlasses.findIndex((row) => row.id === activeRowId)
      const overIndex = nextGlasses.findIndex((row) => row.id === overRowId)
      if (activeIndex === -1 || overIndex === -1) return previous
      const [movedRow] = nextGlasses.splice(activeIndex, 1)
      nextGlasses.splice(overIndex, 0, movedRow)
      return { ...previous, glasses: nextGlasses }
    })
  }

  const handleAddThickness = (thickness) => {
    setDraft((previous) => (
      previous.thicknesses.includes(thickness)
        ? previous
        : { ...previous, thicknesses: [...previous.thicknesses, thickness] }
    ))
  }

  const handleRemoveThickness = (thickness) => {
    setDraft((previous) => ({
      ...previous,
      thicknesses: previous.thicknesses.filter((item) => item !== thickness),
    }))
  }

  const handleRemoveRow = (rowId) => {
    setDraft((previous) => ({
      ...previous,
      glasses: previous.glasses.filter((item) => item.id !== rowId),
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
      setPendingImport(parsed)
    } catch (error) {
      alert(error?.message || 'ایمپورت فایل ناموفق بود.')
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  const applyImport = () => {
    if (!pendingImport) return
    setDraft((previous) => ({
      ...previous,
      thicknesses: pendingImport.thicknesses,
      glasses: pendingImport.glasses,
    }))
    setIsAddingCol(false)
    setNewThickness('')
    setPendingImport(null)
    alert('ایمپورت ماتریس با موفقیت انجام شد.')
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt,.tsv,.xml,.xls"
        onChange={handleImportFile}
        className="hidden"
      />

      <MatrixSettingsTable
        draft={draft}
        newThickness={newThickness}
        setNewThickness={setNewThickness}
        isAddingCol={isAddingCol}
        setIsAddingCol={setIsAddingCol}
        onMatrixUpdate={handleMatrixUpdate}
        onMatrixPriceUpdate={handleMatrixPriceUpdate}
        onMoveThickness={handleThicknessMove}
        onMoveRow={handleRowMove}
        onRemoveThickness={handleRemoveThickness}
        onRemoveRow={handleRemoveRow}
        onAddThickness={handleAddThickness}
        toolbar={(
          <WorkspaceToolbar
            embedded
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
        )}
      />

      <Button
        action="create"
        showActionIcon
        variant="secondary"
        size="sm"
        onClick={() => setDraft((previous) => ({ ...previous, glasses: [...previous.glasses, { id: Date.now().toString(), title: '', process: 'raw', prices: {} }] }))}
      >
        افزودن ردیف شیشه
      </Button>
      <ConfirmDialog
        isOpen={Boolean(pendingImport)}
        title="جایگزینی ماتریس"
        description="با ایمپورت فایل، ماتریس فعلی جایگزین می‌شود. ادامه می‌دهید؟"
        confirmLabel="جایگزینی ماتریس"
        onCancel={() => setPendingImport(null)}
        onConfirm={applyImport}
      />
    </div>
  )
}
