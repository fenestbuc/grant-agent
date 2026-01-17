'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface WatchlistStatus {
  inWatchlist: boolean;
  watchlistId: string | null;
}

interface WatchlistContextValue {
  getStatus: (grantId: string) => WatchlistStatus | undefined;
  setStatus: (grantId: string, status: WatchlistStatus) => void;
  isLoading: boolean;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

interface WatchlistProviderProps {
  children: ReactNode;
  grantIds: string[];
}

export function WatchlistProvider({ children, grantIds }: WatchlistProviderProps) {
  const [statusMap, setStatusMap] = useState<Record<string, WatchlistStatus>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchBatchStatus() {
      if (grantIds.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/watchlist/check-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grantIds }),
        });
        const result = await response.json();
        if (response.ok && result.data) {
          setStatusMap(result.data);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchBatchStatus();
  }, [grantIds]);

  const getStatus = useCallback((grantId: string) => {
    return statusMap[grantId];
  }, [statusMap]);

  const setStatus = useCallback((grantId: string, status: WatchlistStatus) => {
    setStatusMap(prev => ({ ...prev, [grantId]: status }));
  }, []);

  return (
    <WatchlistContext.Provider value={{ getStatus, setStatus, isLoading }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlistContext() {
  return useContext(WatchlistContext);
}
