import { CheckCircle2 } from 'lucide-react'
import { PayrollConfirmModal } from './PayrollConfirmModal'

export function PayrollFinalizeConfirmModal({ isOpen, onClose, onConfirm }) {
  return (
    <PayrollConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="تایید نهایی‌سازی دوره"
      description="بعد از نهایی‌سازی، ثبت پرداخت از تب پرداخت‌ها انجام می‌شود و بازگشایی فقط تا قبل از ثبت پرداخت ممکن است."
      confirmLabel="تایید و نهایی‌سازی"
      confirmVariant="primary"
      icon={CheckCircle2}
      body="از نهایی‌سازی این دوره مطمئن هستید؟"
    />
  )
}
