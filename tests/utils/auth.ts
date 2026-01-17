/**
 * Test authentication utilities
 * Provides mock auth helpers for testing authenticated routes and components
 */

import { createClient } from '@supabase/supabase-js';
import type { User, Session } from '@supabase/supabase-js';

// Test database client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

/**
 * Mock user factory for testing
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const now = new Date().toISOString();
  return {
    id: `user-test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    aud: 'authenticated',
    role: 'authenticated',
    email: `test-${Date.now()}@example.com`,
    email_confirmed_at: now,
    phone: '',
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {
      email: `test-${Date.now()}@example.com`,
    },
    identities: [],
    created_at: now,
    updated_at: now,
    is_anonymous: false,
    ...overrides,
  };
}

/**
 * Mock session factory for testing
 */
export function createMockSession(user?: User, overrides: Partial<Session> = {}): Session {
  const mockUser = user || createMockUser();
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

  return {
    access_token: `test-access-token-${Date.now()}`,
    refresh_token: `test-refresh-token-${Date.now()}`,
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: 'bearer',
    user: mockUser,
    ...overrides,
  };
}

/**
 * Creates a real test user in Supabase Auth (for integration tests)
 * Uses admin API to create user without email verification
 */
export async function createTestUser(email?: string): Promise<{ user: User; password: string }> {
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const testEmail = email || `test-${Date.now()}@example.com`;
  const testPassword = `TestPassword123!${Date.now()}`;

  const { data, error } = await client.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true, // Auto-confirm email for tests
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No user returned from createUser');
  }

  return { user: data.user, password: testPassword };
}

/**
 * Deletes a test user from Supabase Auth
 */
export async function deleteTestUser(userId: string): Promise<void> {
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await client.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Failed to delete test user: ${error.message}`);
  }
}

/**
 * Signs in a test user and returns the session (for integration tests)
 */
export async function signInTestUser(
  email: string,
  password: string
): Promise<{ user: User; session: Session }> {
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(`Failed to sign in test user: ${error.message}`);
  }

  if (!data.user || !data.session) {
    throw new Error('No user or session returned from signIn');
  }

  return { user: data.user, session: data.session };
}

/**
 * Mock auth context value for testing components
 */
export interface MockAuthContext {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Creates a mock auth context for component testing
 */
export function createMockAuthContext(overrides: Partial<MockAuthContext> = {}): MockAuthContext {
  const user = createMockUser();
  const session = createMockSession(user);

  return {
    user,
    session,
    isLoading: false,
    signIn: async () => {},
    signOut: async () => {},
    ...overrides,
  };
}

/**
 * Creates an unauthenticated mock auth context
 */
export function createUnauthenticatedContext(): MockAuthContext {
  return {
    user: null,
    session: null,
    isLoading: false,
    signIn: async () => {},
    signOut: async () => {},
  };
}

/**
 * Creates a loading state mock auth context
 */
export function createLoadingAuthContext(): MockAuthContext {
  return {
    user: null,
    session: null,
    isLoading: true,
    signIn: async () => {},
    signOut: async () => {},
  };
}

/**
 * Mock cookies for server-side auth testing
 */
export function createMockCookies(sessionToken?: string) {
  const cookies: Record<string, string> = {};

  if (sessionToken) {
    cookies['sb-access-token'] = sessionToken;
    cookies['sb-refresh-token'] = `refresh-${sessionToken}`;
  }

  return {
    get: (name: string) => (cookies[name] ? { name, value: cookies[name] } : undefined),
    getAll: () =>
      Object.entries(cookies).map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      cookies[name] = value;
    },
    delete: (name: string) => {
      delete cookies[name];
    },
  };
}

/**
 * Test user data type for tracking test users
 */
export interface TestUserData {
  user: User;
  password: string;
  startupId?: string;
}

/**
 * Test user registry for managing test users across tests
 */
class TestUserRegistry {
  private users: Map<string, TestUserData> = new Map();

  async create(email?: string): Promise<TestUserData> {
    const { user, password } = await createTestUser(email);
    const data = { user, password };
    this.users.set(user.id, data);
    return data;
  }

  get(userId: string): TestUserData | undefined {
    return this.users.get(userId);
  }

  async cleanup(): Promise<void> {
    const deletePromises = Array.from(this.users.keys()).map((userId) =>
      deleteTestUser(userId).catch((error) => {
        console.warn(`Failed to delete test user ${userId}:`, error);
      })
    );
    await Promise.all(deletePromises);
    this.users.clear();
  }

  async cleanupUser(userId: string): Promise<void> {
    await deleteTestUser(userId);
    this.users.delete(userId);
  }
}

/**
 * Singleton instance of the test user registry
 */
export const testUserRegistry = new TestUserRegistry();
