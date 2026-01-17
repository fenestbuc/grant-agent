/**
 * Mock Claude/Anthropic client for testing
 * Provides predictable responses for unit and integration tests
 */

import { vi } from 'vitest';
import type { AnswerSource, ExtractedMetadata } from '@/types';

/**
 * Mock responses for generateAnswer function
 */
export const mockGeneratedAnswers: Record<string, string> = {
  default:
    'Our startup is focused on building innovative solutions that address key market needs. We have demonstrated strong traction with our target customers and continue to grow our user base.',
  product:
    'We are developing an AI-powered platform that automates document processing for small businesses, reducing manual effort by 80% and improving accuracy.',
  traction:
    'We have onboarded 50+ paying customers in the last 6 months, achieving 25% month-over-month growth with a net promoter score of 72.',
  funding:
    'The grant funding will be used to accelerate product development (40%), expand our sales team (35%), and invest in marketing (25%).',
  team: 'Our founding team combines 15+ years of combined experience in AI/ML, product development, and enterprise sales, with backgrounds from leading tech companies.',
};

/**
 * Mock response for follow-up email generation
 */
export const mockFollowUpEmail = {
  subject: 'Following Up on Grant Application - Test Startup',
  body: `Dear Program Manager,

I hope this message finds you well. I am writing to follow up on our recent application for the Test Grant program.

At Test Startup, we remain enthusiastic about the opportunity to receive your support for our mission to build innovative solutions in our sector. Since our application, we have continued to make progress on our key milestones.

We would welcome the opportunity to discuss our application further or provide any additional information that may be helpful for your review.

Thank you for your consideration. We look forward to hearing from you.

Best regards,
Test Founder`,
};

/**
 * Mock extracted metadata from documents
 */
export const mockExtractedMetadata: ExtractedMetadata = {
  company_name: 'Test Startup Inc',
  sector: 'technology',
  product_description: 'AI-powered document processing platform for small businesses.',
  key_achievements: [
    '50+ paying customers',
    '25% MoM growth',
    'Winner of TechCrunch Disrupt Startup Battlefield',
  ],
  team_info: 'Founded by experienced entrepreneurs with backgrounds from Google and Microsoft.',
  traction: '500+ active users, $50K MRR, growing 25% month-over-month',
  funding_raised: 'Pre-seed: $150K from angel investors',
};

/**
 * Mock match score results
 */
export const mockMatchScoreResults = {
  highMatch: {
    score: 85,
    reasons: ['Sector alignment', 'Stage eligible', 'Revenue criteria met', 'DPIIT registered'],
  },
  mediumMatch: {
    score: 55,
    reasons: ['Stage eligible', 'Revenue criteria met'],
  },
  lowMatch: {
    score: 25,
    reasons: ['Revenue criteria met'],
  },
  noMatch: {
    score: 0,
    reasons: [],
  },
};

/**
 * Create a mock for the generateAnswer function
 */
export function createGenerateAnswerMock() {
  return vi.fn().mockImplementation(
    async ({
      question,
    }: {
      question: string;
      context: AnswerSource[];
      startupName?: string;
      tone?: 'professional' | 'conversational' | 'formal';
      maxLength?: number;
    }): Promise<string> => {
      // Return specific mock based on question content
      if (question.toLowerCase().includes('product') || question.toLowerCase().includes('service')) {
        return mockGeneratedAnswers.product;
      }
      if (question.toLowerCase().includes('traction') || question.toLowerCase().includes('metric')) {
        return mockGeneratedAnswers.traction;
      }
      if (question.toLowerCase().includes('funding') || question.toLowerCase().includes('grant')) {
        return mockGeneratedAnswers.funding;
      }
      if (question.toLowerCase().includes('team') || question.toLowerCase().includes('founder')) {
        return mockGeneratedAnswers.team;
      }
      return mockGeneratedAnswers.default;
    }
  );
}

/**
 * Create a mock for the generateFollowUpEmail function
 */
export function createGenerateFollowUpEmailMock() {
  return vi.fn().mockResolvedValue(mockFollowUpEmail);
}

/**
 * Create a mock for the calculateMatchScore function
 */
export function createCalculateMatchScoreMock(defaultResult = mockMatchScoreResults.highMatch) {
  return vi.fn().mockResolvedValue(defaultResult);
}

/**
 * Create a mock for the extractMetadata function
 */
export function createExtractMetadataMock() {
  return vi.fn().mockResolvedValue(mockExtractedMetadata);
}

/**
 * Mock Anthropic SDK for direct API mocking
 */
export function createMockAnthropicClient() {
  return {
    messages: {
      create: vi.fn().mockImplementation(async () => ({
        id: 'mock-message-id',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: mockGeneratedAnswers.default,
          },
        ],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      })),
    },
  };
}

/**
 * Sets up all Claude mocks for a test suite
 * Call this in beforeEach to reset mocks between tests
 */
export function setupClaudeMocks() {
  const mocks = {
    generateAnswer: createGenerateAnswerMock(),
    generateFollowUpEmail: createGenerateFollowUpEmailMock(),
    calculateMatchScore: createCalculateMatchScoreMock(),
    extractMetadata: createExtractMetadataMock(),
    anthropicClient: createMockAnthropicClient(),
  };

  // Set up module mocks
  vi.mock('@/lib/llm/claude', () => ({
    generateAnswer: mocks.generateAnswer,
    generateFollowUpEmail: mocks.generateFollowUpEmail,
    calculateMatchScore: mocks.calculateMatchScore,
  }));

  vi.mock('@anthropic-ai/sdk', () => ({
    default: vi.fn(() => mocks.anthropicClient),
  }));

  return mocks;
}

/**
 * Clears all Claude mocks
 * Call this in afterEach to clean up
 */
export function clearClaudeMocks() {
  vi.clearAllMocks();
}
