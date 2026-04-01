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
    <div className="print-hide sticky top-0 z-40 border-b border-[rgb(var(--ui-warning-border))] bg-[rgb(var(--ui-warning-bg))] px-4 py-2 text-[11px] font-bold text-[rgb(var(--ui-warning-text))]">
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
              className="rounded-md border border-[rgb(var(--ui-warning-border))] bg-white px-2 py-1 text-[10px] font-black text-[rgb(var(--ui-warning-text))] hover:bg-[rgb(var(--ui-warning-bg))]/75"
            >
              همگام‌سازی
            </button>
          )}

          {firstConflict && (
            <>
              <button
                type="button"
                onClick={() => onAcceptConflict(firstConflict.queueId)}
                className="rounded-md border border-[rgb(var(--ui-danger-border))] bg-white px-2 py-1 text-[10px] font-black text-[rgb(var(--ui-danger-text))] hover:bg-[rgb(var(--ui-danger-bg))]/75"
              >
                پذیرش نسخه سرور
              </button>
              <button
                type="button"
                onClick={() => onRetryConflict(firstConflict.queueId)}
                className="rounded-md border border-[rgb(var(--ui-info-border))] bg-white px-2 py-1 text-[10px] font-black text-[rgb(var(--ui-info-text))] hover:bg-[rgb(var(--ui-info-bg))]/75"
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
