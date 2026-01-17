/**
 * Unit tests for lib/llm/claude.ts
 * Tests generateAnswer, generateFollowUpEmail, and calculateMatchScore functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AnswerSource } from '@/types';

// Define mock data locally to avoid importing from mock file that has side effects
const mockGeneratedAnswers = {
  default:
    'Our startup is focused on building innovative solutions that address key market needs. We have demonstrated strong traction with our target customers and continue to grow our user base.',
};

const mockFollowUpEmail = {
  subject: 'Following Up on Grant Application - Test Startup',
  body: `Dear Program Manager,

I hope this message finds you well. I am writing to follow up on our recent application for the Test Grant program.

At Test Startup, we remain enthusiastic about the opportunity to receive your support for our mission to build innovative solutions in our sector. Since our application, we have continued to make progress on our key milestones.

We would welcome the opportunity to discuss our application further or provide any additional information that may be helpful for your review.

Thank you for your consideration. We look forward to hearing from you.

Best regards,
Test Founder`,
};

// Create mock function for Anthropic SDK messages.create
const mockMessagesCreate = vi.fn();

// Mock the Anthropic SDK at module level - must be hoisted
// Use a class to satisfy the `new Anthropic()` constructor call
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn().mockImplementation(function () {
    return {
      messages: {
        create: mockMessagesCreate,
      },
    };
  });
  return { default: MockAnthropic };
});

// Import functions after mocking
import {
  generateAnswer,
  generateFollowUpEmail,
  calculateMatchScore,
} from '@/lib/llm/claude';

describe('lib/llm/claude', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock to default response
    mockMessagesCreate.mockResolvedValue({
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
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateAnswer()', () => {
    const mockContext: AnswerSource[] = [
      {
        document_id: 'doc-1',
        document_name: 'Company Overview.pdf',
        chunk_content:
          'Our startup develops AI-powered solutions for document processing. We have 50+ customers and are growing 25% month-over-month.',
        relevance_score: 0.95,
      },
      {
        document_id: 'doc-2',
        document_name: 'Pitch Deck.pptx',
        chunk_content:
          'Key achievements: Winner of TechCrunch Disrupt, $50K MRR, expanding to 3 new markets.',
        relevance_score: 0.88,
      },
    ];

    it('returns string with mocked response', async () => {
      // Arrange
      const options = {
        question: 'Describe your product or service.',
        context: mockContext,
        startupName: 'Test Startup',
        tone: 'professional' as const,
        maxLength: 500,
      };

      // Act
      const result = await generateAnswer(options);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toBe(mockGeneratedAnswers.default);

      // Verify Anthropic client was called
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Describe your product or service'),
            }),
          ]),
        })
      );
    });

    it('handles empty context', async () => {
      // Arrange
      const options = {
        question: 'What is your business model?',
        context: [], // Empty context
        startupName: 'Empty Context Startup',
        tone: 'professional' as const,
        maxLength: 300,
      };

      // Act
      const result = await generateAnswer(options);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      // Should still return a response even with empty context
      expect(result).toBe(mockGeneratedAnswers.default);

      // Verify Anthropic client was called with empty context
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('What is your business model?'),
            }),
          ]),
        })
      );
    });
  });

  describe('calculateMatchScore()', () => {
    it('returns high score for matching criteria', async () => {
      // Arrange - Create a startup that matches the government grant criteria well
      const matchingStartup = {
        sector: 'technology', // Matches grant sectors
        stage: 'mvp', // Matches grant stages
        revenue: 0, // Within revenue limits (no min/max specified)
        founded_date: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 12 months ago, within 0-24 months
        is_dpiit_registered: true, // DPIIT registered (required)
        is_women_led: false,
        state: 'Karnataka',
        entity_type: 'private_limited', // Matches entity_types
      };

      const matchingGrant = {
        sectors: ['technology', 'healthcare', 'cleantech'],
        stages: ['idea', 'prototype', 'mvp'],
        eligibility_criteria: {
          min_age_months: 0,
          max_age_months: 24,
          incorporation_required: true,
          dpiit_required: true,
          entity_types: ['private_limited', 'llp'],
        },
      };

      // Act
      const result = await calculateMatchScore(matchingStartup, matchingGrant);

      // Assert
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.reasons).toContain('Sector alignment');
      expect(result.reasons).toContain('Stage eligible');
      expect(result.reasons).toContain('DPIIT registered');
      expect(result.reasons).toContain('Entity type eligible');
    });

    it('penalizes missing DPIIT registration', async () => {
      // Arrange - Startup missing DPIIT registration when grant requires it
      const nonDPIITStartup = {
        sector: 'technology',
        stage: 'mvp',
        revenue: 0,
        founded_date: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
        is_dpiit_registered: false, // NOT registered
        is_women_led: false,
        state: 'Karnataka',
        entity_type: 'private_limited',
      };

      const dpiitRequiredGrant = {
        sectors: ['technology'],
        stages: ['mvp'],
        eligibility_criteria: {
          dpiit_required: true, // DPIIT required
          incorporation_required: true,
          entity_types: ['private_limited'],
        },
      };

      // Also test with DPIIT registered startup for comparison
      const dpiitStartup = {
        ...nonDPIITStartup,
        is_dpiit_registered: true,
      };

      // Act
      const resultWithoutDPIIT = await calculateMatchScore(nonDPIITStartup, dpiitRequiredGrant);
      const resultWithDPIIT = await calculateMatchScore(dpiitStartup, dpiitRequiredGrant);

      // Assert - Score should be lower without DPIIT
      expect(resultWithoutDPIIT.score).toBeLessThan(resultWithDPIIT.score);
      expect(resultWithoutDPIIT.reasons).toContain('DPIIT registration required');
      expect(resultWithDPIIT.reasons).toContain('DPIIT registered');

      // The penalty is -10 points, so the difference should be at least 15 points
      // (5 bonus for having DPIIT + 10 penalty removed = 15 point swing)
      expect(resultWithDPIIT.score - resultWithoutDPIIT.score).toBeGreaterThanOrEqual(15);
    });

    it('gives bonus for women-led startups when grant criteria matches', async () => {
      // Arrange
      const womenLedStartup = {
        sector: 'technology',
        stage: 'mvp',
        revenue: 0,
        founded_date: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_dpiit_registered: false,
        is_women_led: true, // Women-led
        state: 'Karnataka',
        entity_type: 'private_limited',
      };

      const womenLedGrant = {
        sectors: ['technology'],
        stages: ['mvp'],
        eligibility_criteria: {
          women_led: true, // Bonus for women-led
        },
      };

      const notWomenLedStartup = {
        ...womenLedStartup,
        is_women_led: false,
      };

      // Act
      const resultWomenLed = await calculateMatchScore(womenLedStartup, womenLedGrant);
      const resultNotWomenLed = await calculateMatchScore(notWomenLedStartup, womenLedGrant);

      // Assert
      expect(resultWomenLed.score).toBeGreaterThan(resultNotWomenLed.score);
      expect(resultWomenLed.reasons).toContain('Women-led startup bonus');
    });

    it('handles open/any sector grants', async () => {
      // Arrange
      const startup = {
        sector: 'fintech',
        stage: 'growth',
        revenue: 1000000,
        founded_date: new Date(Date.now() - 24 * 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_dpiit_registered: false,
        is_women_led: false,
        state: 'Maharashtra',
        entity_type: 'private_limited',
      };

      const openSectorGrant = {
        sectors: ['all'], // Open to all sectors
        stages: ['growth'],
        eligibility_criteria: {},
      };

      const emptySectorGrant = {
        sectors: [], // Empty sectors means open to all
        stages: ['growth'],
        eligibility_criteria: {},
      };

      // Act
      const resultAll = await calculateMatchScore(startup, openSectorGrant);
      const resultEmpty = await calculateMatchScore(startup, emptySectorGrant);

      // Assert - Both should give sector points
      expect(resultAll.reasons).toContain('Sector alignment');
      expect(resultEmpty.reasons).toContain('Open to all sectors');
    });
  });

  describe('generateFollowUpEmail()', () => {
    it('returns subject and body', async () => {
      // Arrange - Set up mock response for email generation
      mockMessagesCreate.mockResolvedValueOnce({
        id: 'mock-message-id',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockFollowUpEmail),
          },
        ],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 150,
          output_tokens: 200,
        },
      });

      const options = {
        grantName: 'Startup India Seed Fund',
        startupName: 'Test Startup Inc',
        startupDescription: 'AI-powered document processing platform',
        keyAchievements: [
          '50+ paying customers',
          '25% MoM growth',
          'Winner of TechCrunch Disrupt',
        ],
        senderName: 'John Doe',
        recipientTitle: 'Program Director',
      };

      // Act
      const result = await generateFollowUpEmail(options);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
      expect(typeof result.subject).toBe('string');
      expect(typeof result.body).toBe('string');
      expect(result.subject.length).toBeGreaterThan(0);
      expect(result.body.length).toBeGreaterThan(0);

      // Verify the mock was called with correct parameters
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('Startup India Seed Fund'),
            }),
          ]),
        })
      );
    });

    it('handles empty achievements', async () => {
      // Arrange
      mockMessagesCreate.mockResolvedValueOnce({
        id: 'mock-message-id',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              subject: 'Follow Up - Grant Application',
              body: 'Thank you for considering our application.',
            }),
          },
        ],
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      });

      const options = {
        grantName: 'Test Grant',
        startupName: 'Test Startup',
        startupDescription: 'A test startup',
        keyAchievements: [], // Empty achievements
        senderName: 'Jane Smith',
      };

      // Act
      const result = await generateFollowUpEmail(options);

      // Assert
      expect(result).toBeDefined();
      expect(result.subject).toBeDefined();
      expect(result.body).toBeDefined();
    });
  });
});
