/**
 * Test fixtures for Grant entities
 * Covers various provider types (government, csr, private) and different eligibility criteria
 */

import type { Grant, EligibilityCriteria, ApplicationQuestion } from '@/types';

// Helper to generate a unique ID for testing
export const generateGrantId = () => `grant-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Common application questions used across fixtures
const commonQuestions: ApplicationQuestion[] = [
  {
    id: 'q1',
    question: 'Describe your product or service and the problem it solves.',
    max_length: 2000,
    required: true,
  },
  {
    id: 'q2',
    question: 'What is your current traction and key metrics?',
    max_length: 1500,
    required: true,
  },
  {
    id: 'q3',
    question: 'How will you use the grant funding?',
    max_length: 1000,
    required: true,
  },
];

/**
 * Government grant fixture - Startup India Seed Fund
 * Targets early-stage DPIIT-registered startups
 */
export const governmentGrant: Grant = {
  id: 'grant-govt-seed-fund',
  name: 'Startup India Seed Fund Scheme',
  provider: 'Department for Promotion of Industry and Internal Trade (DPIIT)',
  provider_type: 'government',
  description:
    'Seed funding support for startups to develop proof of concept, prototype development, product trials, market entry, and commercialization.',
  amount_min: 500000,
  amount_max: 5000000,
  currency: 'INR',
  deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
  url: 'https://seedfund.startupindia.gov.in/',
  sectors: ['technology', 'healthcare', 'cleantech', 'agriculture', 'education'],
  stages: ['idea', 'prototype', 'mvp'],
  eligibility_criteria: {
    min_age_months: 0,
    max_age_months: 24,
    incorporation_required: true,
    dpiit_required: true,
    entity_types: ['private_limited', 'llp'],
    other: ['Must not have received more than INR 10 lakhs monetary support under any Central/State scheme'],
  },
  application_questions: [
    ...commonQuestions,
    {
      id: 'q4',
      question: 'Provide details of your DPIIT recognition and incorporation documents.',
      max_length: 500,
      required: true,
    },
  ],
  contact_email: 'seedfund@startupindia.gov.in',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * CSR grant fixture - Corporate Innovation Fund
 * Targets growth-stage startups in specific sectors
 */
export const csrGrant: Grant = {
  id: 'grant-csr-innovation',
  name: 'TechCorp Innovation Challenge',
  provider: 'TechCorp Foundation',
  provider_type: 'csr',
  description:
    'Annual innovation challenge supporting startups working on sustainable technology solutions for rural India.',
  amount_min: 1000000,
  amount_max: 10000000,
  currency: 'INR',
  deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days from now
  url: 'https://techcorp-foundation.example.com/innovation-challenge',
  sectors: ['cleantech', 'agriculture', 'healthcare'],
  stages: ['mvp', 'early_revenue', 'growth'],
  eligibility_criteria: {
    min_age_months: 12,
    max_age_months: 60,
    min_revenue: 100000,
    max_revenue: 50000000,
    incorporation_required: true,
    states: ['Karnataka', 'Maharashtra', 'Tamil Nadu', 'Telangana', 'Gujarat'],
    entity_types: ['private_limited'],
    other: ['Must have a working prototype or live product', 'Focus on rural impact'],
  },
  application_questions: [
    ...commonQuestions,
    {
      id: 'q4',
      question: 'Describe your social or environmental impact metrics.',
      max_length: 1500,
      required: true,
    },
    {
      id: 'q5',
      question: 'What is your plan for scaling to rural areas?',
      max_length: 1000,
      required: false,
    },
  ],
  contact_email: 'grants@techcorp-foundation.example.com',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Private grant fixture - Women-led Startup Fund
 * Specifically for women-led startups
 */
export const privateGrant: Grant = {
  id: 'grant-private-women',
  name: 'Women Founders Accelerator Grant',
  provider: 'Empowerment Ventures',
  provider_type: 'private',
  description:
    'Grant program supporting women-led startups across India with funding, mentorship, and network access.',
  amount_min: 2500000,
  amount_max: 15000000,
  currency: 'INR',
  deadline: null, // Rolling applications
  url: 'https://empowerment-ventures.example.com/women-founders',
  sectors: ['technology', 'fintech', 'healthcare', 'education', 'ecommerce'],
  stages: ['prototype', 'mvp', 'early_revenue'],
  eligibility_criteria: {
    min_age_months: 6,
    max_age_months: 48,
    women_led: true,
    incorporation_required: true,
    entity_types: ['private_limited', 'llp', 'partnership'],
    other: ['Founder or co-founder must hold at least 51% equity', 'Must be operational in India'],
  },
  application_questions: [
    ...commonQuestions,
    {
      id: 'q4',
      question: 'Tell us about the founding team and their backgrounds.',
      max_length: 1500,
      required: true,
    },
  ],
  contact_email: 'apply@empowerment-ventures.example.com',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Inactive grant fixture - for testing inactive grant filtering
 */
export const inactiveGrant: Grant = {
  id: 'grant-inactive-old',
  name: 'Legacy Startup Support Program',
  provider: 'Defunct Foundation',
  provider_type: 'ngo',
  description: 'This program has been discontinued.',
  amount_min: 100000,
  amount_max: 500000,
  currency: 'INR',
  deadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago (expired)
  url: 'https://defunct.example.com',
  sectors: ['technology'],
  stages: ['idea'],
  eligibility_criteria: {},
  application_questions: [],
  contact_email: null,
  is_active: false,
  created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

/**
 * All grant fixtures as an array
 */
export const allGrantFixtures: Grant[] = [governmentGrant, csrGrant, privateGrant, inactiveGrant];

/**
 * Only active grant fixtures
 */
export const activeGrantFixtures: Grant[] = [governmentGrant, csrGrant, privateGrant];

/**
 * Factory function to create a custom grant fixture
 */
export function createGrantFixture(overrides: Partial<Grant> = {}): Grant {
  const now = new Date().toISOString();
  return {
    id: generateGrantId(),
    name: 'Test Grant',
    provider: 'Test Provider',
    provider_type: 'government',
    description: 'A test grant for unit testing.',
    amount_min: 100000,
    amount_max: 1000000,
    currency: 'INR',
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    url: 'https://test-grant.example.com',
    sectors: ['technology'],
    stages: ['mvp'],
    eligibility_criteria: {},
    application_questions: commonQuestions,
    contact_email: 'test@example.com',
    is_active: true,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Factory function to create eligibility criteria
 */
export function createEligibilityCriteria(overrides: Partial<EligibilityCriteria> = {}): EligibilityCriteria {
  return {
    min_age_months: 0,
    max_age_months: 24,
    incorporation_required: false,
    dpiit_required: false,
    ...overrides,
  };
}
