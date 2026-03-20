import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { PayslipEditorModal } from '../../src/modules/accounting/components/payroll/PayslipEditorModal'

const BASE_PAYSLIP = {
  id: 'slip-1',
  employeeId: '',
  employeeName: '',
  employeeCode: '',
  department: '',
  status: 'draft',
  baseSalary: 0,
  housingAllowance: 0,
  foodAllowance: 0,
  childAllowance: 0,
  seniorityAllowance: 0,
  overtimeHours: 0,
  overtimePay: 0,
  bonus: 0,
  otherAdditions: 0,
  insurance: 0,
  tax: 0,
  loanDeduction: 0,
  advanceDeduction: 0,
  absenceDeduction: 0,
  otherDeductions: 0,
  notes: '',
}

function renderModal(overrides = {}) {
  const props = {
    busy: false,
    employees: [],
    onClose: vi.fn(),
    onSave: vi.fn(),
    onUploadPdf: vi.fn(),
    payslip: { ...BASE_PAYSLIP, ...(overrides.payslip || {}) },
    run: { title: 'اسفند ۱۴۰۴' },
    ...overrides,
  }
  render(<PayslipEditorModal {...props} />)
  return props
}

describe('PayslipEditorModal', () => {
  afterEach(() => cleanup())

  it('shows a clear validation error when no employee is selected', () => {
    const props = renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'ذخیره فیش' }))

    expect(screen.getByText('لطفاً پرسنل را انتخاب کنید.')).toBeTruthy()
    expect(props.onSave).not.toHaveBeenCalled()
  })

  it('saves with a valid employeeId from HR employees list', () => {
    const employees = [
      { id: '1', fullName: 'علی رضایی', employeeCode: '1001', department: 'مالی' },
      { id: '2', fullName: 'ندا کرمی', employeeCode: '1002', department: 'منابع انسانی' },
    ]
    const props = renderModal({
      employees,
      payslip: { employeeId: '2', employeeName: 'ندا کرمی', employeeCode: '1002', department: 'منابع انسانی' },
    })
    const employeeSelect = screen.getByRole('combobox')

    expect(employeeSelect.value).toBe('2')

    fireEvent.change(employeeSelect, { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'ذخیره فیش' }))

    expect(props.onSave).toHaveBeenCalledTimes(1)
    expect(props.onSave).toHaveBeenCalledWith(expect.objectContaining({
      employeeId: '1',
      employeeName: 'علی رضایی',
      employeeCode: '1001',
      department: 'مالی',
    }))
  })
})
