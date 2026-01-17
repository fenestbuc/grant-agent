/**
 * Integration tests for /api/grants API routes
 * Tests the grants listing and single grant retrieval endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { activeGrantFixtures, governmentGrant, csrGrant, privateGrant } from '@/tests/fixtures/grants';
import type { Grant } from '@/types';

// Create mock query builder that tracks method calls and returns appropriate data
function createMockQueryBuilder(mockData: Grant[] = [], mockCount: number | null = null) {
  let filteredData = [...mockData];
  let currentFilters: {
    isActive?: boolean;
    search?: string;
    sectors?: string[];
    stages?: string[];
    providerTypes?: string[];
    sortBy?: string;
    ascending?: boolean;
    rangeFrom?: number;
    rangeTo?: number;
    eqField?: string;
    eqValue?: string;
  } = {};

  const builder = {
    select: vi.fn().mockImplementation(() => builder),
    eq: vi.fn().mockImplementation((field: string, value: unknown) => {
      if (field === 'is_active') {
        currentFilters.isActive = value as boolean;
        filteredData = filteredData.filter((g) => g.is_active === value);
      } else if (field === 'id') {
        currentFilters.eqField = field;
        currentFilters.eqValue = value as string;
        filteredData = filteredData.filter((g) => g.id === value);
      }
      return builder;
    }),
    or: vi.fn().mockImplementation((orClause: string) => {
      // Parse simple search pattern: name.ilike.%search%,description.ilike.%search%,provider.ilike.%search%
      const match = orClause.match(/name\.ilike\.%(.+?)%/);
      if (match) {
        const searchTerm = match[1].toLowerCase();
        currentFilters.search = searchTerm;
        filteredData = filteredData.filter(
          (g) =>
            g.name.toLowerCase().includes(searchTerm) ||
            g.description.toLowerCase().includes(searchTerm) ||
            g.provider.toLowerCase().includes(searchTerm)
        );
      }
      return builder;
    }),
    overlaps: vi.fn().mockImplementation((field: string, values: string[]) => {
      if (field === 'sectors') {
        currentFilters.sectors = values;
        filteredData = filteredData.filter((g) => g.sectors.some((s) => values.includes(s)));
      } else if (field === 'stages') {
        currentFilters.stages = values;
        filteredData = filteredData.filter((g) => g.stages.some((s) => values.includes(s)));
      }
      return builder;
    }),
    in: vi.fn().mockImplementation((field: string, values: string[]) => {
      if (field === 'provider_type') {
        currentFilters.providerTypes = values;
        filteredData = filteredData.filter((g) => values.includes(g.provider_type));
      }
      return builder;
    }),
    order: vi.fn().mockImplementation((field: string, options: { ascending: boolean }) => {
      currentFilters.sortBy = field;
      currentFilters.ascending = options.ascending;
      return builder;
    }),
    range: vi.fn().mockImplementation((from: number, to: number) => {
      currentFilters.rangeFrom = from;
      currentFilters.rangeTo = to;
      return builder;
    }),
    single: vi.fn().mockImplementation(() => {
      // For single() call, resolve with the first item or null
      const result = filteredData.length > 0 ? filteredData[0] : null;
      return Promise.resolve({
        data: result,
        error: result ? null : { message: 'No rows found' },
        count: null,
      });
    }),
    then: vi.fn().mockImplementation((resolve: (value: unknown) => void) => {
      // Apply pagination if range was set
      let paginatedData = filteredData;
      if (currentFilters.rangeFrom !== undefined && currentFilters.rangeTo !== undefined) {
        paginatedData = filteredData.slice(
          currentFilters.rangeFrom,
          currentFilters.rangeTo + 1
        );
      }

      return Promise.resolve(
        resolve({
          data: paginatedData,
          error: null,
          count: mockCount !== null ? mockCount : filteredData.length,
        })
      );
    }),
  };

  return builder;
}

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
};

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Import route handlers after mocking
import { GET as getGrants } from '@/app/api/grants/route';
import { GET as getGrantById } from '@/app/api/grants/[id]/route';

describe('/api/grants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/grants', () => {
    it('returns paginated grants', async () => {
      // Arrange
      const mockBuilder = createMockQueryBuilder(activeGrantFixtures, activeGrantFixtures.length);
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const request = new NextRequest('http://localhost:3000/api/grants');

      // Act
      const response = await getGrants(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('page');
      expect(data).toHaveProperty('per_page');
      expect(data).toHaveProperty('total_pages');
      expect(data.data).toHaveLength(activeGrantFixtures.length);
      expect(data.page).toBe(1);
      expect(data.per_page).toBe(20);
      expect(data.total).toBe(activeGrantFixtures.length);

      // Verify Supabase was called correctly
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('grants');
      expect(mockBuilder.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(mockBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('filters by sector', async () => {
      // Arrange - Filter for cleantech sector (should match csrGrant)
      const cleantechGrants = activeGrantFixtures.filter((g) =>
        g.sectors.includes('cleantech')
      );
      const mockBuilder = createMockQueryBuilder(activeGrantFixtures, cleantechGrants.length);
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/grants?sector=cleantech'
      );

      // Act
      const response = await getGrants(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(mockBuilder.overlaps).toHaveBeenCalledWith('sectors', ['cleantech']);
      // All returned grants should include cleantech sector
      data.data.forEach((grant: Grant) => {
        expect(grant.sectors).toContain('cleantech');
      });
    });

    it('filters by stage', async () => {
      // Arrange - Filter for growth stage (should match csrGrant and privateGrant)
      const growthGrants = activeGrantFixtures.filter((g) =>
        g.stages.includes('growth')
      );
      const mockBuilder = createMockQueryBuilder(activeGrantFixtures, growthGrants.length);
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/grants?stage=growth'
      );

      // Act
      const response = await getGrants(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(mockBuilder.overlaps).toHaveBeenCalledWith('stages', ['growth']);
      // All returned grants should include growth stage
      data.data.forEach((grant: Grant) => {
        expect(grant.stages).toContain('growth');
      });
    });

    it('searches by name', async () => {
      // Arrange - Search for "Women" (should match privateGrant)
      const searchTerm = 'Women';
      const matchingGrants = activeGrantFixtures.filter(
        (g) =>
          g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.provider.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const mockBuilder = createMockQueryBuilder(activeGrantFixtures, matchingGrants.length);
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const request = new NextRequest(
        `http://localhost:3000/api/grants?search=${searchTerm}`
      );

      // Act
      const response = await getGrants(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(mockBuilder.or).toHaveBeenCalledWith(
        `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,provider.ilike.%${searchTerm}%`
      );
      // Verify results match search term
      expect(data.data.length).toBeGreaterThan(0);
      data.data.forEach((grant: Grant) => {
        const matchesSearch =
          grant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grant.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grant.provider.toLowerCase().includes(searchTerm.toLowerCase());
        expect(matchesSearch).toBe(true);
      });
    });

    it('handles multiple filters combined', async () => {
      // Arrange - Filter by sector and stage
      const mockBuilder = createMockQueryBuilder(activeGrantFixtures, 1);
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/grants?sector=healthcare&stage=mvp&provider_type=government'
      );

      // Act
      const response = await getGrants(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(mockBuilder.overlaps).toHaveBeenCalledWith('sectors', ['healthcare']);
      expect(mockBuilder.overlaps).toHaveBeenCalledWith('stages', ['mvp']);
      expect(mockBuilder.in).toHaveBeenCalledWith('provider_type', ['government']);
    });

    it('handles pagination parameters', async () => {
      // Arrange
      const mockBuilder = createMockQueryBuilder(activeGrantFixtures, activeGrantFixtures.length);
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/grants?page=2&per_page=1'
      );

      // Act
      const response = await getGrants(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.page).toBe(2);
      expect(data.per_page).toBe(1);
      // Range should be calculated: from = (2-1)*1 = 1, to = 1+1-1 = 1
      expect(mockBuilder.range).toHaveBeenCalledWith(1, 1);
    });

    it('handles sorting parameters', async () => {
      // Arrange
      const mockBuilder = createMockQueryBuilder(activeGrantFixtures, activeGrantFixtures.length);
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const request = new NextRequest(
        'http://localhost:3000/api/grants?sort_by=name&sort_order=asc'
      );

      // Act
      const response = await getGrants(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockBuilder.order).toHaveBeenCalledWith('name', {
        ascending: true,
        nullsFirst: false,
      });
    });

    it('returns error on database failure', async () => {
      // Arrange - Mock database error
      const mockBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((resolve: (value: unknown) => void) =>
          Promise.resolve(
            resolve({
              data: null,
              error: { message: 'Database connection failed' },
              count: null,
            })
          )
        ),
      };
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const request = new NextRequest('http://localhost:3000/api/grants');

      // Act
      const response = await getGrants(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Database connection failed');
    });
  });

  describe('GET /api/grants/[id]', () => {
    it('returns single grant by ID', async () => {
      // Arrange
      const mockBuilder = createMockQueryBuilder([governmentGrant]);
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const request = new NextRequest(
        `http://localhost:3000/api/grants/${governmentGrant.id}`
      );
      const params = Promise.resolve({ id: governmentGrant.id });

      // Act
      const response = await getGrantById(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('error', null);
      expect(data.data).toMatchObject({
        id: governmentGrant.id,
        name: governmentGrant.name,
        provider: governmentGrant.provider,
        provider_type: governmentGrant.provider_type,
      });

      // Verify Supabase was called correctly
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('grants');
      expect(mockBuilder.select).toHaveBeenCalledWith('*');
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', governmentGrant.id);
      expect(mockBuilder.single).toHaveBeenCalled();
    });

    it('returns 404 for invalid ID', async () => {
      // Arrange - Return empty result for non-existent grant
      const nonExistentId = 'grant-does-not-exist';
      const mockBuilder = createMockQueryBuilder([]); // Empty array = no match
      mockSupabaseClient.from.mockReturnValue(mockBuilder);

      const request = new NextRequest(
        `http://localhost:3000/api/grants/${nonExistentId}`
      );
      const params = Promise.resolve({ id: nonExistentId });

      // Act
      const response = await getGrantById(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toHaveProperty('data', null);
      expect(data).toHaveProperty('error', 'Grant not found');

      // Verify Supabase was called with the invalid ID
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('grants');
      expect(mockBuilder.eq).toHaveBeenCalledWith('id', nonExistentId);
    });

    it('returns different grants by ID', async () => {
      // Test that different IDs return different grants
      const grants = [governmentGrant, csrGrant, privateGrant];

      for (const grant of grants) {
        // Arrange
        vi.clearAllMocks();
        const mockBuilder = createMockQueryBuilder([grant]);
        mockSupabaseClient.from.mockReturnValue(mockBuilder);

        const request = new NextRequest(
          `http://localhost:3000/api/grants/${grant.id}`
        );
        const params = Promise.resolve({ id: grant.id });

        // Act
        const response = await getGrantById(request, { params });
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data.data.id).toBe(grant.id);
        expect(data.data.name).toBe(grant.name);
        expect(data.data.provider_type).toBe(grant.provider_type);
      }
    });
  });
});
