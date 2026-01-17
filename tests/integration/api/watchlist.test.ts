/**
 * Integration tests for /api/watchlist API routes
 * Tests the watchlist listing, adding, updating, and removing endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { governmentGrant, csrGrant } from '@/tests/fixtures/grants';
import { createStartupFixture } from '@/tests/fixtures/startups';
import type { Watchlist, Startup } from '@/types';

// Use vi.hoisted to define mock functions that can be used in vi.mock factories
const { mockSupabaseClient } = vi.hoisted(() => {
  return {
    mockSupabaseClient: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    },
  };
});

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Import route handlers after mocking
import { GET as getWatchlist, POST as addToWatchlist } from '@/app/api/watchlist/route';
import { PATCH as updateWatchlistItem, DELETE as removeFromWatchlist } from '@/app/api/watchlist/[id]/route';

// Create mock user for authentication
const mockUser = {
  id: 'user-test-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
};

// Create mock startup fixture
const mockStartup: Startup = {
  ...createStartupFixture(),
  id: 'startup-test-123',
  user_id: mockUser.id,
};

// Create mock watchlist item fixture
function createMockWatchlistItem(overrides: Partial<Watchlist> = {}): Watchlist {
  const now = new Date().toISOString();
  return {
    id: `watchlist-test-${Date.now()}`,
    startup_id: mockStartup.id,
    grant_id: governmentGrant.id,
    notify_deadline: true,
    notify_changes: true,
    created_at: now,
    ...overrides,
  };
}

// Create mock query builder that handles chainable Supabase methods
function createMockQueryBuilder<T>(options: {
  data?: T | T[] | null;
  error?: { message: string } | null;
  count?: number | null;
} = {}) {
  const { data = null, error = null, count = null } = options;

  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error, count })
    ),
    then: vi.fn().mockImplementation((resolve: (value: unknown) => void) =>
      Promise.resolve(resolve({ data, error, count }))
    ),
  };

  return builder;
}

describe('/api/watchlist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to authenticated user by default
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/watchlist', () => {
    it('returns user watchlist with grant data', async () => {
      // Arrange
      const mockWatchlistItems = [
        {
          ...createMockWatchlistItem(),
          grants: {
            id: governmentGrant.id,
            name: governmentGrant.name,
            provider: governmentGrant.provider,
            provider_type: governmentGrant.provider_type,
            deadline: governmentGrant.deadline,
            amount_max: governmentGrant.amount_max,
            sectors: governmentGrant.sectors,
          },
        },
        {
          ...createMockWatchlistItem({ grant_id: csrGrant.id }),
          grants: {
            id: csrGrant.id,
            name: csrGrant.name,
            provider: csrGrant.provider,
            provider_type: csrGrant.provider_type,
            deadline: csrGrant.deadline,
            amount_max: csrGrant.amount_max,
            sectors: csrGrant.sectors,
          },
        },
      ];

      // Mock startup lookup
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      // Mock watchlist lookup
      const watchlistBuilder = createMockQueryBuilder({ data: mockWatchlistItems });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return watchlistBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist');

      // Act
      const response = await getWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('grants');
      expect(result.data[0].grants.name).toBe(governmentGrant.name);
    });

    it('filters by upcoming deadline when deadline=upcoming query param is set', async () => {
      // Arrange
      const mockWatchlistItems = [
        {
          ...createMockWatchlistItem(),
          grants: {
            id: governmentGrant.id,
            name: governmentGrant.name,
            provider: governmentGrant.provider,
            provider_type: governmentGrant.provider_type,
            deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days from now
            amount_max: governmentGrant.amount_max,
            sectors: governmentGrant.sectors,
          },
        },
      ];

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const watchlistBuilder = createMockQueryBuilder({ data: mockWatchlistItems });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return watchlistBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist?deadline=upcoming');

      // Act
      const response = await getWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      // Verify lte was called for deadline filtering
      expect(watchlistBuilder.lte).toHaveBeenCalled();
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange - No authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist');

      // Act
      const response = await getWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange - No startup profile
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/watchlist');

      // Act
      const response = await getWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile');
    });

    it('returns 500 on database error', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const watchlistBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Database connection failed' }
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return watchlistBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist');

      // Act
      const response = await getWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Database connection failed');
    });
  });

  describe('POST /api/watchlist', () => {
    it('adds grant to watchlist with default notification settings', async () => {
      // Arrange
      const newWatchlistItem = createMockWatchlistItem();
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const existingBuilder = createMockQueryBuilder({ data: null }); // No existing entry
      const insertBuilder = createMockQueryBuilder({ data: newWatchlistItem });

      let watchlistCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') {
          watchlistCallCount++;
          // First call checks if already exists, second inserts
          if (watchlistCallCount === 1) return existingBuilder;
          return insertBuilder;
        }
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ grant_id: governmentGrant.id }),
      });

      // Act
      const response = await addToWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data.grant_id).toBe(governmentGrant.id);
      expect(result.data.notify_deadline).toBe(true);
      expect(result.data.notify_changes).toBe(true);
    });

    it('adds grant to watchlist with custom notification settings', async () => {
      // Arrange
      const newWatchlistItem = createMockWatchlistItem({
        notify_deadline: false,
        notify_changes: false,
      });
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const existingBuilder = createMockQueryBuilder({ data: null });
      const insertBuilder = createMockQueryBuilder({ data: newWatchlistItem });

      let watchlistCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') {
          watchlistCallCount++;
          if (watchlistCallCount === 1) return existingBuilder;
          return insertBuilder;
        }
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({
          grant_id: governmentGrant.id,
          notify_deadline: false,
          notify_changes: false,
        }),
      });

      // Act
      const response = await addToWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.notify_deadline).toBe(false);
      expect(result.data.notify_changes).toBe(false);
    });

    it('returns existing entry if grant already in watchlist', async () => {
      // Arrange
      const existingItem = { id: 'existing-watchlist-123' };
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const existingBuilder = createMockQueryBuilder({ data: existingItem });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return existingBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ grant_id: governmentGrant.id }),
      });

      // Act
      const response = await addToWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.id).toBe('existing-watchlist-123');
      expect(result.message).toBe('Already in watchlist');
    });

    it('returns 400 when grant_id is missing', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Act
      const response = await addToWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'grant_id required');
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ grant_id: governmentGrant.id }),
      });

      // Act
      const response = await addToWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ grant_id: governmentGrant.id }),
      });

      // Act
      const response = await addToWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile');
    });

    it('returns 500 on database insert error', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const existingBuilder = createMockQueryBuilder({ data: null });
      const insertBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Insert failed' }
      });

      let watchlistCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') {
          watchlistCallCount++;
          if (watchlistCallCount === 1) return existingBuilder;
          return insertBuilder;
        }
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ grant_id: governmentGrant.id }),
      });

      // Act
      const response = await addToWatchlist(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Insert failed');
    });
  });

  describe('PATCH /api/watchlist/[id]', () => {
    it('updates notify_deadline preference', async () => {
      // Arrange
      const watchlistItem = createMockWatchlistItem();
      const updatedItem = { ...watchlistItem, notify_deadline: false };
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({ data: updatedItem });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/watchlist/${watchlistItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notify_deadline: false }),
      });
      const params = Promise.resolve({ id: watchlistItem.id });

      // Act
      const response = await updateWatchlistItem(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data.notify_deadline).toBe(false);
    });

    it('updates notify_changes preference', async () => {
      // Arrange
      const watchlistItem = createMockWatchlistItem();
      const updatedItem = { ...watchlistItem, notify_changes: false };
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({ data: updatedItem });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/watchlist/${watchlistItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notify_changes: false }),
      });
      const params = Promise.resolve({ id: watchlistItem.id });

      // Act
      const response = await updateWatchlistItem(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.notify_changes).toBe(false);
    });

    it('updates both notification preferences', async () => {
      // Arrange
      const watchlistItem = createMockWatchlistItem();
      const updatedItem = { ...watchlistItem, notify_deadline: false, notify_changes: false };
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({ data: updatedItem });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/watchlist/${watchlistItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notify_deadline: false, notify_changes: false }),
      });
      const params = Promise.resolve({ id: watchlistItem.id });

      // Act
      const response = await updateWatchlistItem(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.notify_deadline).toBe(false);
      expect(result.data.notify_changes).toBe(false);
    });

    it('ignores non-allowed update fields', async () => {
      // Arrange
      const watchlistItem = createMockWatchlistItem();
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({ data: watchlistItem });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/watchlist/${watchlistItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          grant_id: 'should-be-ignored',
          startup_id: 'should-be-ignored',
          notify_deadline: true,
        }),
      });
      const params = Promise.resolve({ id: watchlistItem.id });

      // Act
      const response = await updateWatchlistItem(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // The grant_id and startup_id should not be changed
      expect(result.data.grant_id).toBe(watchlistItem.grant_id);
      expect(result.data.startup_id).toBe(watchlistItem.startup_id);
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist/watchlist-123', {
        method: 'PATCH',
        body: JSON.stringify({ notify_deadline: false }),
      });
      const params = Promise.resolve({ id: 'watchlist-123' });

      // Act
      const response = await updateWatchlistItem(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/watchlist/watchlist-123', {
        method: 'PATCH',
        body: JSON.stringify({ notify_deadline: false }),
      });
      const params = Promise.resolve({ id: 'watchlist-123' });

      // Act
      const response = await updateWatchlistItem(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile');
    });

    it('returns 500 on database update error', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Update failed' }
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist/watchlist-123', {
        method: 'PATCH',
        body: JSON.stringify({ notify_deadline: false }),
      });
      const params = Promise.resolve({ id: 'watchlist-123' });

      // Act
      const response = await updateWatchlistItem(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Update failed');
    });
  });

  describe('DELETE /api/watchlist/[id]', () => {
    it('removes grant from watchlist', async () => {
      // Arrange
      const watchlistItem = createMockWatchlistItem();
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const deleteBuilder = createMockQueryBuilder({ data: null, error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return deleteBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/watchlist/${watchlistItem.id}`, {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: watchlistItem.id });

      // Act
      const response = await removeFromWatchlist(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data.deleted).toBe(true);
      expect(result.data.id).toBe(watchlistItem.id);
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist/watchlist-123', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: 'watchlist-123' });

      // Act
      const response = await removeFromWatchlist(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/watchlist/watchlist-123', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: 'watchlist-123' });

      // Act
      const response = await removeFromWatchlist(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile');
    });

    it('returns 500 on database delete error', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const deleteBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Delete failed' }
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'watchlist') return deleteBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/watchlist/watchlist-123', {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: 'watchlist-123' });

      // Act
      const response = await removeFromWatchlist(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Delete failed');
    });
  });
});
