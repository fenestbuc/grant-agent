// app/(dashboard)/grants/page.tsx
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { GrantsGridClient } from '@/components/grants/grants-grid-client';
import { GrantFilter, GrantFilterSidebar } from '@/components/grants/grant-filter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

// Revalidate grants data every hour (grants don't change frequently)
export const revalidate = 3600;

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
      <GrantsGridClient grants={grants} />

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
