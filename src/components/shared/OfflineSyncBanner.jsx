import React from 'react'

export const OfflineSyncBanner = ({
  isOnline,
  queueSnapshot,
  onSyncNow,
  onAcceptConflict,
  onRetryConflict,
}) => {
  const pendingCount = Number(queueSnapshot?.pendingCount || 0)
  const authBlockedCount = Number(queueSnapshot?.authBlockedCount || 0)
  const conflictCount = Number(queueSnapshot?.conflictCount || 0)
  const isSyncing = Boolean(queueSnapshot?.isSyncing)
  const firstConflict = queueSnapshot?.firstConflict || null

  const shouldShow = !isOnline || pendingCount > 0 || authBlockedCount > 0 || conflictCount > 0 || isSyncing
  if (!shouldShow) return null

  return (
    <div className="print-hide sticky top-0 z-40 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-900">
      <div className="mx-auto flex max-w-[1300px] flex-wrap items-center gap-2">
        {!isOnline && <span>اتصال اینترنت قطع است. عملیات فروش در صف آفلاین ذخیره می‌شود.</span>}
        {isOnline && isSyncing && <span>در حال همگام‌سازی صف آفلاین...</span>}
        {pendingCount > 0 && <span>{pendingCount} عملیات آماده همگام‌سازی است.</span>}
        {authBlockedCount > 0 && <span>{authBlockedCount} عملیات منتظر ورود مجدد کاربر است.</span>}
        {conflictCount > 0 && <span>{conflictCount} تعارض نسخه نیازمند تصمیم‌گیری است.</span>}

        <div className="mr-auto flex items-center gap-1.5">
          {isOnline && (pendingCount > 0 || authBlockedCount > 0) && (
            <button
              type="button"
              onClick={onSyncNow}
              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-black text-amber-800 hover:bg-amber-100"
            >
              همگام‌سازی
            </button>
          )}

          {firstConflict && (
            <>
              <button
                type="button"
                onClick={() => onAcceptConflict(firstConflict.queueId)}
                className="rounded-md border border-red-300 bg-white px-2 py-1 text-[10px] font-black text-red-700 hover:bg-red-50"
              >
                پذیرش نسخه سرور
              </button>
              <button
                type="button"
                onClick={() => onRetryConflict(firstConflict.queueId)}
                className="rounded-md border border-blue-300 bg-white px-2 py-1 text-[10px] font-black text-blue-700 hover:bg-blue-50"
              >
                اعمال مجدد تغییر من
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
