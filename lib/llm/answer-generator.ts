import OpenAI from 'openai';
import type { AnswerSource } from '@/types';

// Lazy-loaded client to avoid build-time initialization errors
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

interface GenerateAnswerOptions {
  question: string;
  context: AnswerSource[];
  startupName?: string;
  tone?: 'professional' | 'conversational' | 'formal';
  maxLength?: number;
}

/**
 * Generate an answer to a grant application question using RAG
 * Uses GPT-4o-mini for cost-effective generation
 */
export async function generateAnswer({
  question,
  context,
  startupName,
  tone = 'professional',
  maxLength = 500,
}: GenerateAnswerOptions): Promise<string> {
  const contextText = context
    .map((source) => `[From ${source.document_name}]:\n${source.chunk_content}`)
    .join('\n\n');

  const toneInstructions = {
    professional:
      'Write in a professional, confident tone suitable for a formal grant application.',
    conversational:
      'Write in a friendly, approachable tone while remaining professional.',
    formal:
      'Write in a highly formal, academic tone with precise language.',
  };

  const systemPrompt = `You are an expert grant application writer helping Indian startups secure funding.

CRITICAL RULES:
1. Never mention word counts, character limits, or say "Word count: X out of Y" in your output
2. Never include meta-commentary about the answer length or format
3. Write the answer directly without any preamble like "Here is your answer:" or "Answer:"
4. Be specific and use concrete details from the provided context
5. If context is limited, write a reasonable answer based on the startup profile that the founder can edit

Your answers should be compelling, specific, and directly address the question asked.`;

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `You are helping ${startupName || 'a startup'} write a grant application answer.

Question: ${question}

Use the following context from the startup's knowledge base to craft a compelling answer:

${contextText || 'No documents provided - use the startup profile information.'}

Guidelines:
- ${toneInstructions[tone]}
- Keep the answer concise and under ${maxLength} characters
- Be specific and use concrete details from the context
- If the context doesn't contain relevant information, write a general but honest answer
- Highlight achievements, traction, and unique value propositions when relevant
- Do not make up information not present in the context

Write the answer directly:`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Unexpected response format from OpenAI');
  }

  return content.trim();
}

interface GenerateEmailOptions {
  grantName: string;
  startupName: string;
  startupDescription: string;
  keyAchievements: string[];
  senderName: string;
  recipientTitle?: string;
}

/**
 * Generate a follow-up email for a grant application
 */
export async function generateFollowUpEmail({
  grantName,
  startupName,
  startupDescription,
  keyAchievements,
  senderName,
  recipientTitle = 'Program Manager',
}: GenerateEmailOptions): Promise<{ subject: string; body: string }> {
  const achievementsText = keyAchievements.length
    ? keyAchievements.map((a) => `• ${a}`).join('\n')
    : 'Building innovative solutions in our sector';

  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: 'You are a professional email writer helping startups follow up on grant applications. Return only valid JSON.',
      },
      {
        role: 'user',
        content: `Generate a professional follow-up email for a grant application.

Grant: ${grantName}
Startup: ${startupName}
Description: ${startupDescription}
Key Achievements:
${achievementsText}
Sender Name: ${senderName}
Recipient Title: ${recipientTitle}

Write a concise, professional email that:
1. Expresses continued interest in the grant
2. Briefly reinforces why the startup is a good fit
3. Offers to provide additional information
4. Ends with a clear call to action

Return a JSON object with "subject" and "body" fields. The body should be plain text with proper line breaks.
Return ONLY the JSON object.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Unexpected response format from OpenAI');
  }

  return JSON.parse(content);
}

/**
 * Calculate match score and reasons for a grant
 * This is a pure calculation function - no LLM needed
 */
export async function calculateMatchScore(
  startup: {
    sector: string;
    stage: string;
    revenue: number | null;
    founded_date: string | null;
    is_dpiit_registered: boolean;
    is_women_led: boolean;
    state: string;
    entity_type: string;
  },
  grant: {
    sectors: string[];
    stages: string[];
    eligibility_criteria: {
      min_age_months?: number;
      max_age_months?: number;
      min_revenue?: number;
      max_revenue?: number;
      incorporation_required?: boolean;
      dpiit_required?: boolean;
      women_led?: boolean;
      states?: string[];
      entity_types?: string[];
    };
  }
): Promise<{ score: number; reasons: string[] }> {
  let score = 0;
  const reasons: string[] = [];

  // Sector match (40%)
  const sectorMatch = grant.sectors.some(
    (s) =>
      s.toLowerCase() === startup.sector.toLowerCase() ||
      s.toLowerCase() === 'all' ||
      s.toLowerCase() === 'any'
  );
  if (sectorMatch) {
    score += 40;
    reasons.push('Sector alignment');
  } else if (grant.sectors.length === 0) {
    score += 40;
    reasons.push('Open to all sectors');
  }

  // Stage match (15%)
  const stageMatch =
    grant.stages.length === 0 ||
    grant.stages.some((s) => s.toLowerCase() === startup.stage.toLowerCase());
  if (stageMatch) {
    score += 15;
    reasons.push('Stage eligible');
  }

  // Revenue eligibility (20%)
  const { min_revenue, max_revenue } = grant.eligibility_criteria;
  const revenue = startup.revenue || 0;
  if (
    (min_revenue === undefined || revenue >= min_revenue) &&
    (max_revenue === undefined || revenue <= max_revenue)
  ) {
    score += 20;
    reasons.push('Revenue criteria met');
  }

  // Age requirements (10%)
  if (startup.founded_date) {
    const ageMonths = Math.floor(
      (Date.now() - new Date(startup.founded_date).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
    );
    const { min_age_months, max_age_months } = grant.eligibility_criteria;
    if (
      (min_age_months === undefined || ageMonths >= min_age_months) &&
      (max_age_months === undefined || ageMonths <= max_age_months)
    ) {
      score += 10;
      reasons.push('Company age eligible');
    }
  } else {
    score += 5; // Partial score if no age info
  }

  // Entity type (5%)
  const { entity_types, incorporation_required } = grant.eligibility_criteria;
  if (
    !incorporation_required ||
    startup.entity_type !== 'not_incorporated'
  ) {
    if (
      !entity_types ||
      entity_types.length === 0 ||
      entity_types.includes(startup.entity_type)
    ) {
      score += 5;
      reasons.push('Entity type eligible');
    }
  }

  // Bonus: DPIIT (5%)
  if (grant.eligibility_criteria.dpiit_required) {
    if (startup.is_dpiit_registered) {
      score += 5;
      reasons.push('DPIIT registered');
    } else {
      score -= 10; // Penalty for missing required DPIIT
      reasons.push('DPIIT registration required');
    }
  }

  // Bonus: Women-led (5%)
  if (grant.eligibility_criteria.women_led && startup.is_women_led) {
    score += 5;
    reasons.push('Women-led startup bonus');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}
