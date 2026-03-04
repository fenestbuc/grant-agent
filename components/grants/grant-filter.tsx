// components/grants/grant-filter.tsx
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GrantCategory, GrantStatus } from '@/types';

const CATEGORIES: GrantCategory[] = [
  'Technology',
  'Healthcare',
  'Education',
  'Environment',
  'Social Impact',
  'Research',
  'Arts & Culture',
  'Economic Development',
];

const STATUSES: GrantStatus[] = ['open', 'closing_soon', 'closed'];

interface FilterState {
  search: string;
  categories: GrantCategory[];
  statuses: GrantStatus[];
  minAmount: string;
  maxAmount: string;
  deadline: string;
}

interface GrantFilterProps {
  onFilterChange?: (filters: FilterState) => void;
}

export function GrantFilter({ onFilterChange }: GrantFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    categories: searchParams.getAll('category') as GrantCategory[],
    statuses: searchParams.getAll('status') as GrantStatus[],
    minAmount: searchParams.get('minAmount') || '',
    maxAmount: searchParams.get('maxAmount') || '',
    deadline: searchParams.get('deadline') || '',
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyFilters = useCallback(
    (currentFilters: FilterState) => {
      const params = new URLSearchParams();
      if (currentFilters.search) params.set('search', currentFilters.search);
      if (currentFilters.minAmount) params.set('minAmount', currentFilters.minAmount);
      if (currentFilters.maxAmount) params.set('maxAmount', currentFilters.maxAmount);
      if (currentFilters.deadline) params.set('deadline', currentFilters.deadline);

      // Append each category and status as separate params
      currentFilters.categories.forEach(c => params.append('category', c));
      currentFilters.statuses.forEach(s => params.append('status', s));

      router.push(`/grants?${params.toString()}`);
      onFilterChange?.(currentFilters);
    },
    [router, onFilterChange],
  );

  const handleSearchChange = (value: string) => {
    const newFilters = { ...filters, search: value };
    setFilters(newFilters);

    // Debounce search input
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      applyFilters(newFilters);
    }, 400);
  };

  const handleCategoryToggle = (category: GrantCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    const newFilters = { ...filters, categories: newCategories };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleStatusChange = (status: GrantStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    const newFilters = { ...filters, statuses: newStatuses };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleAmountChange = (field: 'minAmount' | 'maxAmount', value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      applyFilters(newFilters);
    }, 400);
  };

  const handleDeadlineChange = (value: string) => {
    const newFilters = { ...filters, deadline: value };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      search: '',
      categories: [],
      statuses: [],
      minAmount: '',
      maxAmount: '',
      deadline: '',
    };
    setFilters(resetFilters);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    router.push('/grants');
    onFilterChange?.(resetFilters);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const hasActiveFilters =
    filters.search ||
    filters.categories.length > 0 ||
    filters.statuses.length > 0 ||
    filters.minAmount ||
    filters.maxAmount ||
    filters.deadline;

  return (
    <div className="space-y-4">
      {/* Search */}
      <Input
        placeholder="Search grants..."
        value={filters.search}
        onChange={e => handleSearchChange(e.target.value)}
        className="w-full"
      />

      <div className="flex flex-wrap gap-4">
        {/* Categories */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(category => (
              <Badge
                key={category}
                variant={filters.categories.includes(category) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleCategoryToggle(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Status</p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(status => (
              <Badge
                key={status}
                variant={filters.statuses.includes(status) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => handleStatusChange(status)}
              >
                {status}
              </Badge>
            ))}
          </div>
        </div>

        {/* Amount Range */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Amount Range</p>
          <div className="flex gap-2">
            <Input
              placeholder="Min"
              value={filters.minAmount}
              onChange={e => handleAmountChange('minAmount', e.target.value)}
              className="w-24"
              type="number"
            />
            <Input
              placeholder="Max"
              value={filters.maxAmount}
              onChange={e => handleAmountChange('maxAmount', e.target.value)}
              className="w-24"
              type="number"
            />
          </div>
        </div>

        {/* Deadline */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Deadline Before</p>
          <Input
            type="date"
            value={filters.deadline}
            onChange={e => handleDeadlineChange(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={handleReset}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}
