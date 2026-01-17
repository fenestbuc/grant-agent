// app/(dashboard)/notifications/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { Notification } from '@/types';

type NotificationFilter = 'all' | 'deadline_reminder' | 'new_grant' | 'grant_update';

const notificationTypeConfig: Record<Notification['type'], { emoji: string; label: string }> = {
  deadline_reminder: { emoji: '⏰', label: 'Deadline' },
  new_grant: { emoji: '🎉', label: 'New Grant' },
  grant_update: { emoji: '📢', label: 'Update' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const url = filter === 'all'
        ? '/api/notifications?limit=100'
        : `/api/notifications?limit=100&type=${filter}`;
      const response = await fetch(url);
      const result = await response.json();
      if (response.ok) {
        setNotifications(result.data || []);
        setUnreadCount(result.unreadCount || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        // Revert on error
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
        );
        setUnreadCount((prev) => prev + 1);
      }
    } catch {
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
      setUnreadCount((prev) => prev + 1);
    }
  };

  const handleMarkAllRead = async () => {
    // Store previous state for rollback
    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
      }
    } catch {
      // Revert on error
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkRead(notification.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {unreadCount} unread
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground">
              {loading
                ? 'Loading notifications...'
                : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="w-fit"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as NotificationFilter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="deadline_reminder">Deadlines</TabsTrigger>
          <TabsTrigger value="new_grant">New Grants</TabsTrigger>
          <TabsTrigger value="grant_update">Updates</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {/* Loading State */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="py-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Notifications List */}
          {!loading && notifications.length > 0 && (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const config = notificationTypeConfig[notification.type];
                return (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        {/* Type Icon */}
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl">
                          {config.emoji}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-medium truncate ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            </div>

                            {/* Unread indicator */}
                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(notification.created_at)}
                            </span>

                            {notification.grant_id && (
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Link href={`/grants/${notification.grant_id}`}>
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Grant
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && notifications.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No notifications</h3>
                <p className="mt-2 text-muted-foreground">
                  {filter === 'all'
                    ? "You're all caught up! Check back later for updates."
                    : `No ${notificationTypeConfig[filter as Notification['type']]?.label.toLowerCase() || 'matching'} notifications.`}
                </p>
                <Button asChild className="mt-6">
                  <Link href="/grants">Browse Grants</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
