import type { Grant, Startup } from '@/types';

export interface RelevanceResult {
  score: number;
  reasons: string[];
}

/**
 * Compute relevance score for a grant relative to a startup profile.
 * Returns a score from 0-100 and a list of matching reasons.
 */
export function computeRelevanceScore(
  grant: Grant,
  startup: Startup
): RelevanceResult {
  let score = 0;
  const reasons: string[] = [];

  // Sector match: +30 points
  if (grant.sectors.length === 0) {
    // No sector restriction — partial match
    score += 15;
    reasons.push('Open to all sectors');
  } else if (
    startup.sector &&
    grant.sectors.some(
      (s) => s.toLowerCase() === startup.sector.toLowerCase()
    )
  ) {
    score += 30;
    reasons.push('Sector match');
  }

  // Stage match: +25 points
  if (grant.stages.length === 0) {
    // No stage restriction — partial match
    score += 12;
    reasons.push('Open to all stages');
  } else if (
    startup.stage &&
    grant.stages.some(
      (s) => s.toLowerCase() === startup.stage.toLowerCase()
    )
  ) {
    score += 25;
    reasons.push('Stage match');
  }

  // State match: +15 points
  const eligibility = grant.eligibility_criteria;
  if (!eligibility?.states || eligibility.states.length === 0) {
    // No state restriction
    score += 15;
    reasons.push('No state restriction');
  } else if (
    startup.state &&
    eligibility.states.some(
      (s) => s.toLowerCase() === startup.state.toLowerCase()
    )
  ) {
    score += 15;
    reasons.push('State match');
  }

  // Entity type match: +10 points
  if (!eligibility?.entity_types || eligibility.entity_types.length === 0) {
    score += 10;
  } else if (
    startup.entity_type &&
    eligibility.entity_types.some(
      (t) => t.toLowerCase() === startup.entity_type.toLowerCase()
    )
  ) {
    score += 10;
    reasons.push('Entity type match');
  }

  // DPIIT match: +10 points
  if (!eligibility?.dpiit_required) {
    // No DPIIT requirement — no penalty
    score += 10;
  } else if (startup.is_dpiit_registered) {
    score += 10;
    reasons.push('DPIIT registered');
  }

  // Women-led match: +10 points
  if (!eligibility?.women_led) {
    // Not required — no penalty
    score += 10;
  } else if (startup.is_women_led) {
    score += 10;
    reasons.push('Women-led startup');
  }

  // Cap at 100
  return {
    score: Math.min(score, 100),
    reasons,
  };
}
