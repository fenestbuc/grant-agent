/**
 * Integration tests for /api/kb API routes
 * Tests the KB document listing, upload, and deletion endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createStartupFixture } from '@/tests/fixtures/startups';
import type { KBDocument, Startup } from '@/types';

// Use vi.hoisted to define mock functions that can be used in vi.mock factories
const { mockSupabaseClient, mockInngestSend } = vi.hoisted(() => {
  return {
    mockSupabaseClient: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      storage: {
        from: vi.fn(),
      },
    },
    mockInngestSend: vi.fn(),
  };
});

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Mock the Inngest client
vi.mock('@/lib/inngest/client', () => ({
  inngest: {
    send: mockInngestSend,
  },
}));

// Import route handlers after mocking
import { GET as getDocuments } from '@/app/api/kb/route';
import { POST as uploadDocument } from '@/app/api/kb/upload/route';
import { DELETE as deleteDocument } from '@/app/api/kb/[id]/route';

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

// Create mock KB document fixture
function createMockDocument(overrides: Partial<KBDocument> = {}): KBDocument {
  const now = new Date().toISOString();
  return {
    id: `doc-test-${Date.now()}`,
    startup_id: mockStartup.id,
    filename: 'test-document.pdf',
    file_type: 'pdf',
    file_size: 1024000,
    storage_path: `${mockStartup.id}/12345-test-document.pdf`,
    status: 'completed',
    extracted_metadata: null,
    error_message: null,
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

  // Create a builder that supports all chainable methods
  // Each method returns 'this' to support chaining, except terminal methods
  const builder: Record<string, unknown> = {};

  const chainableMethods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'limit'];

  chainableMethods.forEach(method => {
    builder[method] = vi.fn().mockReturnValue(builder);
  });

  // Terminal method that resolves the promise
  builder.single = vi.fn().mockImplementation(() =>
    Promise.resolve({ data: Array.isArray(data) ? data[0] : data, error, count })
  );

  // Make the builder thenable for cases where we don't call .single()
  builder.then = vi.fn().mockImplementation((resolve: (value: unknown) => void) =>
    Promise.resolve(resolve({ data, error, count }))
  );

  return builder;
}

// Create mock storage client
function createMockStorageClient(options: {
  uploadError?: { message: string } | null;
  removeError?: { message: string } | null;
} = {}) {
  return {
    upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: options.uploadError || null }),
    remove: vi.fn().mockResolvedValue({ data: null, error: options.removeError || null }),
  };
}

/**
 * Helper to create a mock file upload request.
 * In jsdom environment, File names get lost when passed through FormData/Request,
 * so we need to mock the formData() method on the request to return a properly
 * structured mock file.
 */
function createMockUploadRequest(options: {
  filename: string;
  mimeType: string;
  size: number;
  hasFile?: boolean;
}): NextRequest {
  const { filename, mimeType, size, hasFile = true } = options;

  // Create a mock file object that preserves the name property
  const mockFile = hasFile
    ? ({
        name: filename,
        type: mimeType,
        size: size,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(size)),
      } as unknown as File)
    : null;

  // Create a mock FormData
  const mockFormData = new FormData();
  const originalGet = mockFormData.get.bind(mockFormData);
  mockFormData.get = (key: string) => {
    if (key === 'file') return mockFile;
    return originalGet(key);
  };

  // Create a request and override its formData method
  const request = new NextRequest('http://localhost:3000/api/kb/upload', {
    method: 'POST',
  });

  vi.spyOn(request, 'formData').mockResolvedValue(mockFormData);

  return request;
}

describe('/api/kb', () => {
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

  describe('GET /api/kb', () => {
    it('returns user documents ordered by created_at desc', async () => {
      // Arrange
      const mockDocuments = [
        createMockDocument({ id: 'doc-1', filename: 'document1.pdf' }),
        createMockDocument({ id: 'doc-2', filename: 'document2.docx' }),
      ];

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const documentsBuilder = createMockQueryBuilder({ data: mockDocuments });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentsBuilder;
        return createMockQueryBuilder();
      });

      // Act
      const response = await getDocuments();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].filename).toBe('document1.pdf');
      expect(result.data[1].filename).toBe('document2.docx');

      // Verify order method was called with correct params
      expect(documentsBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const response = await getDocuments();
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
      const response = await getDocuments();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile found');
    });

    it('returns 500 on database error', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const documentsBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Database connection failed' },
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentsBuilder;
        return createMockQueryBuilder();
      });

      // Act
      const response = await getDocuments();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Database connection failed');
    });

    it('returns empty array when no documents exist', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const documentsBuilder = createMockQueryBuilder({ data: [] });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentsBuilder;
        return createMockQueryBuilder();
      });

      // Act
      const response = await getDocuments();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('POST /api/kb/upload', () => {
    it('validates file exists in form data', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      // Use helper with hasFile: false to simulate no file
      const request = createMockUploadRequest({
        filename: '',
        mimeType: '',
        size: 0,
        hasFile: false,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No file provided');
    });

    it('validates file is not empty', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      // Create mock request with empty file (size: 0)
      const request = createMockUploadRequest({
        filename: 'empty.pdf',
        mimeType: 'application/pdf',
        size: 0,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'File is empty');
    });

    it('validates file size does not exceed 10MB', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      // Create mock request with file larger than 10MB (11MB)
      const request = createMockUploadRequest({
        filename: 'large.pdf',
        mimeType: 'application/pdf',
        size: 11 * 1024 * 1024,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'File too large. Maximum size is 10MB.');
    });

    it('validates file type (MIME type)', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      // Create mock request with invalid MIME type
      const request = createMockUploadRequest({
        filename: 'script.exe',
        mimeType: 'application/x-msdownload',
        size: 100,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'Invalid file type. Allowed: PDF, DOCX, TXT, CSV');
    });

    it('validates file extension', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      // Create mock request with valid MIME but invalid extension
      const request = createMockUploadRequest({
        filename: 'script.js',
        mimeType: 'application/pdf',
        size: 100,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'Invalid file extension. Allowed: PDF, DOCX, TXT, CSV');
    });

    it('successfully uploads a valid PDF file', async () => {
      // Arrange
      const newDocument = createMockDocument({
        id: 'new-doc-123',
        filename: 'pitch-deck.pdf',
        status: 'pending',
      });

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const insertBuilder = createMockQueryBuilder({ data: newDocument });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return insertBuilder;
        return createMockQueryBuilder();
      });

      const storageClient = createMockStorageClient();
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);

      mockInngestSend.mockResolvedValue(undefined);

      // Create mock request with valid PDF file
      const request = createMockUploadRequest({
        filename: 'pitch-deck.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data.id).toBe('new-doc-123');
      expect(result.data.filename).toBe('pitch-deck.pdf');

      // Verify storage upload was called
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('kb-documents');
      expect(storageClient.upload).toHaveBeenCalled();

      // Verify Inngest event was sent
      expect(mockInngestSend).toHaveBeenCalledWith({
        name: 'kb/document.uploaded',
        data: expect.objectContaining({
          documentId: 'new-doc-123',
          startupId: mockStartup.id,
          fileType: 'pdf',
        }),
      });
    });

    it('successfully uploads a valid DOCX file', async () => {
      // Arrange
      const newDocument = createMockDocument({
        id: 'new-doc-456',
        filename: 'business-plan.docx',
        file_type: 'docx',
        status: 'pending',
      });

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const insertBuilder = createMockQueryBuilder({ data: newDocument });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return insertBuilder;
        return createMockQueryBuilder();
      });

      const storageClient = createMockStorageClient();
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);

      mockInngestSend.mockResolvedValue(undefined);

      // Create mock request with valid DOCX file
      const request = createMockUploadRequest({
        filename: 'business-plan.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2048,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.file_type).toBe('docx');
    });

    it('successfully uploads a valid TXT file', async () => {
      // Arrange
      const newDocument = createMockDocument({
        id: 'new-doc-789',
        filename: 'notes.txt',
        file_type: 'txt',
        status: 'pending',
      });

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const insertBuilder = createMockQueryBuilder({ data: newDocument });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return insertBuilder;
        return createMockQueryBuilder();
      });

      const storageClient = createMockStorageClient();
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);

      mockInngestSend.mockResolvedValue(undefined);

      // Create mock request with valid TXT file
      const request = createMockUploadRequest({
        filename: 'notes.txt',
        mimeType: 'text/plain',
        size: 500,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.file_type).toBe('txt');
    });

    it('successfully uploads a valid CSV file', async () => {
      // Arrange
      const newDocument = createMockDocument({
        id: 'new-doc-csv',
        filename: 'data.csv',
        file_type: 'csv',
        status: 'pending',
      });

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const insertBuilder = createMockQueryBuilder({ data: newDocument });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return insertBuilder;
        return createMockQueryBuilder();
      });

      const storageClient = createMockStorageClient();
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);

      mockInngestSend.mockResolvedValue(undefined);

      // Create mock request with valid CSV file
      const request = createMockUploadRequest({
        filename: 'data.csv',
        mimeType: 'text/csv',
        size: 300,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.data.file_type).toBe('csv');
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Auth check happens before file validation, so any request will do
      const request = createMockUploadRequest({
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      // Startup check happens before file validation
      const request = createMockUploadRequest({
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile found');
    });

    it('returns 500 when storage upload fails', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const storageClient = createMockStorageClient({
        uploadError: { message: 'Storage quota exceeded' },
      });
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);

      const request = createMockUploadRequest({
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.error).toContain('Upload failed');
    });

    it('returns 500 and cleans up storage on database insert error', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const insertBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Database constraint violation' },
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return insertBuilder;
        return createMockQueryBuilder();
      });

      const storageClient = createMockStorageClient();
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);

      const request = createMockUploadRequest({
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.error).toContain('Database error');

      // Verify storage cleanup was attempted
      expect(storageClient.remove).toHaveBeenCalled();
    });

    it('continues successfully even if Inngest event fails', async () => {
      // Arrange
      const newDocument = createMockDocument({ id: 'new-doc-inngest-fail' });

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const insertBuilder = createMockQueryBuilder({ data: newDocument });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return insertBuilder;
        return createMockQueryBuilder();
      });

      const storageClient = createMockStorageClient();
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);

      // Make Inngest fail
      mockInngestSend.mockRejectedValue(new Error('Inngest service unavailable'));

      const request = createMockUploadRequest({
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 100,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert - should still succeed
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
    });

    it('accepts file with exact 10MB size', async () => {
      // Arrange
      const newDocument = createMockDocument({ id: 'exact-10mb-doc' });

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const insertBuilder = createMockQueryBuilder({ data: newDocument });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return insertBuilder;
        return createMockQueryBuilder();
      });

      const storageClient = createMockStorageClient();
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);
      mockInngestSend.mockResolvedValue(undefined);

      // Create mock request with exactly 10MB size
      const request = createMockUploadRequest({
        filename: 'exact.pdf',
        mimeType: 'application/pdf',
        size: 10 * 1024 * 1024,
      });

      // Act
      const response = await uploadDocument(request);
      const result = await response.json();

      // Assert - should succeed (10MB is the max allowed)
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
    });
  });

  describe('DELETE /api/kb/[id]', () => {
    const validUUID = '550e8400-e29b-41d4-a716-446655440000';

    it('successfully deletes document with valid UUID', async () => {
      // Arrange
      const document = createMockDocument({
        id: validUUID,
        storage_path: `${mockStartup.id}/12345-test.pdf`,
      });

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const documentBuilder = createMockQueryBuilder({ data: { storage_path: document.storage_path } });
      const deleteBuilder = createMockQueryBuilder({ data: null });

      let fromCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') {
          fromCallCount++;
          // First call is to get document, second is to delete
          if (fromCallCount === 1) return documentBuilder;
          return deleteBuilder;
        }
        return createMockQueryBuilder();
      });

      const storageClient = createMockStorageClient();
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);

      const request = new NextRequest(`http://localhost:3000/api/kb/${validUUID}`, {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: validUUID });

      // Act
      const response = await deleteDocument(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual({ deleted: true, id: validUUID });

      // Verify storage delete was called
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('kb-documents');
      expect(storageClient.remove).toHaveBeenCalledWith([document.storage_path]);
    });

    it('returns 400 for invalid UUID format', async () => {
      // Arrange
      const invalidId = 'not-a-valid-uuid';

      const request = new NextRequest(`http://localhost:3000/api/kb/${invalidId}`, {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: invalidId });

      // Act
      const response = await deleteDocument(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'Invalid document ID format');
    });

    it('returns 400 for malformed UUID', async () => {
      // Arrange - UUID with wrong version (should be 4)
      const malformedUUID = '550e8400-e29b-31d4-a716-446655440000'; // version 3 instead of 4

      const request = new NextRequest(`http://localhost:3000/api/kb/${malformedUUID}`, {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: malformedUUID });

      // Act
      const response = await deleteDocument(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'Invalid document ID format');
    });

    it('returns 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const request = new NextRequest(`http://localhost:3000/api/kb/${validUUID}`, {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: validUUID });

      // Act
      const response = await deleteDocument(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(result).toHaveProperty('error', 'Unauthorized');
    });

    it('returns 400 when user has no startup profile', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: null });
      mockSupabaseClient.from.mockReturnValue(startupBuilder);

      const request = new NextRequest(`http://localhost:3000/api/kb/${validUUID}`, {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: validUUID });

      // Act
      const response = await deleteDocument(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result).toHaveProperty('error', 'No startup profile found');
    });

    it('returns 404 when document does not exist', async () => {
      // Arrange
      const nonExistentUUID = '550e8400-e29b-41d4-a716-446655440001';

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const documentBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'No rows found' },
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/kb/${nonExistentUUID}`, {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: nonExistentUUID });

      // Act
      const response = await deleteDocument(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(result).toHaveProperty('error', 'Document not found');
    });

    it('returns 404 when document belongs to another startup (ownership check)', async () => {
      // Arrange
      const otherUserUUID = '550e8400-e29b-41d4-a716-446655440002';

      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      // Document exists but belongs to another startup - query returns null due to eq constraint
      const documentBuilder = createMockQueryBuilder({ data: null });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') return documentBuilder;
        return createMockQueryBuilder();
      });

      const request = new NextRequest(`http://localhost:3000/api/kb/${otherUserUUID}`, {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: otherUserUUID });

      // Act
      const response = await deleteDocument(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(result).toHaveProperty('error', 'Document not found');
    });

    it('returns 500 on database delete error', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const documentBuilder = createMockQueryBuilder({ data: { storage_path: 'test/path.pdf' } });
      const deleteBuilder = createMockQueryBuilder({
        data: null,
        error: { message: 'Delete operation failed' },
      });

      let fromCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') {
          fromCallCount++;
          if (fromCallCount === 1) return documentBuilder;
          return deleteBuilder;
        }
        return createMockQueryBuilder();
      });

      const storageClient = createMockStorageClient();
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);

      const request = new NextRequest(`http://localhost:3000/api/kb/${validUUID}`, {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: validUUID });

      // Act
      const response = await deleteDocument(request, { params });
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result).toHaveProperty('error', 'Delete operation failed');
    });

    it('continues with database delete even if storage delete fails', async () => {
      // Arrange
      const startupBuilder = createMockQueryBuilder({ data: { id: mockStartup.id } });
      const documentBuilder = createMockQueryBuilder({ data: { storage_path: 'test/path.pdf' } });
      const deleteBuilder = createMockQueryBuilder({ data: null });

      let fromCallCount = 0;
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'startups') return startupBuilder;
        if (table === 'kb_documents') {
          fromCallCount++;
          if (fromCallCount === 1) return documentBuilder;
          return deleteBuilder;
        }
        return createMockQueryBuilder();
      });

      // Storage delete fails
      const storageClient = createMockStorageClient({
        removeError: { message: 'Storage service unavailable' },
      });
      mockSupabaseClient.storage.from.mockReturnValue(storageClient);

      const request = new NextRequest(`http://localhost:3000/api/kb/${validUUID}`, {
        method: 'DELETE',
      });
      const params = Promise.resolve({ id: validUUID });

      // Act
      const response = await deleteDocument(request, { params });
      const result = await response.json();

      // Assert - should still succeed because storage error is logged but not fatal
      expect(response.status).toBe(200);
      expect(result.data).toEqual({ deleted: true, id: validUUID });
    });

    it('validates UUID format with various invalid inputs', async () => {
      // Arrange
      const invalidInputs = [
        'abc',
        '12345',
        'not-a-uuid-at-all',
        '550e8400-e29b-41d4-a716', // too short
        '550e8400-e29b-41d4-a716-4466554400000000', // too long
        '550e8400e29b41d4a716446655440000', // no hyphens
        'gggggggg-gggg-4ggg-8ggg-gggggggggggg', // invalid hex characters
      ];

      for (const invalidId of invalidInputs) {
        const request = new NextRequest(`http://localhost:3000/api/kb/${invalidId}`, {
          method: 'DELETE',
        });
        const params = Promise.resolve({ id: invalidId });

        // Act
        const response = await deleteDocument(request, { params });
        const result = await response.json();

        // Assert
        expect(response.status).toBe(400);
        expect(result).toHaveProperty('error', 'Invalid document ID format');
      }
    });
  });
});
