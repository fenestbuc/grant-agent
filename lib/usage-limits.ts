import { createClient } from '@/lib/supabase/server';
import type { UsageStatus } from '@/types';

// Usage limits configuration
export const LIMITS = {
  LIFETIME_ANSWERS: 70,
  DAILY_APPLICATIONS: 10,
} as const;

/**
 * Get current usage status for a startup
 */
export async function getUsageStatus(startupId: string): Promise<UsageStatus> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_usage_status', {
    p_startup_id: startupId,
  });

  if (error) {
    console.error('Error fetching usage status:', error);
    // Return default values on error
    return {
      answers_generated: 0,
      answers_remaining: LIMITS.LIFETIME_ANSWERS,
      applications_today: 0,
      applications_remaining_today: LIMITS.DAILY_APPLICATIONS,
      lifetime_limit: LIMITS.LIFETIME_ANSWERS,
      daily_limit: LIMITS.DAILY_APPLICATIONS,
    };
  }

  return data as UsageStatus;
}

/**
 * Check if user can generate more answers
 */
export async function canGenerateAnswer(startupId: string): Promise<{
  allowed: boolean;
  reason?: string;
  code?: 'LIFETIME_LIMIT_REACHED' | 'DAILY_LIMIT_REACHED';
}> {
  const status = await getUsageStatus(startupId);

  if (status.answers_remaining <= 0) {
    return {
      allowed: false,
      reason: `You have reached the lifetime limit of ${LIMITS.LIFETIME_ANSWERS} AI-generated answers. Please contact support for more.`,
      code: 'LIFETIME_LIMIT_REACHED',
    };
  }

  if (status.applications_remaining_today <= 0) {
    return {
      allowed: false,
      reason: `You have reached the daily limit of ${LIMITS.DAILY_APPLICATIONS} applications. Please try again tomorrow.`,
      code: 'DAILY_LIMIT_REACHED',
    };
  }

  return { allowed: true };
}

/**
 * Increment the answer count after successful generation
 */
export async function incrementAnswerCount(startupId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('increment_answers_generated', {
    p_startup_id: startupId,
  });

  if (error) {
    console.error('Error incrementing answer count:', error);
    throw new Error('Failed to update usage counter');
  }
}

/**
 * Track application usage when first answer is generated for a grant
 */
export async function trackApplicationUsage(
  startupId: string,
  grantId: string
): Promise<{ new_day: boolean; count: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('track_application_usage', {
    p_startup_id: startupId,
    p_grant_id: grantId,
  });

  if (error) {
    console.error('Error tracking application usage:', error);
    throw new Error('Failed to track application usage');
  }

  return data as { new_day: boolean; count: number };
}

/**
 * Format usage status for display
 */
export function formatUsageDisplay(status: UsageStatus): {
  answersText: string;
  applicationsText: string;
  isLow: boolean;
  isCritical: boolean;
} {
  const answersPercent = (status.answers_remaining / status.lifetime_limit) * 100;
  const appsPercent = (status.applications_remaining_today / status.daily_limit) * 100;

  return {
    answersText: `${status.answers_remaining} of ${status.lifetime_limit} answers remaining`,
    applicationsText: `${status.applications_remaining_today} of ${status.daily_limit} applications today`,
    isLow: answersPercent <= 20 || appsPercent <= 20,
    isCritical: status.answers_remaining <= 5 || status.applications_remaining_today <= 1,
  };
}
