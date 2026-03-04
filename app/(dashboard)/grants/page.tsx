// app/(dashboard)/grants/page.tsx
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { GrantsClient } from '@/components/grants/grants-client';
import type { Grant } from '@/types';

interface SearchParams {
  search?: string;
  category?: string | string[];
  status?: string | string[];
  minAmount?: string;
  maxAmount?: string;
  deadline?: string;
  page?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function GrantsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Build query params for the API
  const queryParams = new URLSearchParams();

  if (params.search) queryParams.set('search', params.search);
  if (params.minAmount) queryParams.set('minAmount', params.minAmount);
  if (params.maxAmount) queryParams.set('maxAmount', params.maxAmount);
  if (params.deadline) queryParams.set('deadline', params.deadline);
  if (params.page) queryParams.set('page', params.page);

  // Handle multi-value params (category, status) correctly
  const categories = Array.isArray(params.category)
    ? params.category
    : params.category
    ? [params.category]
    : [];
  categories.forEach(c => queryParams.append('category', c));

  const statuses = Array.isArray(params.status)
    ? params.status
    : params.status
    ? [params.status]
    : [];
  statuses.forEach(s => queryParams.append('status', s));

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/grants?${queryParams.toString()}`,
    { cache: 'no-store' },
  );

  let grants: Grant[] = [];
  let totalPages = 1;
  let currentPage = 1;

  if (res.ok) {
    const data = await res.json();
    grants = data.data || [];
    totalPages = data.pagination?.totalPages || 1;
    currentPage = data.pagination?.currentPage || 1;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GrantsClient
        initialGrants={grants}
        totalPages={totalPages}
        currentPage={currentPage}
        userId={user?.id}
      />
    </Suspense>
  );
}
