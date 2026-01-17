/**
 * Mock handlers for testing
 * Centralizes all mock setup and exports common mock utilities
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Re-export LLM mocks
export * from './llm/claude';
export * from './llm/openai';

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    and: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    // Mock returns empty data by default
    then: vi.fn().mockImplementation((callback) =>
      Promise.resolve(callback({ data: [], error: null }))
    ),
  };

  // Make each method return the builder for chaining
  Object.values(mockQueryBuilder).forEach((method) => {
    if (typeof method === 'function' && method !== mockQueryBuilder.then) {
      (method as ReturnType<typeof vi.fn>).mockReturnValue(mockQueryBuilder);
    }
  });

  return {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
      signInWithOtp: vi.fn().mockResolvedValue({ data: null, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/path' }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.supabase.co/storage/test' } }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://test.supabase.co/storage/test?token=xxx' },
          error: null,
        }),
      }),
    },
    // Expose query builder for direct testing
    _queryBuilder: mockQueryBuilder,
  };
}

/**
 * Mock Next.js router for testing
 */
export function createMockRouter() {
  return {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn().mockResolvedValue(undefined),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    basePath: '',
    isLocaleDomain: false,
    isReady: true,
    isPreview: false,
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  };
}

/**
 * Mock Next.js headers for server component testing
 */
export function createMockHeaders() {
  const headers = new Map<string, string>();
  return {
    get: vi.fn((key: string) => headers.get(key) || null),
    has: vi.fn((key: string) => headers.has(key)),
    entries: vi.fn(() => headers.entries()),
    forEach: vi.fn((callback: (value: string, key: string) => void) => headers.forEach(callback)),
    // Helper to set test values
    _set: (key: string, value: string) => headers.set(key, value),
    _clear: () => headers.clear(),
  };
}

/**
 * Mock Next.js cookies for server component testing
 */
export function createMockCookies() {
  const cookies = new Map<string, { name: string; value: string }>();
  return {
    get: vi.fn((name: string) => cookies.get(name)),
    getAll: vi.fn(() => Array.from(cookies.values())),
    has: vi.fn((name: string) => cookies.has(name)),
    set: vi.fn((name: string, value: string) => {
      cookies.set(name, { name, value });
    }),
    delete: vi.fn((name: string) => cookies.delete(name)),
    // Helper to set test values
    _set: (name: string, value: string) => cookies.set(name, { name, value }),
    _clear: () => cookies.clear(),
  };
}

/**
 * Mock fetch for API testing
 */
export function createMockFetch(responses: Map<string, unknown> = new Map()) {
  return vi.fn().mockImplementation(async (url: string) => {
    const response = responses.get(url) || { ok: true, status: 200, data: null };
    return {
      ok: (response as { ok?: boolean }).ok ?? true,
      status: (response as { status?: number }).status ?? 200,
      json: vi.fn().mockResolvedValue((response as { data?: unknown }).data),
      text: vi.fn().mockResolvedValue(JSON.stringify((response as { data?: unknown }).data)),
      blob: vi.fn().mockResolvedValue(new Blob()),
    };
  });
}

/**
 * Mock ResizeObserver for component testing
 */
export function createMockResizeObserver() {
  return vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

/**
 * Mock IntersectionObserver for component testing
 */
export function createMockIntersectionObserver() {
  return vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
}

/**
 * Sets up common global mocks for all tests
 */
export function setupGlobalMocks() {
  // Mock ResizeObserver
  global.ResizeObserver = createMockResizeObserver() as unknown as typeof ResizeObserver;

  // Mock IntersectionObserver
  global.IntersectionObserver = createMockIntersectionObserver() as unknown as typeof IntersectionObserver;

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock scrollTo
  window.scrollTo = vi.fn();
}

/**
 * Reset all mocks between tests
 */
export function resetAllMocks() {
  vi.clearAllMocks();
  vi.resetAllMocks();
}

/**
 * Standard test setup hook
 * Use in describe blocks: setupTestHooks()
 */
export function setupTestHooks() {
  beforeEach(() => {
    setupGlobalMocks();
  });

  afterEach(() => {
    resetAllMocks();
  });
}
