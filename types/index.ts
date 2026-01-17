// Database types for Supabase

export interface Grant {
  id: string;
  name: string;
  provider: string;
  provider_type: 'government' | 'csr' | 'private' | 'ngo';
  description: string;
  amount_min: number | null;
  amount_max: number | null;
  currency: string;
  deadline: string | null;
  url: string;
  sectors: string[];
  stages: string[];
  eligibility_criteria: EligibilityCriteria;
  application_questions: ApplicationQuestion[];
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EligibilityCriteria {
  min_age_months?: number;
  max_age_months?: number;
  min_revenue?: number;
  max_revenue?: number;
  incorporation_required?: boolean;
  dpiit_required?: boolean;
  women_led?: boolean;
  states?: string[];
  entity_types?: string[];
  other?: string[];
}

export interface ApplicationQuestion {
  id: string;
  question: string;
  max_length?: number;
  required: boolean;
}

export interface Startup {
  id: string;
  user_id: string;
  name: string;
  description: string;
  sector: string;
  stage: 'idea' | 'prototype' | 'mvp' | 'early_revenue' | 'growth' | 'scaling';
  founded_date: string | null;
  incorporation_date: string | null;
  is_dpiit_registered: boolean;
  entity_type: 'proprietorship' | 'partnership' | 'llp' | 'private_limited' | 'not_incorporated';
  state: string;
  city: string;
  revenue_last_year: number | null;
  team_size: number;
  website: string | null;
  linkedin: string | null;
  is_women_led: boolean;
  created_at: string;
  updated_at: string;
  // Usage tracking fields (optional - have database defaults)
  answers_generated?: number;
  applications_today?: number;
  last_application_date?: string | null;
}

export interface KBDocument {
  id: string;
  startup_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_metadata: ExtractedMetadata | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedMetadata {
  company_name?: string | null;
  sector?: string | null;
  product_description?: string | null;
  key_achievements?: string[];
  team_info?: string | null;
  traction?: string | null;
  funding_raised?: string | null;
  [key: string]: unknown;
}

export interface KBChunk {
  id: string;
  document_id: string;
  startup_id: string;
  content: string;
  chunk_index: number;
  embedding: number[] | null;
  created_at: string;
}

export interface Application {
  id: string;
  startup_id: string;
  grant_id: string;
  status: 'draft' | 'in_progress' | 'completed' | 'submitted';
  answers: ApplicationAnswer[];
  match_score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationAnswer {
  question_id: string;
  question: string;
  generated_answer: string | null;
  edited_answer: string | null;
  sources: AnswerSource[];
  is_edited: boolean;
}

export interface AnswerSource {
  document_id: string;
  document_name: string;
  chunk_content: string;
  relevance_score: number;
}

export interface Watchlist {
  id: string;
  startup_id: string;
  grant_id: string;
  notify_deadline: boolean;
  notify_changes: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  startup_id: string;
  type: 'deadline_reminder' | 'new_grant' | 'grant_update';
  title: string;
  message: string;
  grant_id: string | null;
  is_read: boolean;
  sent_at: string;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Filter types
export interface GrantFilters {
  sectors?: string[];
  stages?: string[];
  provider_types?: string[];
  amount_min?: number;
  amount_max?: number;
  has_deadline?: boolean;
  search?: string;
}

// Match score response
export interface GrantWithScore extends Grant {
  match_score: number;
  match_reasons: string[];
}

// Answer edit tracking
export interface AnswerEdit {
  id: string;
  application_id: string;
  question_id: string;
  original_answer: string;
  edited_answer: string;
  created_at: string;
}

// User-submitted grants
export interface UserSubmittedGrant {
  id: string;
  startup_id: string;
  url: string;
  is_google_form: boolean;
  name: string | null;
  provider: string | null;
  scraped_questions: ApplicationQuestion[];
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  created_at: string;
}

// Usage status response
export interface UsageStatus {
  answers_generated: number;
  answers_remaining: number;
  applications_today: number;
  applications_remaining_today: number;
  lifetime_limit: number;
  daily_limit: number;
}
