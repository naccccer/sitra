import React from 'react'
import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/shared/ui'

export const OrderCustomerContextPanel = ({
  customerInfo,
  customerLinks,
  isStaffContext = false,
  onOpenCustomerLinkModal,
}) => {
  const hasCustomerName = String(customerInfo?.name || '').trim() !== ''
  const hasCustomerPhone = String(customerInfo?.phone || '').trim() !== ''
  const hasCustomerLink = Boolean(customerLinks?.selectedCustomerId)
  const isReady = hasCustomerName && hasCustomerPhone && (!isStaffContext || hasCustomerLink)
  const selectedCustomerName = String(customerLinks?.selectedCustomer?.fullName || '').trim()
  const buttonLabel = selectedCustomerName
    ? selectedCustomerName
    : (isStaffContext ? 'مشتری و پروژه سفارش' : 'اطلاعات سفارش‌دهنده')

  return (
    <div className="flex justify-start">
      <Button variant={isReady ? 'tertiary' : 'secondary'} size="sm" onClick={onOpenCustomerLinkModal} className="max-w-full">
        <FolderOpen size={14} />
        <span className="truncate">{buttonLabel}</span>
      </Button>
    </div>
  )
}
