'use client';

import { fetchApi } from '@/lib/api/client';

import { useEffect, useState } from 'react';
import { GrantCard } from './grant-card';
import { WatchlistProvider } from '@/components/watchlist';
import { Skeleton } from '@/components/ui/skeleton';
import type { Grant } from '@/types';

interface RecommendedGrant extends Grant {
  relevance_score: number;
  match_reasons: string[];
}

export function RecommendedGrants() {
  const [grants, setGrants] = useState<RecommendedGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommended() {
      try {
        const res = await fetchApi('/api/grants/recommended');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to fetch recommendations');
        }
        const data = await res.json();
        setGrants(data.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    }
    fetchRecommended();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-6 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium">Unable to load recommendations</h3>
        <p className="mt-2 text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (grants.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto h-12 w-12 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium">No recommendations yet</h3>
        <p className="mt-2 text-muted-foreground">
          Complete your startup profile to get personalized grant recommendations.
        </p>
      </div>
    );
  }

  const grantIds = grants.map((g) => g.id);

  return (
    <WatchlistProvider grantIds={grantIds}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {grants.map((grant) => (
          <GrantCard
            key={grant.id}
            grant={grant}
            matchScore={grant.relevance_score}
            matchReasons={grant.match_reasons}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground text-center mt-4">
        Showing {grants.length} recommended grants based on your startup profile
      </p>
    </WatchlistProvider>
  );
}
