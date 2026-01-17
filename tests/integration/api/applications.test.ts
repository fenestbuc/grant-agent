/**
 * Integration tests for /api/applications API routes
 * Tests the applications listing, creation, retrieval, update, and answer generation endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { governmentGrant } from '@/tests/fixtures/grants';
import { createStartupFixture } from '@/tests/fixtures/startups';
import type { Application, Startup } from '@/types';

// Use vi.hoisted to define mock functions that can be used in vi.mock factories
const { mockSupabaseClient, mockOpenAICreate, mockGenerateQueryEmbedding } = vi.hoisted(() => {
  return {
    mockSupabaseClient: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    },
    mockOpenAICreate: vi.fn(),
    mockGenerateQueryEmbedding: vi.fn(),
  };
});

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Mock the OpenAI SDK with a proper class mock
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockOpenAICreate,
        },
      };
    },
  };
});

// Mock the document processor
vi.mock('@/lib/llm/document-processor', () => ({
  generateQueryEmbedding: mockGenerateQueryEmbedding,
}));

// Import route handlers after mocking
import { GET as getApplications, POST as createApplication } from '@/app/api/applications/route';
import { GET as getApplicationById, PATCH as updateApplication } from '@/app/api/applications/[id]/route';
import { POST as generateAnswer } from '@/app/api/applications/generate/route';

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

// Create mock application fixture
function createMockApplication(overrides: Partial<Application> = {}): Application {
  const now = new Date().toISOString();
  return {
    id: `app-test-${Date.now()}`,
    startup_id: mockStartup.id,
    grant_id: governmentGrant.id,
    status: 'draft',
    answers: [
      {
        question_id: 'q1',
        question: 'Describe your product or service',
        generated_answer: null,
        edited_answer: null,
        sources: [],
        is_edited: false,
      },
    ],
    match_score: null,
    notes: null,
    created_at: now,
    updated_at: now,
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
    in: vi.fn().mockReturnThis(),
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

describe('/api/applications', () => {
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

  describe('GET /api/applications', () => {
    it('returns user applications with grant data', async () => {
      // Arrange
      const mockApplications = [
        {
          ...createMockApplication(),
          grants: {
            id: governmentGrant.id,
            name: governmentGrant.name,
            provider: governmentGrant.provider,
            deadline: governmentGrant.deadline,
            amount_max: governmentGrant.amount_max,
          },
        },
      ];

      // Mock startup lookup
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      // Mock applications lookup
      const applicationsBuilder = createMockQueryBuilder({ data: mockApplications });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'applications') return applicationsBuilder;
        return createMockQueryBuilder();
      });

      // Act
      const response = await getApplications();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('grants');
      expect(result.data[0].grants.name).toBe(governmentGrant.name);
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange - No authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const response = await getApplications();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange - No startup profile
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      // Act
      const response = await getApplications();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile');
    });

    it('returns 500 on database error', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const applicationsBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Database connection failed' }
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'applications') return applicationsBuilder;
        return createMockQueryBuilder();
      });

      // Act
      const response = await getApplications();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Database connection failed');
    });
  });

  describe('POST /api/applications', () => {
    it('creates a new application with initial answers from grant questions', async () => {
      // Arrange
      const newApplication = createMockApplication();
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const existingAppBuilder = createMockQueryBuilder({ data: null }); // No existing app
      const grantBuilder = createMockQueryBuilder({
        data: { application_questions: governmentGrant.application_questions }
      });
      const insertBuilder = createMockQueryBuilder({ data: newApplication });

      let fromCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'applications') {
          fromCallCount++;
          // First call is to check existing, second is to insert
          if (fromCallCount === 1) return existingAppBuilder;
          return insertBuilder;
        }
        if (table === 'grants') return grantBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/applications', {
        method: 'POST',
        body: JSON.stringify({ grant_id: governmentGrant.id }),
      });

      // Act
      const response = await createApplication(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data.status).toBe('draft');
    });

    it('returns existing application if already exists', async () => {
      // Arrange
      const existingApplication = { id: 'existing-app-123' };
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const existingAppBuilder = createMockQueryBuilder({ data: existingApplication });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'applications') return existingAppBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/applications', {
        method: 'POST',
        body: JSON.stringify({ grant_id: governmentGrant.id }),
      });

      // Act
      const response = await createApplication(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.id).toBe('existing-app-123');
    });

    it('returns 400 when grant_id is missing', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/applications', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Act
      const response = await createApplication(request);
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

      const request = new NextRequest('http://localhost:3000/api/applications', {
        method: 'POST',
        body: JSON.stringify({ grant_id: governmentGrant.id }),
      });

      // Act
      const response = await createApplication(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/applications', {
        method: 'POST',
        body: JSON.stringify({ grant_id: governmentGrant.id }),
      });

      // Act
      const response = await createApplication(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile');
    });
  });

  describe('GET /api/applications/[id]', () => {
    it('returns single application with full grant data', async () => {
      // Arrange
      const application = {
        ...createMockApplication(),
        grants: governmentGrant,
      };
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const applicationBuilder = createMockQueryBuilder({ data: application });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'applications') return applicationBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/applications/${application.id}`);
      const params = Promise.resolve({ id: application.id });

      // Act
      const response = await getApplicationById(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('grants');
      expect(result.data.grants.name).toBe(governmentGrant.name);
    });

    it('returns 404 when application not found', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const applicationBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'No rows found' }
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'applications') return applicationBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/applications/non-existent-id');
      const params = Promise.resolve({ id: 'non-existent-id' });

      // Act
      const response = await getApplicationById(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(result).toHaveProperty('error', 'Application not found');
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/applications/app-123');
      const params = Promise.resolve({ id: 'app-123' });

      // Act
      const response = await getApplicationById(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/applications/app-123');
      const params = Promise.resolve({ id: 'app-123' });

      // Act
      const response = await getApplicationById(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile');
    });
  });

  describe('PATCH /api/applications/[id]', () => {
    it('updates application status', async () => {
      // Arrange
      const application = createMockApplication();
      const updatedApplication = { ...application, status: 'in_progress' };
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({ data: updatedApplication });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'applications') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/applications/${application.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress' }),
      });
      const params = Promise.resolve({ id: application.id });

      // Act
      const response = await updateApplication(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data.status).toBe('in_progress');
    });

    it('updates application answers', async () => {
      // Arrange
      const application = createMockApplication();
      const updatedAnswers = [
        {
          question_id: 'q1',
          question: 'Describe your product',
          generated_answer: 'Generated answer',
          edited_answer: 'Edited answer',
          sources: [],
          is_edited: true,
        },
      ];
      const updatedApplication = { ...application, answers: updatedAnswers };
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({ data: updatedApplication });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'applications') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/applications/${application.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ answers: updatedAnswers }),
      });
      const params = Promise.resolve({ id: application.id });

      // Act
      const response = await updateApplication(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.answers[0].is_edited).toBe(true);
      expect(result.data.answers[0].edited_answer).toBe('Edited answer');
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/applications/app-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress' }),
      });
      const params = Promise.resolve({ id: 'app-123' });

      // Act
      const response = await updateApplication(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/applications/app-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress' }),
      });
      const params = Promise.resolve({ id: 'app-123' });

      // Act
      const response = await updateApplication(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile');
    });

    it('returns 500 on database error', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const updateBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Update failed' }
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'applications') return updateBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest('http://localhost:3000/api/applications/app-123', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress' }),
      });
      const params = Promise.resolve({ id: 'app-123' });

      // Act
      const response = await updateApplication(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Update failed');
    });
  });

  describe('POST /api/applications/generate', () => {
    beforeEach(() => {
      // Set up default mocks for generate endpoint
      mockGenerateQueryEmbedding.mockResolvedValue([0.1, 0.2, 0.3]); // Mock embedding
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'This is a generated answer based on your startup profile and documents.',
            },
          },
        ],
      });
    });

    it('generates answer with RAG context from knowledge base', async () => {
      // Arrange
      const mockChunks = [
        {
          document_id: 'doc-1',
          content: 'Our product helps small businesses automate their workflows.',
          similarity: 0.85,
        },
        {
          document_id: 'doc-2',
          content: 'We have achieved 50% growth in the last quarter.',
          similarity: 0.75,
        },
      ];
      const mockDocuments = [
        { id: 'doc-1', filename: 'pitch-deck.pdf' },
        { id: 'doc-2', filename: 'traction-report.pdf' },
      ];

      const startupBuilder = createMockQueryBuilder({ data: mockStartup });
      const documentsBuilder = createMockQueryBuilder({ data: mockDocuments });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentsBuilder;
        return createMockQueryBuilder();
      });
      // Mock both match_kb_chunks and increment_answers_generated RPC calls
      mockSupabaseClient.rpc.mockImplementation((funcName: string) => {
        if (funcName === 'match_kb_chunks') return Promise.resolve({ data: mockChunks, error: null });
        if (funcName === 'increment_answers_generated') return Promise.resolve({ data: null, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const request = new NextRequest('http://localhost:3000/api/applications/generate', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Describe your product and its traction',
          grantName: 'Test Grant',
          maxLength: 1000,
        }),
      });

      // Act
      const response = await generateAnswer(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('answer');
      expect(result.data).toHaveProperty('sources');
      expect(result.data.sources).toHaveLength(2);
      expect(result.data.sources[0].document_name).toBe('pitch-deck.pdf');

      // Verify embedding was generated for the question
      expect(mockGenerateQueryEmbedding).toHaveBeenCalledWith('Describe your product and its traction');

      // Verify vector search was performed
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('match_kb_chunks', {
        query_embedding: [0.1, 0.2, 0.3],
        match_startup_id: mockStartup.id,
        match_threshold: 0.6,
        match_count: 5,
      });

      // Verify OpenAI was called
      expect(mockOpenAICreate).toHaveBeenCalled();
    });

    it('generates answer without documents when none are relevant', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: mockStartup });
      const documentsBuilder = createMockQueryBuilder({ data: [] });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentsBuilder;
        return createMockQueryBuilder();
      });
      // Mock both match_kb_chunks and increment_answers_generated RPC calls
      mockSupabaseClient.rpc.mockImplementation((funcName: string) => {
        if (funcName === 'match_kb_chunks') return Promise.resolve({ data: [], error: null });
        if (funcName === 'increment_answers_generated') return Promise.resolve({ data: null, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const request = new NextRequest('http://localhost:3000/api/applications/generate', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Describe your vision for the company',
        }),
      });

      // Act
      const response = await generateAnswer(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.sources).toHaveLength(0);
      expect(result.data.answer).toBeTruthy();
    });

    it('returns 400 when question is missing', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: mockStartup });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/applications/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      // Act
      const response = await generateAnswer(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'Question is required');
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/applications/generate', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      // Act
      const response = await generateAnswer(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest('http://localhost:3000/api/applications/generate', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      // Act
      const response = await generateAnswer(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile found');
    });

    it('returns 500 when Claude API fails', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: mockStartup });
      const documentsBuilder = createMockQueryBuilder({ data: [] });
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentsBuilder;
        return createMockQueryBuilder();
      });
      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null });
      mockOpenAICreate.mockRejectedValue(new Error('API rate limit exceeded'));

      const request = new NextRequest('http://localhost:3000/api/applications/generate', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      // Act
      const response = await generateAnswer(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Answer generation failed');
    });

    it('handles unexpected response format from OpenAI', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: mockStartup });
      const documentsBuilder = createMockQueryBuilder({ data: [] });
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentsBuilder;
        return createMockQueryBuilder();
      });
      mockSupabaseClient.rpc.mockResolvedValue({ data: [], error: null });

      // Return empty choices array
      mockOpenAICreate.mockResolvedValue({
        choices: [],
      });

      const request = new NextRequest('http://localhost:3000/api/applications/generate', {
        method: 'POST',
        body: JSON.stringify({ question: 'Test question' }),
      });

      // Act
      const response = await generateAnswer(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Answer generation failed');
    });

    it('uses provided maxLength in OpenAI prompt', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: mockStartup });
      const documentsBuilder = createMockQueryBuilder({ data: [] });
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentsBuilder;
        return createMockQueryBuilder();
      });
      // Mock both match_kb_chunks and increment_answers_generated RPC calls
      mockSupabaseClient.rpc.mockImplementation((funcName: string) => {
        if (funcName === 'match_kb_chunks') return Promise.resolve({ data: [], error: null });
        if (funcName === 'increment_answers_generated') return Promise.resolve({ data: null, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const request = new NextRequest('http://localhost:3000/api/applications/generate', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          maxLength: 500,
        }),
      });

      // Act
      const response = await generateAnswer(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1000, // maxLength * 2 capped at 4000
        })
      );
    });

    it('includes grant name in OpenAI prompt when provided', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: mockStartup });
      const documentsBuilder = createMockQueryBuilder({ data: [] });
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentsBuilder;
        return createMockQueryBuilder();
      });
      // Mock both match_kb_chunks and increment_answers_generated RPC calls
      mockSupabaseClient.rpc.mockImplementation((funcName: string) => {
        if (funcName === 'match_kb_chunks') return Promise.resolve({ data: [], error: null });
        if (funcName === 'increment_answers_generated') return Promise.resolve({ data: null, error: null });
        return Promise.resolve({ data: null, error: null });
      });

      const request = new NextRequest('http://localhost:3000/api/applications/generate', {
        method: 'POST',
        body: JSON.stringify({
          question: 'Test question',
          grantName: 'Startup India Seed Fund',
        }),
      });

      // Act
      const response = await generateAnswer(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      // Verify the prompt includes the grant name
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Startup India Seed Fund'),
            }),
          ]),
        })
      );
    });
  });
});
