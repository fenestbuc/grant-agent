'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SaveToWatchlistModal } from './save-to-watchlist-modal';
import { cn } from '@/lib/utils';
import { useWatchlistContext } from './watchlist-context';

interface WatchlistButtonProps {
  grantId: string;
  grantName: string;
  variant?: 'icon' | 'button';
  className?: string;
}

export function WatchlistButton({
  grantId,
  grantName,
  variant = 'icon',
  className,
}: WatchlistButtonProps) {
  const watchlistContext = useWatchlistContext();
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If context is available, use batched data
    if (watchlistContext) {
      const status = watchlistContext.getStatus(grantId);
      if (status) {
        setInWatchlist(status.inWatchlist);
        setWatchlistId(status.watchlistId);
        setLoading(false);
        return;
      }
      // If context is still loading, wait
      if (watchlistContext.isLoading) {
        return;
      }
    }

    // Fallback: fetch individually if no context or status not found
    async function checkWatchlist() {
      try {
        const response = await fetch(`/api/watchlist/check/${grantId}`);
        const result = await response.json();
        setInWatchlist(result.data.inWatchlist);
        setWatchlistId(result.data.watchlistId);
      } finally {
        setLoading(false);
      }
    }
    checkWatchlist();
  }, [grantId, watchlistContext]);

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!watchlistId) return;

    const response = await fetch(`/api/watchlist/${watchlistId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setInWatchlist(false);
      setWatchlistId(null);
      // Sync with context if available
      watchlistContext?.setStatus(grantId, { inWatchlist: false, watchlistId: null });
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inWatchlist) {
      handleRemove(e);
    } else {
      setModalOpen(true);
    }
  };

  const handleSaved = () => {
    setInWatchlist(true);
    // Refetch to get the watchlist ID
    fetch(`/api/watchlist/check/${grantId}`)
      .then((res) => res.json())
      .then((result) => {
        const newWatchlistId = result.data.watchlistId;
        setWatchlistId(newWatchlistId);
        // Sync with context if available
        watchlistContext?.setStatus(grantId, { inWatchlist: true, watchlistId: newWatchlistId });
      });
  };

  if (loading) {
    return variant === 'icon' ? (
      <div className={cn('h-8 w-8', className)} />
    ) : (
      <Button variant="outline" disabled className={className}>
        Loading...
      </Button>
    );
  }

  const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-5 w-5', filled ? 'fill-red-500 text-red-500' : 'fill-none')}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  );

  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          className={cn('hover:bg-red-50 dark:hover:bg-red-950', className)}
          title={inWatchlist ? 'Remove from watchlist' : 'Save to watchlist'}
        >
          <HeartIcon filled={inWatchlist} />
        </Button>
        <SaveToWatchlistModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          grantId={grantId}
          grantName={grantName}
          onSaved={handleSaved}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={inWatchlist ? 'default' : 'outline'}
        onClick={handleClick}
        className={className}
      >
        <HeartIcon filled={inWatchlist} />
        <span className="ml-2">
          {inWatchlist ? 'Saved' : 'Save to Watchlist'}
        </span>
      </Button>
      <SaveToWatchlistModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        grantId={grantId}
        grantName={grantName}
        onSaved={handleSaved}
      />
    </>
  );
}
