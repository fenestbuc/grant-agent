/**
 * Mock OpenAI client for testing
 * Provides predictable responses for embedding generation tests
 */

import { vi } from 'vitest';

/**
 * Fixed embedding vector dimensions (matching text-embedding-3-large with 1536 dimensions)
 */
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate a deterministic mock embedding vector
 * Uses a simple hash-based approach to generate consistent embeddings for the same input
 */
function generateMockEmbedding(text: string): number[] {
  const embedding: number[] = new Array(EMBEDDING_DIMENSIONS).fill(0);

  // Simple hash to seed the embedding values
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Generate embedding values based on hash
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    // Create a deterministic but varied value between -1 and 1
    const seed = (hash * (i + 1)) % 1000000;
    embedding[i] = (Math.sin(seed) + Math.cos(seed * 0.1)) / 2;
  }

  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

/**
 * Mock embedding response structure
 */
interface MockEmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Create mock embedding response for a batch of inputs
 */
function createMockEmbeddingResponse(inputs: string[]): MockEmbeddingResponse {
  return {
    object: 'list',
    data: inputs.map((input, index) => ({
      object: 'embedding',
      embedding: generateMockEmbedding(input),
      index,
    })),
    model: 'text-embedding-3-large',
    usage: {
      prompt_tokens: inputs.reduce((sum, input) => sum + Math.ceil(input.length / 4), 0),
      total_tokens: inputs.reduce((sum, input) => sum + Math.ceil(input.length / 4), 0),
    },
  };
}

/**
 * Create a mock for OpenAI embeddings.create
 */
export function createEmbeddingsCreateMock() {
  return vi.fn().mockImplementation(
    async ({
      input,
    }: {
      model: string;
      input: string | string[];
      dimensions?: number;
    }): Promise<MockEmbeddingResponse> => {
      const inputs = Array.isArray(input) ? input : [input];
      return createMockEmbeddingResponse(inputs);
    }
  );
}

/**
 * Create a mock OpenAI client
 */
export function createMockOpenAIClient() {
  const embeddingsCreateMock = createEmbeddingsCreateMock();

  return {
    embeddings: {
      create: embeddingsCreateMock,
    },
    // Add other OpenAI API mocks as needed
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  };
}

/**
 * Pre-computed mock embeddings for common test scenarios
 */
export const mockEmbeddings = {
  // Startup description embedding
  startupDescription: generateMockEmbedding(
    'AI-powered document processing platform for small businesses'
  ),

  // Grant question embeddings
  productQuestion: generateMockEmbedding('Describe your product or service'),
  tractionQuestion: generateMockEmbedding('What is your current traction'),
  fundingQuestion: generateMockEmbedding('How will you use the grant funding'),

  // Document chunk embeddings
  aboutUsChunk: generateMockEmbedding(
    'We are building an AI platform that helps small businesses automate their document workflows'
  ),
  metricsChunk: generateMockEmbedding(
    'We have 50 paying customers and 25% month-over-month growth'
  ),
  teamChunk: generateMockEmbedding(
    'Our founding team has 15 years of combined experience in AI and enterprise software'
  ),
};

/**
 * Calculate cosine similarity between two embedding vectors
 * Useful for testing similarity search functionality
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embedding vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/**
 * Create a mock for the generateEmbeddings function from document-processor
 */
export function createGenerateEmbeddingsMock() {
  return vi.fn().mockImplementation(
    async (
      chunks: string[]
    ): Promise<Array<{ content: string; embedding: number[] }>> => {
      return chunks.map((content) => ({
        content,
        embedding: generateMockEmbedding(content),
      }));
    }
  );
}

/**
 * Create a mock for the generateQueryEmbedding function
 */
export function createGenerateQueryEmbeddingMock() {
  return vi.fn().mockImplementation(async (query: string): Promise<number[]> => {
    return generateMockEmbedding(query);
  });
}

/**
 * Sets up all OpenAI mocks for a test suite
 */
export function setupOpenAIMocks() {
  const mocks = {
    generateEmbeddings: createGenerateEmbeddingsMock(),
    generateQueryEmbedding: createGenerateQueryEmbeddingMock(),
    openaiClient: createMockOpenAIClient(),
  };

  vi.mock('@/lib/llm/document-processor', () => ({
    generateEmbeddings: mocks.generateEmbeddings,
    generateQueryEmbedding: mocks.generateQueryEmbedding,
    extractTextFromFile: vi.fn().mockResolvedValue('Mock extracted text content'),
    extractMetadata: vi.fn().mockResolvedValue({
      company_name: 'Test Startup',
      sector: 'technology',
      product_description: 'Test product',
      key_achievements: [],
      team_info: null,
      traction: null,
      funding_raised: null,
    }),
    chunkText: vi.fn().mockImplementation((text: string) => {
      // Simple chunking implementation for tests
      const chunkSize = 500;
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
      }
      return chunks.length > 0 ? chunks : [text];
    }),
  }));

  vi.mock('openai', () => ({
    default: vi.fn(() => mocks.openaiClient),
  }));

  return mocks;
}

/**
 * Clears all OpenAI mocks
 */
export function clearOpenAIMocks() {
  vi.clearAllMocks();
}

/**
 * Export the mock embedding generator for custom test scenarios
 */
export { generateMockEmbedding };
