/**
 * Test fixtures for Startup entities
 * Covers various stages, sectors, and entity types
 */

import type { Startup } from '@/types';

// Helper to generate unique IDs for testing
export const generateStartupId = () => `startup-test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
export const generateUserId = () => `user-test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

/**
 * Early-stage tech startup fixture
 * Idea stage, not yet incorporated, based in Bangalore
 */
export const ideaStageStartup: Startup = {
  id: 'startup-idea-tech',
  user_id: 'user-idea-tech',
  name: 'InnovateTech Solutions',
  description:
    'Building an AI-powered platform for automated document processing for small businesses.',
  sector: 'technology',
  stage: 'idea',
  founded_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
  incorporation_date: null,
  is_dpiit_registered: false,
  entity_type: 'not_incorporated',
  state: 'Karnataka',
  city: 'Bangalore',
  revenue_last_year: null,
  team_size: 2,
  website: null,
  linkedin: 'https://linkedin.com/company/innovatetech-solutions',
  is_women_led: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * MVP-stage healthtech startup fixture
 * DPIIT registered, private limited, based in Mumbai
 */
export const mvpStageStartup: Startup = {
  id: 'startup-mvp-health',
  user_id: 'user-mvp-health',
  name: 'HealthFirst Diagnostics',
  description:
    'Mobile-first diagnostic platform connecting patients with certified labs for home sample collection and digital reports.',
  sector: 'healthcare',
  stage: 'mvp',
  founded_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year ago
  incorporation_date: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(), // 10 months ago
  is_dpiit_registered: true,
  entity_type: 'private_limited',
  state: 'Maharashtra',
  city: 'Mumbai',
  revenue_last_year: 250000,
  team_size: 8,
  website: 'https://healthfirst.example.com',
  linkedin: 'https://linkedin.com/company/healthfirst-diagnostics',
  is_women_led: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Growth-stage women-led cleantech startup fixture
 * Well-established, significant revenue, based in Chennai
 */
export const growthStageStartup: Startup = {
  id: 'startup-growth-cleantech',
  user_id: 'user-growth-cleantech',
  name: 'GreenWave Energy',
  description:
    'Developing affordable solar-powered irrigation systems for smallholder farmers in rural India.',
  sector: 'cleantech',
  stage: 'growth',
  founded_date: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 3 years ago
  incorporation_date: new Date(Date.now() - 2.5 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2.5 years ago
  is_dpiit_registered: true,
  entity_type: 'private_limited',
  state: 'Tamil Nadu',
  city: 'Chennai',
  revenue_last_year: 15000000,
  team_size: 35,
  website: 'https://greenwave.example.com',
  linkedin: 'https://linkedin.com/company/greenwave-energy',
  is_women_led: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Prototype-stage fintech startup fixture
 * LLP entity, based in Hyderabad
 */
export const prototypeStageStartup: Startup = {
  id: 'startup-prototype-fintech',
  user_id: 'user-prototype-fintech',
  name: 'PayEasy Finance',
  description:
    'Building a UPI-based micro-lending platform for street vendors and small shop owners.',
  sector: 'fintech',
  stage: 'prototype',
  founded_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
  incorporation_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 4 months ago
  is_dpiit_registered: false,
  entity_type: 'llp',
  state: 'Telangana',
  city: 'Hyderabad',
  revenue_last_year: null,
  team_size: 4,
  website: null,
  linkedin: 'https://linkedin.com/company/payeasy-finance',
  is_women_led: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * All startup fixtures as an array
 */
export const allStartupFixtures: Startup[] = [
  ideaStageStartup,
  mvpStageStartup,
  growthStageStartup,
  prototypeStageStartup,
];

/**
 * Startups by stage mapping
 */
export const startupsByStage = {
  idea: ideaStageStartup,
  prototype: prototypeStageStartup,
  mvp: mvpStageStartup,
  early_revenue: createStartupFixture({ ...mvpStageStartup, stage: 'early_revenue', name: 'Early Revenue Startup' }),
  growth: growthStageStartup,
  scaling: createStartupFixture({ ...growthStageStartup, stage: 'scaling', name: 'Scaling Startup' }),
};

/**
 * Factory function to create a custom startup fixture
 */
export function createStartupFixture(overrides: Partial<Startup> = {}): Startup {
  const now = new Date().toISOString();
  return {
    id: generateStartupId(),
    user_id: generateUserId(),
    name: 'Test Startup',
    description: 'A test startup for unit testing.',
    sector: 'technology',
    stage: 'mvp',
    founded_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    incorporation_date: null,
    is_dpiit_registered: false,
    entity_type: 'not_incorporated',
    state: 'Karnataka',
    city: 'Bangalore',
    revenue_last_year: null,
    team_size: 3,
    website: null,
    linkedin: null,
    is_women_led: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/**
 * Factory function to create a startup that matches government grant eligibility
 */
export function createDPIITEligibleStartup(overrides: Partial<Startup> = {}): Startup {
  return createStartupFixture({
    stage: 'mvp',
    is_dpiit_registered: true,
    entity_type: 'private_limited',
    incorporation_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    founded_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  });
}

/**
 * Factory function to create a women-led startup
 */
export function createWomenLedStartup(overrides: Partial<Startup> = {}): Startup {
  return createStartupFixture({
    is_women_led: true,
    name: 'Women-Led Test Startup',
    ...overrides,
  });
}
