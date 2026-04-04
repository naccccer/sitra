import React, { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MatrixSettingsTable } from '../../src/modules/master-data/components/admin-settings/MatrixSettingsTable'

const buildDragTransfer = () => ({
  dataTransfer: {
    effectAllowed: 'move',
    dropEffect: 'move',
    setData: () => {},
    getData: () => '',
  },
})

const readThicknessOrder = (container) => (
  [...container.querySelectorAll('th[data-testid^="matrix-thickness-header-"]')]
    .map((node) => Number(node.dataset.testid.replace('matrix-thickness-header-', '')))
)

const readRowOrder = (container) => (
  [...container.querySelectorAll('tbody tr[data-testid^="matrix-row-"]')]
    .map((node) => node.dataset.testid.replace('matrix-row-', ''))
)

const Harness = ({ initialDraft }) => {
  const [draft, setDraft] = useState(initialDraft)
  const [newThickness, setNewThickness] = useState('')
  const [isAddingCol, setIsAddingCol] = useState(false)

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

  const moveThickness = (activeThickness, overThickness) => {
    setDraft((previous) => {
      const nextThicknesses = [...previous.thicknesses]
      const activeIndex = nextThicknesses.indexOf(activeThickness)
      const overIndex = nextThicknesses.indexOf(overThickness)
      const [movedThickness] = nextThicknesses.splice(activeIndex, 1)
      nextThicknesses.splice(overIndex, 0, movedThickness)
      return { ...previous, thicknesses: nextThicknesses }
    })
  }

  const moveRow = (activeRowId, overRowId) => {
    setDraft((previous) => {
      const nextRows = [...previous.glasses]
      const activeIndex = nextRows.findIndex((row) => row.id === activeRowId)
      const overIndex = nextRows.findIndex((row) => row.id === overRowId)
      const [movedRow] = nextRows.splice(activeIndex, 1)
      nextRows.splice(overIndex, 0, movedRow)
      return { ...previous, glasses: nextRows }
    })
  }

  return (
    <MatrixSettingsTable
      draft={draft}
      newThickness={newThickness}
      setNewThickness={setNewThickness}
      isAddingCol={isAddingCol}
      setIsAddingCol={setIsAddingCol}
      onMatrixUpdate={handleMatrixUpdate}
      onMatrixPriceUpdate={handleMatrixPriceUpdate}
      onMoveThickness={moveThickness}
      onMoveRow={moveRow}
      onRemoveThickness={(thickness) => setDraft((previous) => ({ ...previous, thicknesses: previous.thicknesses.filter((item) => item !== thickness) }))}
      onRemoveRow={(rowId) => setDraft((previous) => ({ ...previous, glasses: previous.glasses.filter((item) => item.id !== rowId) }))}
      onAddThickness={(thickness) => setDraft((previous) => ({ ...previous, thicknesses: [...previous.thicknesses, thickness] }))}
    />
  )
}

describe('MatrixSettingsTable', () => {
  afterEach(() => {
    cleanup()
  })

  const initialDraft = {
    thicknesses: [4, 8, 6],
    glasses: [
      { id: 'g1', title: 'فلوت', process: 'raw', prices: { 4: 100000, 8: 160000, 6: 140000 } },
      { id: 'g2', title: 'سوپر کلیر', process: 'sekurit', prices: { 4: 190000, 8: 260000, 6: 220000 } },
    ],
  }

  it('reorders thickness columns via drag handles', () => {
    const { container } = render(<Harness initialDraft={initialDraft} />)

    fireEvent.dragStart(screen.getByTestId('matrix-thickness-handle-8'), buildDragTransfer())
    fireEvent.dragOver(screen.getByTestId('matrix-thickness-header-4'), buildDragTransfer())
    fireEvent.drop(screen.getByTestId('matrix-thickness-header-4'), buildDragTransfer())

    expect(readThicknessOrder(container)).toEqual([8, 4, 6])
  })

  it('reorders rows via drag handles', () => {
    const { container } = render(<Harness initialDraft={initialDraft} />)

    fireEvent.dragStart(screen.getByTestId('matrix-row-handle-g2'), buildDragTransfer())
    fireEvent.dragOver(screen.getByTestId('matrix-row-g1'), buildDragTransfer())
    fireEvent.drop(screen.getByTestId('matrix-row-g1'), buildDragTransfer())

    expect(readRowOrder(container)).toEqual(['g2', 'g1'])
  })

  it('appends newly added thicknesses after manual ordering', () => {
    const { container } = render(<Harness initialDraft={initialDraft} />)

    fireEvent.dragStart(screen.getByTestId('matrix-thickness-handle-8'), buildDragTransfer())
    fireEvent.dragOver(screen.getByTestId('matrix-thickness-header-4'), buildDragTransfer())
    fireEvent.drop(screen.getByTestId('matrix-thickness-header-4'), buildDragTransfer())

    fireEvent.click(screen.getByRole('button', { name: 'ستون' }))
    fireEvent.change(screen.getByPlaceholderText('ضخامت'), { target: { value: '10' } })
    fireEvent.submit(screen.getByPlaceholderText('ضخامت').closest('form'))

    expect(readThicknessOrder(container)).toEqual([8, 4, 6, 10])
  })
})
