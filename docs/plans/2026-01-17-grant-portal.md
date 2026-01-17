# Grant Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the grant discovery portal with listing, filtering, search, and detail views.

**Architecture:** Server-side rendered grant listing with client-side filtering. API routes handle data fetching with Supabase. Grant cards link to detail pages with application questions.

**Tech Stack:** Next.js 14 App Router, Supabase, shadcn/ui, React Server Components

---

## Task 1: Grant API Route

**Files:**
- Create: `app/api/grants/route.ts`

**Step 1: Create the grants API endpoint**

```typescript
// app/api/grants/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Parse query params
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '20');
  const search = searchParams.get('search') || '';
  const sectors = searchParams.getAll('sector');
  const stages = searchParams.getAll('stage');
  const providerTypes = searchParams.getAll('provider_type');
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  // Build query
  let query = supabase
    .from('grants')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  // Apply search filter
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,provider.ilike.%${search}%`);
  }

  // Apply sector filter (grants where sectors array overlaps with requested sectors)
  if (sectors.length > 0) {
    query = query.overlaps('sectors', sectors);
  }

  // Apply stage filter
  if (stages.length > 0) {
    query = query.overlaps('stages', stages);
  }

  // Apply provider type filter
  if (providerTypes.length > 0) {
    query = query.in('provider_type', providerTypes);
  }

  // Apply sorting
  const ascending = sortOrder === 'asc';
  query = query.order(sortBy, { ascending, nullsFirst: false });

  // Apply pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    total: count || 0,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count || 0) / perPage),
  });
}
```

**Step 2: Verify the endpoint compiles**

Run: `npm run build 2>&1 | grep -E "(error|Error|✓)"`
Expected: Build succeeds without errors

**Step 3: Commit**

```bash
git add app/api/grants/route.ts
git commit -m "feat(api): add grants listing endpoint with filters"
```

---

## Task 2: Grant Card Component

**Files:**
- Create: `components/grants/grant-card.tsx`

**Step 1: Create the GrantCard component**

```typescript
// components/grants/grant-card.tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Grant } from '@/types';

interface GrantCardProps {
  grant: Grant;
  onAddToWatchlist?: (grantId: string) => void;
  isInWatchlist?: boolean;
}

export function GrantCard({ grant, onAddToWatchlist, isInWatchlist }: GrantCardProps) {
  const formatAmount = (amount: number | null) => {
    if (!amount) return null;
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return 'Rolling';
    const date = new Date(deadline);
    const now = new Date();
    const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return 'Expired';
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) return `${daysUntil} days left`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const providerTypeColors: Record<string, string> = {
    government: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    csr: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    private: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    ngo: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <Badge className={providerTypeColors[grant.provider_type] || ''} variant="secondary">
            {grant.provider_type.charAt(0).toUpperCase() + grant.provider_type.slice(1)}
          </Badge>
          {grant.deadline && (
            <span className="text-xs text-muted-foreground">
              {formatDeadline(grant.deadline)}
            </span>
          )}
        </div>
        <CardTitle className="text-lg line-clamp-2 mt-2">
          <Link href={`/grants/${grant.id}`} className="hover:text-primary transition-colors">
            {grant.name}
          </Link>
        </CardTitle>
        <CardDescription className="line-clamp-1">
          {grant.provider}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {grant.description}
        </p>

        {/* Amount Range */}
        <div className="mb-3">
          <span className="text-lg font-semibold text-primary">
            {grant.amount_min && grant.amount_max ? (
              `${formatAmount(grant.amount_min)} - ${formatAmount(grant.amount_max)}`
            ) : grant.amount_max ? (
              `Up to ${formatAmount(grant.amount_max)}`
            ) : (
              'Amount varies'
            )}
          </span>
        </div>

        {/* Sectors */}
        {grant.sectors.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {grant.sectors.slice(0, 3).map((sector) => (
              <Badge key={sector} variant="outline" className="text-xs">
                {sector.replace('_', ' ')}
              </Badge>
            ))}
            {grant.sectors.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{grant.sectors.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <Button asChild className="flex-1">
            <Link href={`/grants/${grant.id}`}>View Details</Link>
          </Button>
          {onAddToWatchlist && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => onAddToWatchlist(grant.id)}
              className={isInWatchlist ? 'text-red-500' : ''}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill={isInWatchlist ? 'currentColor' : 'none'}
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
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Verify component compiles**

Run: `npm run build 2>&1 | grep -E "(error|Error|✓)"`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add components/grants/grant-card.tsx
git commit -m "feat(ui): add GrantCard component"
```

---

## Task 3: Grant Filter Component

**Files:**
- Create: `components/grants/grant-filter.tsx`

**Step 1: Create the GrantFilter component**

```typescript
// components/grants/grant-filter.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';

const SECTORS = [
  { value: 'technology', label: 'Technology' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthtech', label: 'Healthcare' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'edtech', label: 'Education' },
  { value: 'education', label: 'Education' },
  { value: 'agriculture', label: 'Agriculture' },
  { value: 'cleantech', label: 'CleanTech' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'social_impact', label: 'Social Impact' },
];

const STAGES = [
  { value: 'idea', label: 'Idea Stage' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'mvp', label: 'MVP' },
  { value: 'early_revenue', label: 'Early Revenue' },
  { value: 'growth', label: 'Growth' },
  { value: 'scaling', label: 'Scaling' },
];

const PROVIDER_TYPES = [
  { value: 'government', label: 'Government' },
  { value: 'csr', label: 'CSR / Corporate' },
  { value: 'private', label: 'Private' },
  { value: 'ngo', label: 'NGO' },
];

export function GrantFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const currentSectors = searchParams.getAll('sector');
  const currentStages = searchParams.getAll('stage');
  const currentProviderTypes = searchParams.getAll('provider_type');
  const currentSearch = searchParams.get('search') || '';

  const createQueryString = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        params.delete(key);
        if (value === null) return;
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.set(key, value);
        }
      });

      // Reset to page 1 when filters change
      params.set('page', '1');

      return params.toString();
    },
    [searchParams]
  );

  const handleSearchChange = (search: string) => {
    router.push(`/grants?${createQueryString({ search: search || null })}`);
  };

  const handleFilterChange = (
    type: 'sector' | 'stage' | 'provider_type',
    value: string,
    checked: boolean
  ) => {
    const current =
      type === 'sector'
        ? currentSectors
        : type === 'stage'
        ? currentStages
        : currentProviderTypes;

    const updated = checked
      ? [...current, value]
      : current.filter((v) => v !== value);

    router.push(`/grants?${createQueryString({ [type]: updated.length ? updated : null })}`);
  };

  const clearFilters = () => {
    router.push('/grants');
    setIsOpen(false);
  };

  const activeFilterCount =
    currentSectors.length + currentStages.length + currentProviderTypes.length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Sectors */}
      <div>
        <Label className="text-sm font-medium">Sector</Label>
        <div className="mt-2 space-y-2">
          {SECTORS.map((sector) => (
            <div key={sector.value} className="flex items-center space-x-2">
              <Checkbox
                id={`sector-${sector.value}`}
                checked={currentSectors.includes(sector.value)}
                onCheckedChange={(checked) =>
                  handleFilterChange('sector', sector.value, checked === true)
                }
              />
              <label
                htmlFor={`sector-${sector.value}`}
                className="text-sm cursor-pointer"
              >
                {sector.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Stages */}
      <div>
        <Label className="text-sm font-medium">Stage</Label>
        <div className="mt-2 space-y-2">
          {STAGES.map((stage) => (
            <div key={stage.value} className="flex items-center space-x-2">
              <Checkbox
                id={`stage-${stage.value}`}
                checked={currentStages.includes(stage.value)}
                onCheckedChange={(checked) =>
                  handleFilterChange('stage', stage.value, checked === true)
                }
              />
              <label
                htmlFor={`stage-${stage.value}`}
                className="text-sm cursor-pointer"
              >
                {stage.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Provider Type */}
      <div>
        <Label className="text-sm font-medium">Grant Type</Label>
        <div className="mt-2 space-y-2">
          {PROVIDER_TYPES.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type.value}`}
                checked={currentProviderTypes.includes(type.value)}
                onCheckedChange={(checked) =>
                  handleFilterChange('provider_type', type.value, checked === true)
                }
              />
              <label
                htmlFor={`type-${type.value}`}
                className="text-sm cursor-pointer"
              >
                {type.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <>
          <Separator />
          <Button variant="outline" onClick={clearFilters} className="w-full">
            Clear All Filters
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search Input */}
      <div className="flex-1">
        <Input
          placeholder="Search grants..."
          defaultValue={currentSearch}
          onChange={(e) => {
            // Debounce search
            const value = e.target.value;
            const timeout = setTimeout(() => handleSearchChange(value), 300);
            return () => clearTimeout(timeout);
          }}
          className="w-full"
        />
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Filter Grants</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar Filter (rendered in parent) */}
    </div>
  );
}

// Export FilterContent for desktop sidebar use
export function GrantFilterSidebar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSectors = searchParams.getAll('sector');
  const currentStages = searchParams.getAll('stage');
  const currentProviderTypes = searchParams.getAll('provider_type');

  const createQueryString = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        params.delete(key);
        if (value === null) return;
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.set(key, value);
        }
      });
      params.set('page', '1');
      return params.toString();
    },
    [searchParams]
  );

  const handleFilterChange = (
    type: 'sector' | 'stage' | 'provider_type',
    value: string,
    checked: boolean
  ) => {
    const current =
      type === 'sector'
        ? currentSectors
        : type === 'stage'
        ? currentStages
        : currentProviderTypes;

    const updated = checked
      ? [...current, value]
      : current.filter((v) => v !== value);

    router.push(`/grants?${createQueryString({ [type]: updated.length ? updated : null })}`);
  };

  const clearFilters = () => {
    router.push('/grants');
  };

  const activeFilterCount =
    currentSectors.length + currentStages.length + currentProviderTypes.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        )}
      </div>

      {/* Sectors */}
      <div>
        <Label className="text-sm font-medium">Sector</Label>
        <div className="mt-2 space-y-2">
          {SECTORS.map((sector) => (
            <div key={sector.value} className="flex items-center space-x-2">
              <Checkbox
                id={`desktop-sector-${sector.value}`}
                checked={currentSectors.includes(sector.value)}
                onCheckedChange={(checked) =>
                  handleFilterChange('sector', sector.value, checked === true)
                }
              />
              <label
                htmlFor={`desktop-sector-${sector.value}`}
                className="text-sm cursor-pointer"
              >
                {sector.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Stages */}
      <div>
        <Label className="text-sm font-medium">Stage</Label>
        <div className="mt-2 space-y-2">
          {STAGES.map((stage) => (
            <div key={stage.value} className="flex items-center space-x-2">
              <Checkbox
                id={`desktop-stage-${stage.value}`}
                checked={currentStages.includes(stage.value)}
                onCheckedChange={(checked) =>
                  handleFilterChange('stage', stage.value, checked === true)
                }
              />
              <label
                htmlFor={`desktop-stage-${stage.value}`}
                className="text-sm cursor-pointer"
              >
                {stage.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Provider Type */}
      <div>
        <Label className="text-sm font-medium">Grant Type</Label>
        <div className="mt-2 space-y-2">
          {PROVIDER_TYPES.map((type) => (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={`desktop-type-${type.value}`}
                checked={currentProviderTypes.includes(type.value)}
                onCheckedChange={(checked) =>
                  handleFilterChange('provider_type', type.value, checked === true)
                }
              />
              <label
                htmlFor={`desktop-type-${type.value}`}
                className="text-sm cursor-pointer"
              >
                {type.label}
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify component compiles**

Run: `npm run build 2>&1 | grep -E "(error|Error|✓)"`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add components/grants/grant-filter.tsx
git commit -m "feat(ui): add GrantFilter and GrantFilterSidebar components"
```

---

## Task 4: Grants Listing Page

**Files:**
- Modify: `app/(dashboard)/grants/page.tsx`

**Step 1: Create the grants listing page**

```typescript
// app/(dashboard)/grants/page.tsx
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { GrantCard } from '@/components/grants/grant-card';
import { GrantFilter, GrantFilterSidebar } from '@/components/grants/grant-filter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    sector?: string | string[];
    stage?: string | string[];
    provider_type?: string | string[];
    sort_by?: string;
    sort_order?: string;
  }>;
}

async function GrantsGrid({ searchParams }: { searchParams: PageProps['searchParams'] }) {
  const params = await searchParams;
  const supabase = await createClient();

  const page = parseInt(params.page || '1');
  const perPage = 20;
  const search = params.search || '';
  const sectors = Array.isArray(params.sector) ? params.sector : params.sector ? [params.sector] : [];
  const stages = Array.isArray(params.stage) ? params.stage : params.stage ? [params.stage] : [];
  const providerTypes = Array.isArray(params.provider_type)
    ? params.provider_type
    : params.provider_type
    ? [params.provider_type]
    : [];
  const sortBy = params.sort_by || 'created_at';
  const sortOrder = params.sort_order || 'desc';

  // Build query
  let query = supabase
    .from('grants')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,provider.ilike.%${search}%`);
  }

  if (sectors.length > 0) {
    query = query.overlaps('sectors', sectors);
  }

  if (stages.length > 0) {
    query = query.overlaps('stages', stages);
  }

  if (providerTypes.length > 0) {
    query = query.in('provider_type', providerTypes);
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc', nullsFirst: false });

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data: grants, count } = await query;
  const totalPages = Math.ceil((count || 0) / perPage);

  if (!grants || grants.length === 0) {
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
        <h3 className="mt-4 text-lg font-medium">No grants found</h3>
        <p className="mt-2 text-muted-foreground">
          Try adjusting your filters or search terms.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {grants.map((grant) => (
          <GrantCard key={grant.id} grant={grant} />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            asChild={page > 1}
          >
            {page > 1 ? (
              <Link
                href={`/grants?${new URLSearchParams({
                  ...(search && { search }),
                  ...Object.fromEntries(sectors.map((s) => ['sector', s])),
                  ...Object.fromEntries(stages.map((s) => ['stage', s])),
                  ...Object.fromEntries(providerTypes.map((t) => ['provider_type', t])),
                  page: String(page - 1),
                }).toString()}`}
              >
                Previous
              </Link>
            ) : (
              'Previous'
            )}
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            asChild={page < totalPages}
          >
            {page < totalPages ? (
              <Link
                href={`/grants?${new URLSearchParams({
                  ...(search && { search }),
                  ...Object.fromEntries(sectors.map((s) => ['sector', s])),
                  ...Object.fromEntries(stages.map((s) => ['stage', s])),
                  ...Object.fromEntries(providerTypes.map((t) => ['provider_type', t])),
                  page: String(page + 1),
                }).toString()}`}
              >
                Next
              </Link>
            ) : (
              'Next'
            )}
          </Button>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-muted-foreground text-center mt-4">
        Showing {grants.length} of {count} grants
      </p>
    </>
  );
}

function GrantsGridSkeleton() {
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

export default async function GrantsPage({ searchParams }: PageProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Discover Grants</h1>
        <p className="text-muted-foreground">
          Browse and filter grants that match your startup profile.
        </p>
      </div>

      {/* Search and Mobile Filters */}
      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <GrantFilter />
      </Suspense>

      {/* Main Content */}
      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 border rounded-lg p-4">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <GrantFilterSidebar />
            </Suspense>
          </div>
        </aside>

        {/* Grants Grid */}
        <div className="flex-1">
          <Suspense fallback={<GrantsGridSkeleton />}>
            <GrantsGrid searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify page compiles and renders**

Run: `npm run build 2>&1 | grep -E "(error|Error|✓|/grants)"`
Expected: Build succeeds, `/grants` route listed

**Step 3: Commit**

```bash
git add app/\(dashboard\)/grants/page.tsx
git commit -m "feat(page): add grants listing page with filters and pagination"
```

---

## Task 5: Grant Detail Page

**Files:**
- Create: `app/(dashboard)/grants/[id]/page.tsx`

**Step 1: Create the grant detail page**

```typescript
// app/(dashboard)/grants/[id]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Grant, ApplicationQuestion } from '@/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GrantDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: grant, error } = await supabase
    .from('grants')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !grant) {
    notFound();
  }

  const formatAmount = (amount: number | null) => {
    if (!amount) return null;
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Crore`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} Lakhs`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return 'Rolling (No fixed deadline)';
    return new Date(deadline).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const providerTypeColors: Record<string, string> = {
    government: 'bg-blue-100 text-blue-800',
    csr: 'bg-green-100 text-green-800',
    private: 'bg-purple-100 text-purple-800',
    ngo: 'bg-orange-100 text-orange-800',
  };

  const eligibility = grant.eligibility_criteria as Grant['eligibility_criteria'];
  const questions = grant.application_questions as ApplicationQuestion[];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Link */}
      <Link
        href="/grants"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Grants
      </Link>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={providerTypeColors[grant.provider_type]} variant="secondary">
            {grant.provider_type.charAt(0).toUpperCase() + grant.provider_type.slice(1)}
          </Badge>
          {grant.deadline && (
            <Badge variant="outline">
              Deadline: {new Date(grant.deadline).toLocaleDateString('en-IN')}
            </Badge>
          )}
        </div>

        <h1 className="text-3xl font-bold">{grant.name}</h1>
        <p className="text-lg text-muted-foreground">{grant.provider}</p>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Funding Amount</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-primary">
              {grant.amount_min && grant.amount_max
                ? `${formatAmount(grant.amount_min)} - ${formatAmount(grant.amount_max)}`
                : grant.amount_max
                ? `Up to ${formatAmount(grant.amount_max)}`
                : 'Contact for details'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Application Deadline</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {grant.deadline
                ? new Date(grant.deadline).toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Rolling'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Eligible Stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {grant.stages.length > 0
                ? grant.stages.map((stage: string) => (
                    <Badge key={stage} variant="outline" className="text-xs">
                      {stage.replace('_', ' ')}
                    </Badge>
                  ))
                : 'All stages'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>About this Grant</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{grant.description}</p>
        </CardContent>
      </Card>

      {/* Sectors */}
      {grant.sectors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eligible Sectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {grant.sectors.map((sector: string) => (
                <Badge key={sector} variant="secondary">
                  {sector.replace('_', ' ').charAt(0).toUpperCase() +
                    sector.replace('_', ' ').slice(1)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eligibility Criteria */}
      {Object.keys(eligibility).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eligibility Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {eligibility.incorporation_required && (
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Must be incorporated
                </li>
              )}
              {eligibility.dpiit_required && (
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  DPIIT registration required
                </li>
              )}
              {eligibility.max_age_months && (
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Company age: Max {eligibility.max_age_months} months
                </li>
              )}
              {eligibility.women_led && (
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Women-led startup only
                </li>
              )}
              {eligibility.states && eligibility.states.length > 0 && (
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-orange-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    Location: {eligibility.states.join(', ')}
                  </span>
                </li>
              )}
              {eligibility.entity_types && eligibility.entity_types.length > 0 && (
                <li className="flex items-start gap-2">
                  <svg className="h-4 w-4 text-purple-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>
                    Entity types: {eligibility.entity_types.join(', ')}
                  </span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Application Questions */}
      {questions && questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Application Questions</CardTitle>
            <CardDescription>
              These are the questions you&apos;ll need to answer. Our AI can help generate answers based on your knowledge base.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {questions.map((q, index) => (
                <li key={q.id} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium">{q.question}</p>
                    {q.max_length && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Max {q.max_length} characters
                        {q.required && ' • Required'}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild size="lg" className="flex-1">
          <Link href={`/applications/${grant.id}`}>
            Start Application
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="ml-2 h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </Button>

        {grant.url && (
          <Button asChild variant="outline" size="lg">
            <a href={grant.url} target="_blank" rel="noopener noreferrer">
              Visit Official Website
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="ml-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </Button>
        )}
      </div>

      {/* Contact */}
      {grant.contact_email && (
        <p className="text-sm text-muted-foreground text-center">
          Questions? Contact:{' '}
          <a href={`mailto:${grant.contact_email}`} className="text-primary hover:underline">
            {grant.contact_email}
          </a>
        </p>
      )}
    </div>
  );
}
```

**Step 2: Verify page compiles**

Run: `npm run build 2>&1 | grep -E "(error|Error|✓|/grants)"`
Expected: Build succeeds, `/grants/[id]` route listed

**Step 3: Commit**

```bash
git add app/\(dashboard\)/grants/\[id\]/page.tsx
git commit -m "feat(page): add grant detail page with eligibility and questions"
```

---

## Task 6: Component Index Files

**Files:**
- Create: `components/grants/index.ts`

**Step 1: Create component index for clean imports**

```typescript
// components/grants/index.ts
export { GrantCard } from './grant-card';
export { GrantFilter, GrantFilterSidebar } from './grant-filter';
```

**Step 2: Commit**

```bash
git add components/grants/index.ts
git commit -m "chore: add component index file for grants"
```

---

## Task 7: Final Build Verification

**Step 1: Run full build**

Run: `npm run build`
Expected: All routes compile successfully

**Step 2: Verify routes**

Expected routes:
- `○ /grants` - Static grants listing
- `ƒ /grants/[id]` - Dynamic grant detail

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete Grant Portal phase (listing, filtering, detail pages)"
```

---

## Summary

This plan implements the Grant Portal with:

1. **API Route** - Paginated grants endpoint with filtering
2. **GrantCard** - Reusable card component showing grant summary
3. **GrantFilter** - Mobile-responsive filter sidebar with sectors, stages, provider types
4. **Grants Listing Page** - Server-rendered grid with pagination
5. **Grant Detail Page** - Full grant info with eligibility, questions, and CTA

**Testing approach**: Build verification after each task. Manual testing with seeded data.

**Next phase**: Knowledge Base (file upload, document processing, embeddings)
