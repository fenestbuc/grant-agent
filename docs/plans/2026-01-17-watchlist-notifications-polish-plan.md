# Watchlist, Notifications & UX Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete Grant Agent's feature set with watchlist, notifications, weekly digest, and UX polish for production readiness.

**Architecture:** API routes for watchlist/notifications CRUD, Inngest cron jobs for deadline reminders and weekly digest, React components for UI (modal, bell dropdown, pages), ThemeProvider for dark mode.

**Tech Stack:** Next.js 14 App Router, Supabase, Inngest, Resend, next-themes, shadcn/ui

---

## Task 1: Watchlist API Routes

**Files:**
- Create: `app/api/watchlist/route.ts`
- Create: `app/api/watchlist/[id]/route.ts`

**Step 1: Create list and add endpoints**

```typescript
// app/api/watchlist/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile' }, { status: 400 });
    }

    // Build query with optional filters
    let query = supabase
      .from('watchlist')
      .select(`
        *,
        grants (id, name, provider, provider_type, deadline, amount_max, sectors)
      `)
      .eq('startup_id', startup.id);

    // Filter by deadline (upcoming = next 30 days)
    const deadlineFilter = searchParams.get('deadline');
    if (deadlineFilter === 'upcoming') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      query = query.lte('grants.deadline', thirtyDaysFromNow.toISOString());
    }

    const { data: watchlist, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: watchlist });
  } catch (error) {
    console.error('Watchlist list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile' }, { status: 400 });
    }

    const { grant_id, notify_deadline = true, notify_changes = true } = await request.json();

    if (!grant_id) {
      return NextResponse.json({ error: 'grant_id required' }, { status: 400 });
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from('watchlist')
      .select('id')
      .eq('startup_id', startup.id)
      .eq('grant_id', grant_id)
      .single();

    if (existing) {
      return NextResponse.json({ data: existing, message: 'Already in watchlist' });
    }

    const { data: watchlistItem, error } = await supabase
      .from('watchlist')
      .insert({
        startup_id: startup.id,
        grant_id,
        notify_deadline,
        notify_changes,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: watchlistItem });
  } catch (error) {
    console.error('Watchlist add error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Create update and delete endpoints**

```typescript
// app/api/watchlist/[id]/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile' }, { status: 400 });
    }

    const updates = await request.json();

    // Only allow updating notification preferences
    const allowedUpdates: Record<string, boolean> = {};
    if (typeof updates.notify_deadline === 'boolean') {
      allowedUpdates.notify_deadline = updates.notify_deadline;
    }
    if (typeof updates.notify_changes === 'boolean') {
      allowedUpdates.notify_changes = updates.notify_changes;
    }

    const { data: watchlistItem, error } = await supabase
      .from('watchlist')
      .update(allowedUpdates)
      .eq('id', id)
      .eq('startup_id', startup.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: watchlistItem });
  } catch (error) {
    console.error('Watchlist update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile' }, { status: 400 });
    }

    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('id', id)
      .eq('startup_id', startup.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { deleted: true, id } });
  } catch (error) {
    console.error('Watchlist delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add app/api/watchlist/
git commit -m "feat(api): add watchlist CRUD endpoints"
```

---

## Task 2: Watchlist Check API (for UI state)

**Files:**
- Create: `app/api/watchlist/check/[grantId]/route.ts`

**Step 1: Create endpoint to check if grant is in watchlist**

```typescript
// app/api/watchlist/check/[grantId]/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ grantId: string }> }
): Promise<NextResponse> {
  try {
    const { grantId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ data: { inWatchlist: false, watchlistId: null } });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ data: { inWatchlist: false, watchlistId: null } });
    }

    const { data: watchlistItem } = await supabase
      .from('watchlist')
      .select('id, notify_deadline, notify_changes')
      .eq('startup_id', startup.id)
      .eq('grant_id', grantId)
      .single();

    return NextResponse.json({
      data: {
        inWatchlist: !!watchlistItem,
        watchlistId: watchlistItem?.id || null,
        notify_deadline: watchlistItem?.notify_deadline ?? true,
        notify_changes: watchlistItem?.notify_changes ?? true,
      },
    });
  } catch (error) {
    console.error('Watchlist check error:', error);
    return NextResponse.json({ data: { inWatchlist: false, watchlistId: null } });
  }
}
```

**Step 2: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add app/api/watchlist/check/
git commit -m "feat(api): add watchlist check endpoint for grant status"
```

---

## Task 3: Watchlist Save Modal Component

**Files:**
- Create: `components/watchlist/save-to-watchlist-modal.tsx`
- Create: `components/watchlist/index.ts`

**Step 1: Create the modal component**

```typescript
// components/watchlist/save-to-watchlist-modal.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SaveToWatchlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grantId: string;
  grantName: string;
  onSaved: () => void;
}

export function SaveToWatchlistModal({
  open,
  onOpenChange,
  grantId,
  grantName,
  onSaved,
}: SaveToWatchlistModalProps) {
  const [notifyDeadline, setNotifyDeadline] = useState(true);
  const [notifyChanges, setNotifyChanges] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_id: grantId,
          notify_deadline: notifyDeadline,
          notify_changes: notifyChanges,
        }),
      });

      if (response.ok) {
        onSaved();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save to Watchlist</DialogTitle>
          <DialogDescription>
            Save &quot;{grantName}&quot; and configure notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="notify-deadline"
              checked={notifyDeadline}
              onCheckedChange={(checked) => setNotifyDeadline(checked === true)}
            />
            <Label htmlFor="notify-deadline" className="cursor-pointer">
              Notify me about deadline (7 days and 1 day before)
            </Label>
          </div>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="notify-changes"
              checked={notifyChanges}
              onCheckedChange={(checked) => setNotifyChanges(checked === true)}
            />
            <Label htmlFor="notify-changes" className="cursor-pointer">
              Notify me when this grant is updated
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save to Watchlist'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Create index file**

```typescript
// components/watchlist/index.ts
export { SaveToWatchlistModal } from './save-to-watchlist-modal';
```

**Step 3: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add components/watchlist/
git commit -m "feat(ui): add SaveToWatchlistModal component"
```

---

## Task 4: Watchlist Button Component

**Files:**
- Create: `components/watchlist/watchlist-button.tsx`
- Modify: `components/watchlist/index.ts`

**Step 1: Create reusable watchlist button**

```typescript
// components/watchlist/watchlist-button.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SaveToWatchlistModal } from './save-to-watchlist-modal';
import { cn } from '@/lib/utils';

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
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistId, setWatchlistId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [grantId]);

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
        setWatchlistId(result.data.watchlistId);
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
```

**Step 2: Update index file**

```typescript
// components/watchlist/index.ts
export { SaveToWatchlistModal } from './save-to-watchlist-modal';
export { WatchlistButton } from './watchlist-button';
```

**Step 3: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add components/watchlist/
git commit -m "feat(ui): add WatchlistButton component with save/remove"
```

---

## Task 5: Add Watchlist Button to Grant Card

**Files:**
- Modify: `components/grants/grant-card.tsx`

**Step 1: Read current grant-card.tsx**

Read the file first to understand the structure.

**Step 2: Add WatchlistButton to grant card**

Add import at top:
```typescript
import { WatchlistButton } from '@/components/watchlist';
```

Add the button in the card header area (next to badges or in top-right corner).

**Step 3: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add components/grants/grant-card.tsx
git commit -m "feat(ui): add watchlist button to grant cards"
```

---

## Task 6: Add Watchlist Button to Grant Detail Page

**Files:**
- Modify: `app/(dashboard)/grants/[id]/page.tsx`

**Step 1: Add WatchlistButton to grant detail**

Add import at top:
```typescript
import { WatchlistButton } from '@/components/watchlist';
```

Add button in the actions section near "Start Application" button.

**Step 2: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add app/\(dashboard\)/grants/\[id\]/page.tsx
git commit -m "feat(ui): add watchlist button to grant detail page"
```

---

## Task 7: Watchlist Page

**Files:**
- Create: `app/(dashboard)/watchlist/page.tsx`

**Step 1: Create the watchlist page**

```typescript
// app/(dashboard)/watchlist/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

interface WatchlistWithGrant extends Watchlist {
  grants: Pick<Grant, 'id' | 'name' | 'provider' | 'provider_type' | 'deadline' | 'amount_max' | 'sectors'>;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistWithGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');

  const fetchWatchlist = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (deadlineFilter !== 'all') {
        params.set('deadline', deadlineFilter);
      }
      const response = await fetch(`/api/watchlist?${params}`);
      const result = await response.json();
      if (response.ok) {
        setWatchlist(result.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [deadlineFilter]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const handleToggleNotification = async (
    id: string,
    field: 'notify_deadline' | 'notify_changes',
    value: boolean
  ) => {
    await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });

    setWatchlist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleRemove = async (id: string) => {
    const response = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' });
    if (response.ok) {
      setWatchlist((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const formatAmount = (amount: number | null) => {
    if (!amount) return null;
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getDaysUntilDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const days = Math.ceil(
      (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
          <p className="text-muted-foreground">
            {watchlist.length} saved grant{watchlist.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grants</SelectItem>
            <SelectItem value="upcoming">Upcoming Deadlines</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Watchlist */}
      {watchlist.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-muted-foreground mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <h3 className="text-lg font-medium">No grants saved</h3>
            <p className="text-muted-foreground mt-1 mb-4">
              Save grants to track deadlines and get notifications.
            </p>
            <Button asChild>
              <Link href="/grants">Browse Grants</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {watchlist.map((item) => {
            const daysUntil = getDaysUntilDeadline(item.grants.deadline);
            const isUrgent = daysUntil !== null && daysUntil <= 7 && daysUntil > 0;
            const isPast = daysUntil !== null && daysUntil < 0;

            return (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        <Link
                          href={`/grants/${item.grants.id}`}
                          className="hover:underline"
                        >
                          {item.grants.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>{item.grants.provider}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.grants.deadline && (
                        <Badge
                          variant={isPast ? 'destructive' : isUrgent ? 'default' : 'secondary'}
                        >
                          {isPast
                            ? 'Deadline passed'
                            : isUrgent
                            ? `${daysUntil} days left`
                            : new Date(item.grants.deadline).toLocaleDateString('en-IN')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4">
                    {/* Grant info */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {item.grants.amount_max && (
                        <span>Up to {formatAmount(item.grants.amount_max)}</span>
                      )}
                      <Badge variant="outline">{item.grants.provider_type}</Badge>
                    </div>

                    {/* Notification toggles */}
                    <div className="flex flex-wrap items-center gap-6 pt-2 border-t">
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

                      <div className="flex-1" />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        Remove
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/grants/${item.grants.id}`}>View Grant</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add Switch component if missing**

Run: `npx shadcn@latest add switch -y`

**Step 3: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add app/\(dashboard\)/watchlist/page.tsx components/ui/switch.tsx
git commit -m "feat(page): add Watchlist page with filters and notification toggles"
```

---

## Task 8: Notifications API Routes

**Files:**
- Create: `app/api/notifications/route.ts`
- Create: `app/api/notifications/[id]/route.ts`
- Create: `app/api/notifications/mark-all-read/route.ts`

**Step 1: Create list endpoint**

```typescript
// app/api/notifications/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile' }, { status: 400 });
    }

    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('startup_id', startup.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    const { data: notifications, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('startup_id', startup.id)
      .eq('is_read', false);

    return NextResponse.json({
      data: notifications,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Notifications list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 2: Create mark as read endpoint**

```typescript
// app/api/notifications/[id]/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile' }, { status: 400 });
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('startup_id', startup.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: notification });
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 3: Create mark all as read endpoint**

```typescript
// app/api/notifications/mark-all-read/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: startup } = await supabase
      .from('startups')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!startup) {
      return NextResponse.json({ error: 'No startup profile' }, { status: 400 });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('startup_id', startup.id)
      .eq('is_read', false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Step 4: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add app/api/notifications/
git commit -m "feat(api): add notifications endpoints"
```

---

## Task 9: Notification Bell Component

**Files:**
- Create: `components/notifications/notification-bell.tsx`
- Create: `components/notifications/index.ts`

**Step 1: Create the bell dropdown component**

```typescript
// components/notifications/notification-bell.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Notification } from '@/types';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const response = await fetch('/api/notifications?limit=5');
        const result = await response.json();
        if (response.ok) {
          setNotifications(result.data || []);
          setUnreadCount(result.unreadCount || 0);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    }

    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const formatTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deadline_reminder':
        return '⏰';
      case 'new_grant':
        return '✨';
      case 'grant_update':
        return '📝';
      default:
        return '🔔';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <>
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onClick={() => {
                  if (!notification.is_read) {
                    handleMarkRead(notification.id);
                  }
                  if (notification.grant_id) {
                    window.location.href = `/grants/${notification.grant_id}`;
                  }
                  setOpen(false);
                }}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg">{getTypeIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground pl-7">
                  {formatTimeAgo(notification.created_at)}
                </span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/notifications"
                className="w-full text-center text-sm text-primary"
                onClick={() => setOpen(false)}
              >
                View all notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Step 2: Create index file**

```typescript
// components/notifications/index.ts
export { NotificationBell } from './notification-bell';
```

**Step 3: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add components/notifications/
git commit -m "feat(ui): add NotificationBell dropdown component"
```

---

## Task 10: Add Notification Bell to Header

**Files:**
- Modify: `components/layout/header.tsx`

**Step 1: Add NotificationBell to header**

Add import:
```typescript
import { NotificationBell } from '@/components/notifications';
```

Add the bell before the user avatar dropdown in the header.

**Step 2: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add components/layout/header.tsx
git commit -m "feat(ui): add notification bell to header"
```

---

## Task 11: Notifications Page

**Files:**
- Create: `app/(dashboard)/notifications/page.tsx`

**Step 1: Create the notifications page**

```typescript
// app/(dashboard)/notifications/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchNotifications = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter !== 'all') {
        params.set('type', filter);
      }
      const response = await fetch(`/api/notifications?${params}`);
      const result = await response.json();
      if (response.ok) {
        setNotifications(result.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    await fetch('/api/notifications/mark-all-read', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deadline_reminder':
        return '⏰';
      case 'new_grant':
        return '✨';
      case 'grant_update':
        return '📝';
      default:
        return '🔔';
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="deadline_reminder">Deadlines</TabsTrigger>
          <TabsTrigger value="new_grant">New Grants</TabsTrigger>
          <TabsTrigger value="grant_update">Updates</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-muted-foreground mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h3 className="text-lg font-medium">No notifications</h3>
            <p className="text-muted-foreground mt-1">
              {filter === 'all'
                ? "You'll be notified about deadlines and new grants."
                : 'No notifications of this type.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
              }`}
              onClick={() => {
                if (!notification.is_read) {
                  handleMarkRead(notification.id);
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getTypeIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(notification.created_at)}
                      </span>
                      {notification.grant_id && (
                        <Link
                          href={`/grants/${notification.grant_id}`}
                          className="text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Grant →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add app/\(dashboard\)/notifications/page.tsx
git commit -m "feat(page): add Notifications page with filters"
```

---

## Task 12: Deadline Reminder Cron Job

**Files:**
- Modify: `lib/inngest/functions.ts`
- Modify: `app/api/inngest/route.ts`

**Step 1: Add deadline reminder function to Inngest**

Add to `lib/inngest/functions.ts`:

```typescript
// Add this import at top
import { Resend } from 'resend';

// Add this function
export const sendDeadlineReminders = inngest.createFunction(
  { id: 'send-deadline-reminders' },
  { cron: '0 3 * * *' }, // 9am IST = 3:30am UTC, using 3am for simplicity
  async ({ step }) => {
    const supabase = createAdminClient();
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Get grants with deadlines in 7 days or 1 day
    const today = new Date();
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);
    const oneDay = new Date(today);
    oneDay.setDate(oneDay.getDate() + 1);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    // Find watchlist items with grants due in 7 or 1 days
    const { data: watchlistItems } = await step.run('fetch-due-grants', async () => {
      const { data } = await supabase
        .from('watchlist')
        .select(`
          id,
          startup_id,
          notify_deadline,
          grants (id, name, provider, deadline),
          startups (id, name, user_id)
        `)
        .eq('notify_deadline', true)
        .or(`grants.deadline.eq.${formatDate(sevenDays)},grants.deadline.eq.${formatDate(oneDay)}`);

      return data || [];
    });

    // Process each watchlist item
    for (const item of watchlistItems || []) {
      if (!item.grants || !item.startups) continue;

      const grant = item.grants as { id: string; name: string; provider: string; deadline: string };
      const startup = item.startups as { id: string; name: string; user_id: string };
      const deadline = new Date(grant.deadline);
      const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Create in-app notification
      await step.run(`create-notification-${item.id}`, async () => {
        await supabase.from('notifications').insert({
          startup_id: startup.id,
          type: 'deadline_reminder',
          title: `${grant.name} deadline in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
          message: `Don't miss the deadline for ${grant.name} by ${grant.provider}.`,
          grant_id: grant.id,
        });
      });

      // Get user email and send email
      await step.run(`send-email-${item.id}`, async () => {
        const { data: user } = await supabase.auth.admin.getUserById(startup.user_id);
        if (!user?.user?.email) return;

        await resend.emails.send({
          from: 'Grant Agent <notifications@grantagent.com>',
          to: user.user.email,
          subject: `⏰ ${grant.name} deadline in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
          html: `
            <h2>Deadline Reminder</h2>
            <p>Hi ${startup.name},</p>
            <p>This is a reminder that <strong>${grant.name}</strong> by ${grant.provider} has a deadline in <strong>${daysUntil} day${daysUntil > 1 ? 's' : ''}</strong>.</p>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/grants/${grant.id}">View Grant Details</a></p>
            <p>Good luck with your application!</p>
            <p>— Grant Agent</p>
          `,
        });
      });
    }

    return { processed: watchlistItems?.length || 0 };
  }
);
```

**Step 2: Export the function in the Inngest route**

Update `app/api/inngest/route.ts` to include the new function.

**Step 3: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add lib/inngest/functions.ts app/api/inngest/route.ts
git commit -m "feat(cron): add deadline reminder job with email notifications"
```

---

## Task 13: Weekly Digest Cron Job

**Files:**
- Modify: `lib/inngest/functions.ts`
- Modify: `app/api/inngest/route.ts`

**Step 1: Add weekly digest function**

Add to `lib/inngest/functions.ts`:

```typescript
export const sendWeeklyDigest = inngest.createFunction(
  { id: 'send-weekly-digest' },
  { cron: '0 3 * * 1' }, // Every Monday at 9am IST (3:30am UTC)
  async ({ step }) => {
    const supabase = createAdminClient();
    const resend = new Resend(process.env.RESEND_API_KEY);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    // Get all startups
    const { data: startups } = await step.run('fetch-startups', async () => {
      const { data } = await supabase
        .from('startups')
        .select('id, name, sector, stage, user_id');
      return data || [];
    });

    let emailsSent = 0;

    for (const startup of startups || []) {
      // Get new grants matching their sector/stage from last week
      const { data: newGrants } = await step.run(`fetch-new-grants-${startup.id}`, async () => {
        const { data } = await supabase
          .from('grants')
          .select('id, name, provider, deadline, amount_max')
          .gte('created_at', oneWeekAgo.toISOString())
          .eq('is_active', true)
          .or(`sectors.cs.{${startup.sector}},stages.cs.{${startup.stage}}`);
        return data || [];
      });

      // Get watchlisted grants with upcoming deadlines (next 14 days)
      const { data: upcomingDeadlines } = await step.run(`fetch-deadlines-${startup.id}`, async () => {
        const { data } = await supabase
          .from('watchlist')
          .select(`
            grants (id, name, provider, deadline)
          `)
          .eq('startup_id', startup.id)
          .lte('grants.deadline', twoWeeksFromNow.toISOString())
          .gte('grants.deadline', new Date().toISOString());
        return data?.map((w) => w.grants).filter(Boolean) || [];
      });

      // Skip if no content
      if (newGrants.length === 0 && upcomingDeadlines.length === 0) {
        continue;
      }

      // Get user email
      const { data: user } = await supabase.auth.admin.getUserById(startup.user_id);
      if (!user?.user?.email) continue;

      // Build email HTML
      const newGrantsHtml = newGrants.length > 0 ? `
        <h3>🆕 New Grants This Week</h3>
        <ul>
          ${newGrants.map((g) => `
            <li>
              <strong><a href="${process.env.NEXT_PUBLIC_SITE_URL}/grants/${g.id}">${g.name}</a></strong>
              by ${g.provider}
              ${g.deadline ? ` — Deadline: ${new Date(g.deadline).toLocaleDateString('en-IN')}` : ''}
            </li>
          `).join('')}
        </ul>
      ` : '';

      const deadlinesHtml = upcomingDeadlines.length > 0 ? `
        <h3>⏰ Upcoming Deadlines</h3>
        <ul>
          ${upcomingDeadlines.map((g: { id: string; name: string; provider: string; deadline: string }) => `
            <li>
              <strong><a href="${process.env.NEXT_PUBLIC_SITE_URL}/grants/${g.id}">${g.name}</a></strong>
              — ${new Date(g.deadline).toLocaleDateString('en-IN')}
            </li>
          `).join('')}
        </ul>
      ` : '';

      // Send email
      await step.run(`send-digest-${startup.id}`, async () => {
        await resend.emails.send({
          from: 'Grant Agent <digest@grantagent.com>',
          to: user.user!.email!,
          subject: `📬 Your Weekly Grant Digest`,
          html: `
            <h2>Hi ${startup.name}!</h2>
            <p>Here's your weekly summary of grants and deadlines.</p>
            ${newGrantsHtml}
            ${deadlinesHtml}
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/grants">Browse All Grants</a></p>
            <p>— Grant Agent</p>
          `,
        });
        emailsSent++;
      });
    }

    return { emailsSent };
  }
);
```

**Step 2: Update Inngest route exports**

**Step 3: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add lib/inngest/functions.ts app/api/inngest/route.ts
git commit -m "feat(cron): add weekly digest email job"
```

---

## Task 14: Error Boundaries

**Files:**
- Create: `app/(dashboard)/error.tsx`
- Create: `app/error.tsx`

**Step 1: Create dashboard error boundary**

```typescript
// app/(dashboard)/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-md">
        <CardContent className="pt-6 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-12 w-12 text-muted-foreground mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            We encountered an unexpected error. Please try again.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={reset}>Try Again</Button>
            <Button variant="outline" asChild>
              <a href="/">Go Home</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create global error boundary**

```typescript
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">
              We encountered an unexpected error.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={reset}>Try Again</Button>
              <Button variant="outline" asChild>
                <a href="/">Go Home</a>
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
```

**Step 3: Verify and commit**

Run: `npx tsc --noEmit`

```bash
git add app/error.tsx app/\(dashboard\)/error.tsx
git commit -m "feat(ui): add error boundaries for graceful error handling"
```

---

## Task 15: Dashboard Content

**Files:**
- Modify: `app/(dashboard)/page.tsx`

**Step 1: Update dashboard with useful content**

Replace the placeholder dashboard with sections for:
- Welcome message with startup name
- Upcoming deadlines (from watchlist)
- Application progress (in-progress applications)
- Recent grants matching their sector
- Quick action cards

This is a larger file - read the existing content first, then replace with the new dashboard.

**Step 2: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add app/\(dashboard\)/page.tsx
git commit -m "feat(page): update dashboard with deadlines, progress, and quick actions"
```

---

## Task 16: Dark Mode Toggle

**Files:**
- Create: `components/theme-toggle.tsx`
- Modify: `app/layout.tsx` (add ThemeProvider)
- Modify: `components/layout/header.tsx` (add toggle)

**Step 1: Create theme toggle component**

```typescript
// components/theme-toggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="h-9 w-9" />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </Button>
  );
}
```

**Step 2: Add ThemeProvider to root layout**

Update `app/layout.tsx` to wrap children with ThemeProvider from next-themes.

**Step 3: Add ThemeToggle to header**

Add import and place before NotificationBell in header.

**Step 4: Verify and commit**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add components/theme-toggle.tsx app/layout.tsx components/layout/header.tsx
git commit -m "feat(ui): add dark mode toggle with next-themes"
```

---

## Task 17: Final Verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Create final commit if needed**

```bash
git add -A
git commit -m "chore: final polish and cleanup"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Watchlist API CRUD | `app/api/watchlist/` |
| 2 | Watchlist Check API | `app/api/watchlist/check/` |
| 3 | Save Modal Component | `components/watchlist/` |
| 4 | Watchlist Button | `components/watchlist/` |
| 5 | Add to Grant Card | `components/grants/` |
| 6 | Add to Grant Detail | `app/(dashboard)/grants/[id]/` |
| 7 | Watchlist Page | `app/(dashboard)/watchlist/` |
| 8 | Notifications API | `app/api/notifications/` |
| 9 | Notification Bell | `components/notifications/` |
| 10 | Add Bell to Header | `components/layout/header.tsx` |
| 11 | Notifications Page | `app/(dashboard)/notifications/` |
| 12 | Deadline Reminders | `lib/inngest/functions.ts` |
| 13 | Weekly Digest | `lib/inngest/functions.ts` |
| 14 | Error Boundaries | `app/error.tsx`, `app/(dashboard)/error.tsx` |
| 15 | Dashboard Content | `app/(dashboard)/page.tsx` |
| 16 | Dark Mode Toggle | `components/theme-toggle.tsx` |
| 17 | Final Verification | Build & lint check |
