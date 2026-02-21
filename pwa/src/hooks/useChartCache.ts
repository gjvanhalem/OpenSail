import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { loadCacheStats } from '@/store/slices/chartCacheSlice';
import { tileCache } from '@/database/services/TileCache';

export function useChartCache() {
  const dispatch = useDispatch<AppDispatch>();
  const chartCache = useSelector((state: RootState) => state.chartCache);

  // Load cache stats on mount
  useEffect(() => {
    dispatch(loadCacheStats());
  }, [dispatch]);

  // Periodically refresh cache stats (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(loadCacheStats());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  return {
    ...chartCache,
    refreshStats: () => dispatch(loadCacheStats()),
  };
}

// Hook to check if a tile is cached
export function useIsTileCached(z: number, x: number, y: number): boolean | null {
  const [isCached, setIsCached] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    tileCache.hasTile(z, x, y).then(result => {
      if (mounted) {
        setIsCached(result);
      }
    });

    return () => {
      mounted = false;
    };
  }, [z, x, y]);

  return isCached;
}

// Hook to monitor storage quota
export function useStorageQuota() {
  const [quota, setQuota] = useState<{
    usage: number;
    quota: number;
    available: number;
    percentUsed: number;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkQuota = async () => {
      const result = await tileCache.checkStorageQuota();
      if (mounted) {
        setQuota(result);
      }
    };

    checkQuota();

    // Refresh every minute
    const interval = setInterval(checkQuota, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return quota;
}
