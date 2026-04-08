import { salesApi } from '@/modules/sales/services/salesApi'
import { parseIntSafe } from '@/modules/sales/components/customer/order-form/orderFormUtils'
import { normalizeDigitsToLatin } from '@/utils/helpers'

const buildValidationFailure = (message) => ({
  ok: false,
  kind: 'validation',
  message,
})

export const submitOrderPayload = async ({
  customerInfo,
  editingOrder,
  financials,
  grandTotal,
  invoiceNotes,
  isStaffContext,
  onCancelEdit,
  onClearCreateDraft,
  orderItems,
  payments,
  selectedCustomerId,
  selectedProjectContactId,
  selectedProjectId,
  setEditingItemId,
  setEditingItemType,
  setInvoiceNotes,
  setIsCheckoutOpen,
  setOrderItems,
  setOrders,
  setPayments,
}) => {
  const trimmedName = String(customerInfo?.name || '').trim()
  const trimmedPhone = normalizeDigitsToLatin(customerInfo?.phone).trim()

  if (!trimmedName) return buildValidationFailure('نام سفارش‌دهنده را پیش از ثبت نهایی کامل کنید.')
  if (trimmedName.length < 2) return buildValidationFailure('نام سفارش‌دهنده باید حداقل ۲ کاراکتر باشد.')
  if (!trimmedPhone) return buildValidationFailure('شماره تماس سفارش‌دهنده هنوز ثبت نشده است.')
  if (trimmedPhone.length < 5) return buildValidationFailure('شماره تماس سفارش‌دهنده معتبر نیست.')
  if (!Array.isArray(orderItems) || orderItems.length === 0) return buildValidationFailure('برای ثبت سفارش حداقل یک آیتم لازم است.')

  try {
    if (editingOrder) {
      const updatePayload = {
        id: Number(editingOrder.id),
        customerName: trimmedName,
        phone: trimmedPhone,
        customerId: selectedCustomerId || editingOrder.customerId || null,
        projectId: selectedProjectId || editingOrder.projectId || null,
        projectContactId: selectedProjectContactId || editingOrder.projectContactId || null,
        date: editingOrder.date,
        total: grandTotal,
        status: editingOrder.status || 'pending',
        items: [...orderItems],
        financials,
        payments,
        invoiceNotes,
        expectedUpdatedAt: editingOrder?.updatedAt || null,
      }
      const response = await salesApi.updateOrder(updatePayload)
      const updatedOrder = response?.order ?? { ...editingOrder, ...updatePayload }
      setOrders((previous) => previous.map((order) => (order.id === editingOrder.id ? updatedOrder : order)))
      setIsCheckoutOpen(false)
      onCancelEdit?.()
      return {
        ok: true,
        mode: 'edit',
        queued: Boolean(response?.queued),
        title: response?.queued ? 'ویرایش در صف آفلاین ثبت شد' : 'ویرایش سفارش ثبت شد',
        message: response?.queued
          ? 'تغییرات بعد از اتصال دوباره به‌صورت خودکار همگام می‌شود.'
          : 'سفارش با اطلاعات جدید به‌روزرسانی شد.',
      }
    }

    const createPayload = {
      customerName: trimmedName,
      phone: trimmedPhone,
      customerId: selectedCustomerId || null,
      projectId: selectedProjectId || null,
      projectContactId: selectedProjectContactId || null,
      date: new Date().toLocaleDateString('fa-IR'),
      total: isStaffContext
        ? grandTotal
        : orderItems.reduce((sum, item) => sum + Math.max(0, parseIntSafe(item.totalPrice, 0)), 0),
      status: 'pending',
      items: [...orderItems],
    }

    if (isStaffContext) {
      createPayload.financials = financials
      createPayload.payments = payments
      createPayload.invoiceNotes = invoiceNotes
    }

    const response = await salesApi.createOrder(createPayload)
    const createdOrder = response?.order ?? { id: Date.now(), ...createPayload, orderCode: '' }

    setOrders((previous) => [createdOrder, ...previous])
    setOrderItems([])
    setPayments([])
    setInvoiceNotes('')
    setEditingItemId(null)
    setEditingItemType('catalog')
    onClearCreateDraft?.()

    return {
      ok: true,
      mode: 'create',
      queued: Boolean(response?.queued),
      orderCode: createdOrder.orderCode || '',
      submittedTotal: grandTotal,
      title: response?.queued ? 'سفارش در صف آفلاین ذخیره شد' : 'سفارش با موفقیت ثبت شد',
      message: response?.queued
        ? 'پس از اتصال دوباره، سفارش به‌صورت خودکار برای سرور ارسال و همگام می‌شود.'
        : `کد پیگیری سفارش ${createdOrder.orderCode || 'پس از همگام‌سازی تخصیص می‌شود'}.`,
    }
  } catch (error) {
    return {
      ok: false,
      kind: 'request',
      message: error?.message || 'ثبت سفارش با خطا مواجه شد.',
    }
  }
}
