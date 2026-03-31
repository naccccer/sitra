import { salesApi } from '@/modules/sales/services/salesApi';
import { parseIntSafe } from '@/modules/sales/components/customer/order-form/orderFormUtils';

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
  setCustomerInfo,
  setEditingItemId,
  setEditingItemType,
  setInvoiceNotes,
  setIsCheckoutOpen,
  setOrderItems,
  setOrders,
  setPayments,
}) => {
  const trimmedName = customerInfo.name.trim();
  const trimmedPhone = customerInfo.phone.trim();
  if (!trimmedName) return alert('لطفاً نام و نام خانوادگی را وارد کنید.');
  if (trimmedName.length < 2) return alert('نام باید حداقل 2 کاراکتر باشد.');
  if (!trimmedPhone) return alert('لطفاً شماره تماس را وارد کنید.');
  if (trimmedPhone.length < 5) return alert('شماره تماس معتبر نیست.');

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
      };
      const response = await salesApi.updateOrder(updatePayload);
      const updatedOrder = response?.order ?? { ...editingOrder, ...updatePayload };
      setOrders((previous) => previous.map((order) => (order.id === editingOrder.id ? updatedOrder : order)));
      alert(response?.queued ? 'ویرایش سفارش در صف آفلاین ثبت شد و بعد از اتصال همگام‌سازی می‌شود.' : 'سفارش با موفقیت ویرایش شد.');
      onCancelEdit?.();
      return;
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
        : orderItems.reduce((accumulator, item) => accumulator + Math.max(0, parseIntSafe(item.totalPrice, 0)), 0),
      status: 'pending',
      items: [...orderItems],
    };
    if (isStaffContext) {
      createPayload.financials = financials;
      createPayload.payments = payments;
      createPayload.invoiceNotes = invoiceNotes;
    }

    const response = await salesApi.createOrder(createPayload);
    const createdOrder = response?.order ?? { id: Date.now(), ...createPayload, orderCode: '' };
    setOrders((previous) => [createdOrder, ...previous]);
    alert(response?.queued
      ? 'سفارش در صف آفلاین ذخیره شد و پس از اتصال به صورت خودکار ارسال می‌شود.'
      : `سفارش ثبت شد. کد پیگیری: ${createdOrder.orderCode || '-'}`);

    setOrderItems([]);
    setPayments([]);
    setInvoiceNotes('');
    setIsCheckoutOpen(false);
    setCustomerInfo({ name: '', phone: '' });
    setEditingItemId(null);
    setEditingItemType('catalog');
    onClearCreateDraft?.();
  } catch (error) {
    alert(error?.message || 'ثبت سفارش با خطا مواجه شد.');
  }
};
