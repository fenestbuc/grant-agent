/**
 * Integration tests for /api/notifications API routes
 * Tests the notifications listing, mark as read, and mark all read endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { governmentGrant } from '@/tests/fixtures/grants';
import { createStartupFixture } from '@/tests/fixtures/startups';
import type { Notification, Startup } from '@/types';

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
import { GET as getNotifications } from '@/app/api/notifications/route';
import { PATCH as markNotificationRead } from '@/app/api/notifications/[id]/route';
import { POST as markAllRead } from '@/app/api/notifications/mark-all-read/route';

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

// Create mock notification fixture
function createMockNotification(overrides: Partial<Notification> = {}): Notification {
  const now = new Date().toISOString();
  return {
    id: `notification-test-${Date.now()}`,
    startup_id: mockStartup.id,
    type: 'deadline_reminder',
    title: 'Deadline Approaching',
    message: `The deadline for ${governmentGrant.name} is in 7 days.`,
    grant_id: governmentGrant.id,
    is_read: false,
    sent_at: now,
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

// Create mock query builder for count queries (with head: true)
function createMockCountBuilder(options: {
  count?: number | null;
  error?: { message: string } | null;
} = {}) {
  const { count = null, error = null } = options;

  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((resolve: (value: unknown) => void) =>
      Promise.resolve(resolve({ data: null, error, count }))
    ),
  };

  return builder;
}

describe('/api/notifications', () => {
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

  describe('GET /api/notifications', () => {
    it('returns user notifications with unread count', async () => {
      // Arrange
      const mockNotifications = [
        createMockNotification({ is_read: false }),
        createMockNotification({
          id: 'notification-2',
          type: 'new_grant',
          title: 'New Grant Available',
          message: 'A new grant matching your profile is available.',
          is_read: false,
        }),
        createMockNotification({
          id: 'notification-3',
          type: 'grant_update',
          title: 'Grant Updated',
          message: 'A grant you are watching has been updated.',
          is_read: true,
        }),
      ];

      // Mock startup lookup
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      // Mock notifications lookup
      const notificationsBuilder = createMockQueryBuilder({ data: mockNotifications });
      // Mock unread count
      const countBuilder = createMockCountBuilder({ count: 2 });

      let notificationsCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') {
          notificationsCallCount++;
          // First call is for notifications list, second is for unread count
          if (notificationsCallCount === 1) return notificationsBuilder;
          return countBuilder;
        }
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/notifications');

      // Act
      const response = await getNotifications(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('unreadCount');
      expect(result.data).toHaveLength(3);
      expect(result.unreadCount).toBe(2);
    });

    it('respects limit query parameter', async () => {
      // Arrange
      const mockNotifications = [
        createMockNotification({ id: 'notification-1' }),
        createMockNotification({ id: 'notification-2' }),
      ];

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const notificationsBuilder = createMockQueryBuilder({ data: mockNotifications });
      const countBuilder = createMockCountBuilder({ count: 2 });

      let notificationsCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') {
          notificationsCallCount++;
          if (notificationsCallCount === 1) return notificationsBuilder;
          return countBuilder;
        }
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/notifications?limit=10');

      // Act
      const response = await getNotifications(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(notificationsBuilder.limit).toHaveBeenCalledWith(10);
      expect(result.data).toHaveLength(2);
    });

    it('filters by type query parameter', async () => {
      // Arrange
      const mockNotifications = [
        createMockNotification({ type: 'deadline_reminder' }),
      ];

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const notificationsBuilder = createMockQueryBuilder({ data: mockNotifications });
      const countBuilder = createMockCountBuilder({ count: 1 });

      let notificationsCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') {
          notificationsCallCount++;
          if (notificationsCallCount === 1) return notificationsBuilder;
          return countBuilder;
        }
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/notifications?type=deadline_reminder');

      // Act
      const response = await getNotifications(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // Verify eq was called for type filtering (at least once for startup_id and once for type)
      expect(notificationsBuilder.eq).toHaveBeenCalled();
      expect(result.data[0].type).toBe('deadline_reminder');
    });

    it('returns empty array when no notifications exist', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const notificationsBuilder = createMockQueryBuilder({ data: [] });
      const countBuilder = createMockCountBuilder({ count: 0 });

      let notificationsCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') {
          notificationsCallCount++;
          if (notificationsCallCount === 1) return notificationsBuilder;
          return countBuilder;
        }
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/notifications');

      // Act
      const response = await getNotifications(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toHaveLength(0);
      expect(result.unreadCount).toBe(0);
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange - No authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/notifications');

      // Act
      const response = await getNotifications(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange - No startup profile
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/notifications');

      // Act
      const response = await getNotifications(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile');
    });

    it('returns 500 on database error fetching notifications', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const notificationsBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Database connection failed' }
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') return notificationsBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/notifications');

      // Act
      const response = await getNotifications(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Database connection failed');
    });

    it('returns 500 on database error fetching unread count', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const notificationsBuilder = createMockQueryBuilder({ data: [] });
      const countBuilder = createMockCountBuilder({ error: { message: 'Count query failed' } });

      let notificationsCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') {
          notificationsCallCount++;
          if (notificationsCallCount === 1) return notificationsBuilder;
          return countBuilder;
        }
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/notifications');

      // Act
      const response = await getNotifications(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Count query failed');
    });
  });

  describe('PATCH /api/notifications/[id]', () => {
    it('marks notification as read', async () => {
      // Arrange
      const notification = createMockNotification({ is_read: false });
      const updatedNotification = { ...notification, is_read: true };
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({ data: updatedNotification });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/notifications/${notification.id}`, {
        method: 'PATCH',
      });
      const params = Promise.resolve({ id: notification.id });

      // Act
      const response = await markNotificationRead(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data.is_read).toBe(true);
    });

    it('returns 404 when notification not found', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({ data: null, error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/non-existent-id', {
        method: 'PATCH',
      });
      const params = Promise.resolve({ id: 'non-existent-id' });

      // Act
      const response = await markNotificationRead(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(result).toHaveProperty('error', 'Notification not found');
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/notification-123', {
        method: 'PATCH',
      });
      const params = Promise.resolve({ id: 'notification-123' });

      // Act
      const response = await markNotificationRead(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/notifications/notification-123', {
        method: 'PATCH',
      });
      const params = Promise.resolve({ id: 'notification-123' });

      // Act
      const response = await markNotificationRead(request, { params });
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
        if (table === 'notifications') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/notification-123', {
        method: 'PATCH',
      });
      const params = Promise.resolve({ id: 'notification-123' });

      // Act
      const response = await markNotificationRead(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Update failed');
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('marks all notifications as read', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({ data: null, error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') return updateBuilder;
        return createMockQueryBuilder();
      });

      // Act
      const response = await markAllRead();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data.success).toBe(true);
    });

    it('returns success even when no unread notifications exist', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({ data: null, error: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') return updateBuilder;
        return createMockQueryBuilder();
      });

      // Act
      const response = await markAllRead();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.success).toBe(true);
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const response = await markAllRead();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      // Act
      const response = await markAllRead();
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
        error: { message: 'Bulk update failed' }
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'notifications') return updateBuilder;
        return createMockQueryBuilder();
      });

      // Act
      const response = await markAllRead();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Bulk update failed');
    });
  });
});
