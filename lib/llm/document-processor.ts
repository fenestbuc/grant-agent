import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import type { ExtractedMetadata } from '@/types';

// Lazy-loaded clients to avoid build-time initialization errors
let _anthropic: Anthropic | null = null;
let _openai: OpenAI | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

/**
 * Extract text content from uploaded files
 */
export async function extractTextFromFile(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType.toLowerCase()) {
    case 'pdf':
    case 'application/pdf':
      const pdfParser = new PDFParse({ data: buffer });
      const textResult = await pdfParser.getText();
      return textResult.text;

    case 'docx':
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      const docxResult = await mammoth.extractRawText({ buffer });
      return docxResult.value;

    case 'txt':
    case 'text/plain':
      return buffer.toString('utf-8');

    case 'csv':
    case 'text/csv':
      return buffer.toString('utf-8');

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Extract metadata from document text using Claude
 */
export async function extractMetadata(text: string): Promise<ExtractedMetadata> {
  const truncatedText = text.slice(0, 15000); // Limit context

  const response = await getAnthropic().messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Analyze this startup document and extract key metadata. Return a JSON object with these fields (use null for missing info):

{
  "company_name": "string or null",
  "sector": "string or null (e.g., fintech, healthtech, edtech, etc.)",
  "product_description": "string or null (1-2 sentence summary)",
  "key_achievements": ["array of strings or empty array"],
  "team_info": "string or null (brief team description)",
  "traction": "string or null (users, revenue, growth metrics)",
  "funding_raised": "string or null"
}

Document text:
${truncatedText}

Return ONLY the JSON object, no other text.`,
      },
    ],
  });

  try {
    const content = response.content[0];
    if (content.type === 'text') {
      return JSON.parse(content.text);
    }
    throw new Error('Unexpected response format');
  } catch {
    return {
      company_name: null,
      sector: null,
      product_description: null,
      key_achievements: [],
      team_info: null,
      traction: null,
      funding_raised: null,
    };
  }
}

/**
 * Split text into overlapping chunks for embedding
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunk = text.slice(start, end);

    // Try to end at a sentence boundary
    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf('.');
      const lastNewline = chunk.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > chunkSize * 0.7) {
        chunk = chunk.slice(0, breakPoint + 1);
      }
    }

    chunk = chunk.trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = start + chunk.length - overlap;
    if (start >= text.length - overlap) break;
  }

  return chunks;
}

/**
 * Generate embeddings for text chunks using OpenAI
 */
export async function generateEmbeddings(
  chunks: string[]
): Promise<Array<{ content: string; embedding: number[] }>> {
  const results: Array<{ content: string; embedding: number[] }> = [];

  // Process in batches of 20
  const batchSize = 20;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const response = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-large',
      input: batch,
      dimensions: 1536, // Reduced dimensions for cost/performance balance
    });

    batch.forEach((content, index) => {
      results.push({
        content,
        embedding: response.data[index].embedding,
      });
    });
  }

  return results;
}

/**
 * Generate a single embedding for a query
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}
