'use client';

import { WatchlistProvider } from '@/components/watchlist';
import { GrantCard } from './grant-card';
import type { Grant } from '@/types';

interface GrantsGridClientProps {
  grants: Grant[];
}

export function GrantsGridClient({ grants }: GrantsGridClientProps) {
  const grantIds = grants.map(g => g.id);

  return (
    <WatchlistProvider grantIds={grantIds}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {grants.map((grant) => (
          <GrantCard key={grant.id} grant={grant} />
        ))}
      </div>
    </WatchlistProvider>
  );
}
