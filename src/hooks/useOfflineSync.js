import { useEffect, useState } from 'react';
import {
  dropSalesOfflineOperation,
  getSalesOfflineQueueSnapshot,
  retrySalesOfflineConflict,
  subscribeSalesOfflineQueue,
} from '../services/salesOfflineQueue';

const EMPTY_OFFLINE_QUEUE_SNAPSHOT = {
  pendingCount: 0,
  authBlockedCount: 0,
  conflictCount: 0,
  isSyncing: false,
  firstConflict: null,
};

/**
 * Manages offline queue subscription, online/offline state, and event-driven sync triggers.
 *
 * @param {{ runOfflineSync: (targetSession?: object|null) => Promise<any> }} opts
 * @returns {{
 *   isOnline: boolean,
 *   offlineQueueSnapshot: import('../services/salesOfflineQueue').QueueSnapshot,
 *   handleSyncNow: () => void,
 *   handleAcceptConflict: (queueId: string) => void,
 *   handleRetryConflict: (queueId: string) => void,
 * }}
 */
export function useOfflineSync({ runOfflineSync }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine !== false,
  );
  const [offlineQueueSnapshot, setOfflineQueueSnapshot] = useState(EMPTY_OFFLINE_QUEUE_SNAPSHOT);

  useEffect(() => {
    let disposed = false;

    const unsubscribe = subscribeSalesOfflineQueue((snapshot) => {
      if (!disposed) {
        setOfflineQueueSnapshot(snapshot);
      }
    });

    const handleOnline = () => {
      setIsOnline(true);
      runOfflineSync().catch((error) => {
        if (import.meta.env.DEV) console.error('Failed to sync offline queue after online event.', error);
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runOfflineSync().catch((error) => {
          if (import.meta.env.DEV) console.error('Failed to sync offline queue after visibility change.', error);
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    runOfflineSync().catch((error) => {
      if (import.meta.env.DEV) console.error('Failed to run initial offline sync.', error);
    });

    return () => {
      disposed = true;
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [runOfflineSync]);

  const handleSyncNow = () => {
    runOfflineSync().catch((error) => {
      if (import.meta.env.DEV) console.error('Manual queue sync failed.', error);
    });
  };

  const handleAcceptConflict = (queueId) => {
    dropSalesOfflineOperation(queueId)
      .then(() => getSalesOfflineQueueSnapshot())
      .then((snapshot) => setOfflineQueueSnapshot(snapshot))
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Failed to drop conflict queue item.', error);
      });
  };

  const handleRetryConflict = (queueId) => {
    retrySalesOfflineConflict(queueId)
      .then(() => runOfflineSync())
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Failed to retry conflict queue item.', error);
      });
  };

  return {
    isOnline,
    offlineQueueSnapshot,
    handleSyncNow,
    handleAcceptConflict,
    handleRetryConflict,
  };
}
