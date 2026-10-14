import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, Platform } from 'react-native';
import { getMobileProducts, getMobileCategories } from '../api/mobileApi';

/**
 * Custom React Hook for Hybrid Pull-Based Inventory Synchronization & Lifecycle Management
 *
 * Features:
 * 1. Seamless Pull-to-Refresh: Exposes `refreshing` and `refreshCatalog` for RefreshControl
 * 2. AppState Lifecycle Listener: Auto-refetches fresh catalog when returning to foreground
 * 3. Offline State & Error Handling: Avoids silent seed fallbacks when network fails
 * 4. Low Overhead: Deduplicates concurrent requests and supports silent background updates
 *
 * @param {Object} options
 * @param {Array} options.initialProducts - Fallback seed catalog for initial cold-start
 * @param {Array} options.initialCategories - Fallback categories
 * @param {Function} [options.onSyncSuccess] - Callback when fresh stock is synchronized
 * @param {Function} [options.onSyncError] - Callback when synchronization fails
 */
export function useProductCatalog({
  initialProducts = [],
  initialCategories = [],
  onSyncSuccess,
  onSyncError,
} = {}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  // Track AppState and active network fetch in flight
  const appState = useRef(AppState.currentState);
  const isFetchingRef = useRef(false);

  /**
   * Fetch and synchronize products & categories from Laravel backend
   * @param {boolean} isSilent - When true, skips full-screen/spinner loading state
   */
  const refreshCatalog = useCallback(
    async (isSilent = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (!isSilent) {
        setRefreshing(true);
      }
      setError(null);

      try {
        const [fetchedProducts, fetchedCategories] = await Promise.all([
          getMobileProducts({ allowSeedFallback: false }),
          getMobileCategories(),
        ]);

        if (Array.isArray(fetchedProducts)) {
          setProducts(fetchedProducts);
        }

        if (Array.isArray(fetchedCategories) && fetchedCategories.length > 0) {
          setCategories(fetchedCategories);
        }

        setIsOffline(false);
        const syncTimestamp = new Date();
        setLastSyncedAt(syncTimestamp);

        if (onSyncSuccess) {
          onSyncSuccess(fetchedProducts?.length || 0, syncTimestamp);
        }
      } catch (err) {
        const isNetworkFailure =
          err?.message?.includes('Network') ||
          err?.message?.includes('Failed to fetch') ||
          err?.message?.includes('timeout') ||
          err?.message?.includes('backend') ||
          err?.status === 0;

        setIsOffline(true);
        setError(err?.message || 'Failed to synchronize inventory.');

        if (onSyncError) {
          onSyncError(err, isNetworkFailure);
        }
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [onSyncSuccess, onSyncError]
  );

  // 1. Initial Mount: Fetch latest inventory
  useEffect(() => {
    refreshCatalog(false);
  }, [refreshCatalog]);

  // 2. AppState Lifecycle Listener: Auto-sync whenever returning from background to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      const isComingToForeground =
        appState.current.match(/inactive|background/) && nextAppState === 'active';

      if (isComingToForeground) {
        // App resumed to foreground: silently fetch latest stock to catch POS/Web updates
        refreshCatalog(true);
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [refreshCatalog]);

  // 3. Web Platform Window Focus & Online Event Listeners (Web / Hybrid Preview)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleWindowFocus = () => {
        refreshCatalog(true);
      };

      const handleOnline = () => {
        setIsOffline(false);
        refreshCatalog(false);
      };

      const handleOffline = () => {
        setIsOffline(true);
      };

      window.addEventListener('focus', handleWindowFocus);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('focus', handleWindowFocus);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [refreshCatalog]);

  return {
    products,
    setProducts,
    categories,
    setCategories,
    loading,
    refreshing,
    isOffline,
    error,
    lastSyncedAt,
    refreshCatalog,
  };
}

export default useProductCatalog;
