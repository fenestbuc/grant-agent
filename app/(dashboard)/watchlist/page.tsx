// app/(dashboard)/watchlist/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Heart, Trash2, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Watchlist, Grant } from '@/types';

interface WatchlistItemWithGrant extends Watchlist {
  grants: Pick<Grant, 'id' | 'name' | 'provider' | 'provider_type' | 'deadline' | 'amount_max' | 'sectors'> | null;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItemWithGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | 'upcoming'>('all');

  const fetchWatchlist = useCallback(async () => {
    try {
      const url = deadlineFilter === 'upcoming' 
        ? '/api/watchlist?deadline=upcoming' 
        : '/api/watchlist';
      const response = await fetch(url);
      const result = await response.json();
      if (response.ok) {
        setWatchlist(result.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [deadlineFilter]);

  useEffect(() => {
    setLoading(true);
    fetchWatchlist();
  }, [fetchWatchlist]);

  const handleToggleNotification = async (
    id: string,
    field: 'notify_deadline' | 'notify_changes',
    value: boolean
  ) => {
    // Optimistic update
    setWatchlist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );

    try {
      const response = await fetch(`/api/watchlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        // Revert on error
        setWatchlist((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, [field]: !value } : item
          )
        );
      }
    } catch {
      // Revert on error
      setWatchlist((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, [field]: !value } : item
        )
      );
    }
  };

  const handleRemove = async (id: string) => {
    // Optimistic update
    const previousWatchlist = watchlist;
    setWatchlist((prev) => prev.filter((item) => item.id !== id));

    try {
      const response = await fetch(`/api/watchlist/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Revert on error
        setWatchlist(previousWatchlist);
      }
    } catch {
      // Revert on error
      setWatchlist(previousWatchlist);
    }
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return null;
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getDaysUntilDeadline = (deadline: string | null): number | null => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDeadlineBadgeVariant = (daysUntil: number | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (daysUntil === null) return 'secondary';
    if (daysUntil < 0) return 'destructive';
    if (daysUntil <= 7) return 'default';
    return 'secondary';
  };

  const getDeadlineText = (deadline: string | null, daysUntil: number | null): string => {
    if (!deadline) return 'Rolling deadline';
    if (daysUntil === null) return 'No deadline';
    if (daysUntil < 0) return `Passed ${Math.abs(daysUntil)} days ago`;
    if (daysUntil === 0) return 'Due today';
    if (daysUntil === 1) return 'Due tomorrow';
    if (daysUntil <= 7) return `${daysUntil} days left`;
    return new Date(deadline).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const providerTypeColors: Record<string, string> = {
    government: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    csr: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    private: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    ngo: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-muted-foreground">
            {loading
              ? 'Loading your saved grants...'
              : `${watchlist.length} saved grant${watchlist.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Filter */}
        <Select
          value={deadlineFilter}
          onValueChange={(value: 'all' | 'upcoming') => setDeadlineFilter(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by deadline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grants</SelectItem>
            <SelectItem value="upcoming">Upcoming Deadlines</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Watchlist Items */}
      {!loading && watchlist.length > 0 && (
        <div className="space-y-4">
          {watchlist.map((item) => {
            const grant = item.grants;
            if (!grant) return null;

            const daysUntil = getDaysUntilDeadline(grant.deadline);
            const deadlineVariant = getDeadlineBadgeVariant(daysUntil);
            const deadlineText = getDeadlineText(grant.deadline, daysUntil);

            return (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        <Link
                          href={`/grants/${grant.id}`}
                          className="hover:underline"
                        >
                          {grant.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>{grant.provider}</CardDescription>
                    </div>
                    <Badge variant={deadlineVariant} className={deadlineVariant === 'default' && daysUntil !== null && daysUntil <= 7 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : ''}>
                      {deadlineText}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Grant Info */}
                  <div className="flex flex-wrap items-center gap-2">
                    {grant.amount_max && (
                      <span className="text-sm font-medium text-primary">
                        Up to {formatAmount(grant.amount_max)}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className={providerTypeColors[grant.provider_type] || ''}
                    >
                      {grant.provider_type.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Notification Toggles */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`deadline-${item.id}`}
                        checked={item.notify_deadline}
                        onCheckedChange={(checked) =>
                          handleToggleNotification(item.id, 'notify_deadline', checked)
                        }
                      />
                      <Label htmlFor={`deadline-${item.id}`} className="text-sm">
                        Deadline reminders
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`changes-${item.id}`}
                        checked={item.notify_changes}
                        onCheckedChange={(checked) =>
                          handleToggleNotification(item.id, 'notify_changes', checked)
                        }
                      />
                      <Label htmlFor={`changes-${item.id}`} className="text-sm">
                        Update alerts
                      </Label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/grants/${grant.id}`}>
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View Grant
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && watchlist.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No saved grants yet</h3>
            <p className="mt-2 text-muted-foreground">
              Save grants to your watchlist to track deadlines and receive notifications.
            </p>
            <Button asChild className="mt-6">
              <Link href="/grants">Browse Grants</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
