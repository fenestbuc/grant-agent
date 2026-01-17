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

  const filterContent = (
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
              {filterContent}
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
