import React, { useState } from 'react'
import { GripVertical, Plus, Trash2, X } from 'lucide-react'
import {
  Button,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableState,
} from '@/components/shared/ui'
import { PriceInput } from '@/components/shared/PriceInput'
import { toPN } from '@/utils/helpers'

const DRAG_TYPE_THICKNESS = 'thickness'
const DRAG_TYPE_ROW = 'row'

const MatrixDragHandle = ({
  label,
  onDragStart,
  onDragEnd,
  className = '',
  testId,
}) => (
  <button
    type="button"
    draggable
    aria-label={label}
    title={label}
    data-testid={testId}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    className={`inline-flex h-5 w-5 cursor-grab items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing ${className}`}
  >
    <GripVertical size={12} aria-hidden="true" />
  </button>
)

export const MatrixSettingsTable = ({
  draft,
  newThickness,
  setNewThickness,
  isAddingCol,
  setIsAddingCol,
  onMatrixUpdate,
  onMatrixPriceUpdate,
  onMoveThickness,
  onMoveRow,
  onRemoveThickness,
  onRemoveRow,
  onAddThickness,
  toolbar = null,
}) => {
  const [dragState, setDragState] = useState(null)

  const handleDragStart = (type, id) => (event) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${type}:${id}`)
    setDragState({ type, activeId: id, overId: id })
  }

  const handleDragEnd = () => {
    setDragState(null)
  }

  const handleDragOver = (type, overId) => (event) => {
    if (!dragState || dragState.type !== type || dragState.activeId === overId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragState.overId === overId) return
    setDragState((previous) => (previous ? { ...previous, overId } : previous))
  }

  const handleDrop = (type, overId) => (event) => {
    if (!dragState || dragState.type !== type || dragState.activeId === overId) return
    event.preventDefault()
    if (type === DRAG_TYPE_THICKNESS) onMoveThickness(dragState.activeId, overId)
    if (type === DRAG_TYPE_ROW) onMoveRow(dragState.activeId, overId)
    setDragState(null)
  }

  const handleAddThickness = (event) => {
    event.preventDefault()
    const thickness = parseInt(newThickness, 10)
    if (thickness) onAddThickness(thickness)
    setIsAddingCol(false)
    setNewThickness('')
  }

  return (
    <DataTable minWidthClass="min-w-[900px] whitespace-nowrap text-[12px]" toolbar={toolbar}>
      <DataTableHead>
        <tr>
          <DataTableHeaderCell align="center" className="w-8 !px-1 !py-2 text-[11px] leading-tight">
            <GripVertical size={12} className="mx-auto text-white/55" aria-hidden="true" />
          </DataTableHeaderCell>
          <DataTableHeaderCell align="center" className="w-10 !px-2 !py-2 text-[11px] leading-tight">ردیف</DataTableHeaderCell>
          <DataTableHeaderCell align="center" className="w-28 !px-2 !py-2 text-[11px] leading-tight">نوع شیشه</DataTableHeaderCell>
          <DataTableHeaderCell align="center" className="w-20 !px-2 !py-2 text-[11px] leading-tight">فرآیند</DataTableHeaderCell>
          {draft.thicknesses.map((thickness) => {
            const isColumnDragActive = dragState?.type === DRAG_TYPE_THICKNESS
            const isDraggedColumn = isColumnDragActive && dragState.activeId === thickness
            const isDropTargetColumn = isColumnDragActive && dragState.overId === thickness && dragState.activeId !== thickness

            return (
              <DataTableHeaderCell
                key={thickness}
                align="center"
                data-testid={`matrix-thickness-header-${thickness}`}
                className={`w-[84px] !px-1 !py-2 text-[11px] leading-tight ${isDraggedColumn ? 'opacity-60' : ''} ${isDropTargetColumn ? 'bg-blue-950/80' : ''}`}
                onDragOver={handleDragOver(DRAG_TYPE_THICKNESS, thickness)}
                onDrop={handleDrop(DRAG_TYPE_THICKNESS, thickness)}
              >
                <div className="grid grid-cols-[16px_minmax(0,1fr)_16px] items-center gap-0.5 rounded-md border border-slate-200 bg-white !px-1 !py-0.5">
                  <MatrixDragHandle
                    label={`جابه‌جایی ستون ضخامت ${toPN(thickness)} میل`}
                    testId={`matrix-thickness-handle-${thickness}`}
                    onDragStart={handleDragStart(DRAG_TYPE_THICKNESS, thickness)}
                    onDragEnd={handleDragEnd}
                  />
                  <span className="text-center text-[11px] font-black leading-none text-slate-700">{toPN(thickness)} میل</span>
                  <button
                    type="button"
                    aria-label={`حذف ضخامت ${toPN(thickness)}`}
                    title={`حذف ضخامت ${toPN(thickness)}`}
                    onClick={() => onRemoveThickness(thickness)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </div>
              </DataTableHeaderCell>
            )
          })}
          <DataTableHeaderCell align="center" className="w-20 !px-2 !py-2 text-[11px] leading-tight">
            {isAddingCol ? (
              <form onSubmit={handleAddThickness}>
                <input
                  type="number"
                  autoFocus
                  value={newThickness}
                  onChange={(event) => setNewThickness(event.target.value)}
                  placeholder="ضخامت"
                  className="w-full rounded-md border border-blue-300 bg-white !px-1.5 !py-0.5 text-center text-[11px] outline-none"
                />
              </form>
            ) : (
              <Button size="sm" variant="secondary" className="!h-7 !px-2 !text-[11px]" onClick={() => setIsAddingCol(true)} leadingIcon={Plus}>ستون</Button>
            )}
          </DataTableHeaderCell>
          <DataTableHeaderCell align="center" className="w-10 !px-2 !py-2 text-[11px] leading-tight">حذف</DataTableHeaderCell>
        </tr>
      </DataTableHead>

      <DataTableBody>
        {draft.glasses.length === 0 ? (
          <DataTableState colSpan={draft.thicknesses.length + 6} title="ردیفی برای ماتریس ثبت نشده است." />
        ) : draft.glasses.map((row, index) => {
          const isRowDragActive = dragState?.type === DRAG_TYPE_ROW
          const isDraggedRow = isRowDragActive && dragState.activeId === row.id
          const isDropTargetRow = isRowDragActive && dragState.overId === row.id && dragState.activeId !== row.id

          return (
            <DataTableRow
              key={row.id}
              data-testid={`matrix-row-${row.id}`}
              className={`${isDraggedRow ? 'opacity-60' : ''} ${isDropTargetRow ? '!bg-blue-50' : ''}`}
              onDragOver={handleDragOver(DRAG_TYPE_ROW, row.id)}
              onDrop={handleDrop(DRAG_TYPE_ROW, row.id)}
            >
              <DataTableCell align="center" className="!px-1 !py-2">
                <MatrixDragHandle
                  label={`جابه‌جایی ردیف ${toPN(index + 1)}`}
                  testId={`matrix-row-handle-${row.id}`}
                  onDragStart={handleDragStart(DRAG_TYPE_ROW, row.id)}
                  onDragEnd={handleDragEnd}
                  className="mx-auto"
                />
              </DataTableCell>
              <DataTableCell align="center" tone="emphasis" className="!px-2 !py-2 tabular-nums">{toPN(index + 1)}</DataTableCell>
              <DataTableCell align="center" className="!px-2 !py-2">
                <input
                  type="text"
                  value={row.title}
                  onChange={(event) => onMatrixUpdate(row.id, 'title', event.target.value)}
                  className="w-full rounded-md bg-transparent !px-1.5 !py-0.5 text-center text-[12px] font-black leading-tight outline-none focus:bg-slate-100"
                />
              </DataTableCell>
              <DataTableCell align="center" className="!px-2 !py-2">
                <select
                  value={row.process || 'raw'}
                  onChange={(event) => onMatrixUpdate(row.id, 'process', event.target.value)}
                  className={`w-full rounded-md border !px-1.5 !py-0.5 text-center text-[12px] font-black leading-tight outline-none ${(row.process || 'raw') === 'raw' ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50 text-rose-700'}`}
                >
                  <option value="raw">خام</option>
                  <option value="sekurit">سکوریت</option>
                </select>
              </DataTableCell>
              {draft.thicknesses.map((thickness) => (
                <DataTableCell key={`${row.id}-${thickness}`} align="center" className="!px-1.5 !py-1.5 focus-within:bg-blue-50/30">
                  <PriceInput
                    value={row.prices[thickness] || ''}
                    onChange={(value) => onMatrixPriceUpdate(row.id, thickness, value)}
                    className="!h-7 !rounded-md !px-1.5 !py-0.5 !text-[12px] !leading-none"
                  />
                </DataTableCell>
              ))}
              <DataTableCell className="!px-0 !py-0" />
              <DataTableCell align="center" className="!px-2 !py-2">
                <button
                  type="button"
                  aria-label="حذف ردیف"
                  title="حذف ردیف"
                  onClick={() => onRemoveRow(row.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </DataTableCell>
            </DataTableRow>
          )
        })}
      </DataTableBody>
    </DataTable>
  )
}
