/**
 * Test database utilities
 * Provides helper functions for database operations in tests
 */

import { createClient } from '@supabase/supabase-js';
import type { Grant, Startup, KBDocument, Application } from '@/types';

// Test database client - uses service role key for full access during tests
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';

/**
 * Creates a Supabase client for test operations
 * Uses service role key to bypass RLS for test setup/cleanup
 */
export function createTestClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Creates a test grant in the database
 */
export async function createTestGrant(
  grant: Partial<Grant> & Pick<Grant, 'name' | 'provider'>
): Promise<Grant> {
  const client = createTestClient();

  const grantData = {
    id: grant.id || `grant-test-${Date.now()}`,
    name: grant.name,
    provider: grant.provider,
    provider_type: grant.provider_type || 'government',
    description: grant.description || 'Test grant description',
    amount_min: grant.amount_min ?? null,
    amount_max: grant.amount_max ?? null,
    currency: grant.currency || 'INR',
    deadline: grant.deadline ?? null,
    url: grant.url || 'https://test.example.com',
    sectors: grant.sectors || ['technology'],
    stages: grant.stages || ['mvp'],
    eligibility_criteria: grant.eligibility_criteria || {},
    application_questions: grant.application_questions || [],
    contact_email: grant.contact_email ?? null,
    is_active: grant.is_active ?? true,
  };

  const { data, error } = await client
    .from('grants')
    .insert(grantData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test grant: ${error.message}`);
  }

  return data as Grant;
}

/**
 * Creates a test startup in the database
 * Note: Requires a valid user_id (auth.users record)
 */
export async function createTestStartup(
  startup: Partial<Startup> & Pick<Startup, 'user_id' | 'name'>
): Promise<Startup> {
  const client = createTestClient();

  const startupData = {
    id: startup.id || `startup-test-${Date.now()}`,
    user_id: startup.user_id,
    name: startup.name,
    description: startup.description || 'Test startup description',
    sector: startup.sector || 'technology',
    stage: startup.stage || 'mvp',
    founded_date: startup.founded_date ?? null,
    incorporation_date: startup.incorporation_date ?? null,
    is_dpiit_registered: startup.is_dpiit_registered ?? false,
    entity_type: startup.entity_type || 'not_incorporated',
    state: startup.state || 'Karnataka',
    city: startup.city || 'Bangalore',
    revenue_last_year: startup.revenue_last_year ?? null,
    team_size: startup.team_size || 1,
    website: startup.website ?? null,
    linkedin: startup.linkedin ?? null,
    is_women_led: startup.is_women_led ?? false,
  };

  const { data, error } = await client
    .from('startups')
    .insert(startupData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test startup: ${error.message}`);
  }

  return data as Startup;
}

/**
 * Creates a test application in the database
 */
export async function createTestApplication(application: {
  startup_id: string;
  grant_id: string;
  status?: 'draft' | 'in_progress' | 'completed' | 'submitted';
  answers?: unknown[];
  match_score?: number | null;
  notes?: string | null;
}): Promise<Application> {
  const client = createTestClient();

  const applicationData = {
    id: `application-test-${Date.now()}`,
    startup_id: application.startup_id,
    grant_id: application.grant_id,
    status: application.status || 'draft',
    answers: application.answers || [],
    match_score: application.match_score ?? null,
    notes: application.notes ?? null,
  };

  const { data, error } = await client
    .from('applications')
    .insert(applicationData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test application: ${error.message}`);
  }

  return data as Application;
}

/**
 * Creates a test knowledge base document
 */
export async function createTestKBDocument(document: {
  startup_id: string;
  filename: string;
  file_type?: string;
  file_size?: number;
  storage_path?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}): Promise<KBDocument> {
  const client = createTestClient();

  const docData = {
    id: `doc-test-${Date.now()}`,
    startup_id: document.startup_id,
    filename: document.filename,
    file_type: document.file_type || 'application/pdf',
    file_size: document.file_size || 1024,
    storage_path: document.storage_path || `test/${document.filename}`,
    status: document.status || 'pending',
    extracted_metadata: null,
    error_message: null,
  };

  const { data, error } = await client
    .from('kb_documents')
    .insert(docData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test KB document: ${error.message}`);
  }

  return data as KBDocument;
}

/**
 * Deletes a test grant by ID
 */
export async function deleteTestGrant(grantId: string): Promise<void> {
  const client = createTestClient();

  const { error } = await client.from('grants').delete().eq('id', grantId);

  if (error) {
    throw new Error(`Failed to delete test grant: ${error.message}`);
  }
}

/**
 * Deletes a test startup by ID
 */
export async function deleteTestStartup(startupId: string): Promise<void> {
  const client = createTestClient();

  const { error } = await client.from('startups').delete().eq('id', startupId);

  if (error) {
    throw new Error(`Failed to delete test startup: ${error.message}`);
  }
}

/**
 * Cleans up all test data matching the test ID pattern
 * Use with caution - only in test environments
 */
export async function cleanupTestData(): Promise<void> {
  const client = createTestClient();

  // Clean up in order to respect foreign key constraints
  // Applications reference startups and grants
  await client.from('applications').delete().like('id', 'application-test-%');

  // KB chunks reference documents
  await client.from('kb_chunks').delete().like('id', 'chunk-test-%');

  // KB documents reference startups
  await client.from('kb_documents').delete().like('id', 'doc-test-%');

  // Watchlist references startups and grants
  await client.from('watchlist').delete().like('id', 'watchlist-test-%');

  // Notifications reference startups
  await client.from('notifications').delete().like('id', 'notification-test-%');

  // Now clean up main entities
  await client.from('startups').delete().like('id', 'startup-test-%');
  await client.from('grants').delete().like('id', 'grant-test-%');
}

/**
 * Cleans up test data for a specific startup
 */
export async function cleanupStartupTestData(startupId: string): Promise<void> {
  const client = createTestClient();

  // Clean up in order to respect foreign key constraints
  await client.from('applications').delete().eq('startup_id', startupId);
  await client.from('kb_chunks').delete().eq('startup_id', startupId);
  await client.from('kb_documents').delete().eq('startup_id', startupId);
  await client.from('watchlist').delete().eq('startup_id', startupId);
  await client.from('notifications').delete().eq('startup_id', startupId);
  await client.from('startups').delete().eq('id', startupId);
}

/**
 * Seeds the test database with fixture data
 */
export async function seedTestDatabase(data: {
  grants?: Partial<Grant>[];
  startups?: (Partial<Startup> & Pick<Startup, 'user_id' | 'name'>)[];
}): Promise<{ grants: Grant[]; startups: Startup[] }> {
  const createdGrants: Grant[] = [];
  const createdStartups: Startup[] = [];

  if (data.grants) {
    for (const grant of data.grants) {
      const created = await createTestGrant({
        name: grant.name || 'Test Grant',
        provider: grant.provider || 'Test Provider',
        ...grant,
      });
      createdGrants.push(created);
    }
  }

  if (data.startups) {
    for (const startup of data.startups) {
      const created = await createTestStartup(startup);
      createdStartups.push(created);
    }
  }

  return { grants: createdGrants, startups: createdStartups };
}

/**
 * Gets a grant by ID for test verification
 */
export async function getTestGrant(grantId: string): Promise<Grant | null> {
  const client = createTestClient();

  const { data, error } = await client
    .from('grants')
    .select('*')
    .eq('id', grantId)
    .single();

  if (error) {
    return null;
  }

  return data as Grant;
}

/**
 * Gets a startup by ID for test verification
 */
export async function getTestStartup(startupId: string): Promise<Startup | null> {
  const client = createTestClient();

  const { data, error } = await client
    .from('startups')
    .select('*')
    .eq('id', startupId)
    .single();

  if (error) {
    return null;
  }

  return data as Startup;
}
