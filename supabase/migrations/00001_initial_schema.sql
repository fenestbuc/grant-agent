-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- GRANTS TABLE
-- ============================================
CREATE TABLE grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('government', 'csr', 'private', 'ngo')),
  description TEXT NOT NULL,
  amount_min BIGINT,
  amount_max BIGINT,
  currency TEXT DEFAULT 'INR',
  deadline TIMESTAMPTZ,
  url TEXT NOT NULL,
  sectors TEXT[] DEFAULT '{}',
  stages TEXT[] DEFAULT '{}',
  eligibility_criteria JSONB DEFAULT '{}',
  application_questions JSONB DEFAULT '[]',
  contact_email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for grants
CREATE INDEX idx_grants_sectors ON grants USING GIN (sectors);
CREATE INDEX idx_grants_stages ON grants USING GIN (stages);
CREATE INDEX idx_grants_eligibility ON grants USING GIN (eligibility_criteria);
CREATE INDEX idx_grants_provider_type ON grants (provider_type);
CREATE INDEX idx_grants_deadline ON grants (deadline) WHERE deadline IS NOT NULL;
CREATE INDEX idx_grants_is_active ON grants (is_active);
CREATE INDEX idx_grants_name_search ON grants USING GIN (to_tsvector('english', name || ' ' || description));

-- ============================================
-- STARTUPS TABLE
-- ============================================
CREATE TABLE startups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sector TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('idea', 'prototype', 'mvp', 'early_revenue', 'growth', 'scaling')),
  founded_date DATE,
  incorporation_date DATE,
  is_dpiit_registered BOOLEAN DEFAULT false,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('proprietorship', 'partnership', 'llp', 'private_limited', 'not_incorporated')),
  state TEXT NOT NULL,
  city TEXT,
  revenue_last_year BIGINT,
  team_size INTEGER DEFAULT 1,
  website TEXT,
  linkedin TEXT,
  is_women_led BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for startups
CREATE INDEX idx_startups_user_id ON startups (user_id);
CREATE INDEX idx_startups_sector ON startups (sector);
CREATE INDEX idx_startups_stage ON startups (stage);
CREATE INDEX idx_startups_state ON startups (state);

-- ============================================
-- KNOWLEDGE BASE DOCUMENTS TABLE
-- ============================================
CREATE TABLE kb_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_metadata JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for kb_documents
CREATE INDEX idx_kb_documents_startup_id ON kb_documents (startup_id);
CREATE INDEX idx_kb_documents_status ON kb_documents (status);

-- ============================================
-- KNOWLEDGE BASE CHUNKS TABLE (with vector embeddings)
-- ============================================
CREATE TABLE kb_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for kb_chunks
CREATE INDEX idx_kb_chunks_document_id ON kb_chunks (document_id);
CREATE INDEX idx_kb_chunks_startup_id ON kb_chunks (startup_id);
CREATE INDEX idx_kb_chunks_embedding ON kb_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================
-- APPLICATIONS TABLE
-- ============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'submitted')),
  answers JSONB DEFAULT '[]',
  match_score INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(startup_id, grant_id)
);

-- Indexes for applications
CREATE INDEX idx_applications_startup_id ON applications (startup_id);
CREATE INDEX idx_applications_grant_id ON applications (grant_id);
CREATE INDEX idx_applications_status ON applications (status);

-- ============================================
-- WATCHLIST TABLE
-- ============================================
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  grant_id UUID NOT NULL REFERENCES grants(id) ON DELETE CASCADE,
  notify_deadline BOOLEAN DEFAULT true,
  notify_changes BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(startup_id, grant_id)
);

-- Indexes for watchlist
CREATE INDEX idx_watchlist_startup_id ON watchlist (startup_id);
CREATE INDEX idx_watchlist_grant_id ON watchlist (grant_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deadline_reminder', 'new_grant', 'grant_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  grant_id UUID REFERENCES grants(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_startup_id ON notifications (startup_id);
CREATE INDEX idx_notifications_is_read ON notifications (is_read);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);

-- ============================================
-- VECTOR SIMILARITY SEARCH FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION match_kb_chunks(
  query_embedding vector(1536),
  match_startup_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb_chunks.id,
    kb_chunks.document_id,
    kb_chunks.content,
    kb_chunks.chunk_index,
    1 - (kb_chunks.embedding <=> query_embedding) AS similarity
  FROM kb_chunks
  WHERE kb_chunks.startup_id = match_startup_id
    AND 1 - (kb_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY kb_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_grants_updated_at
  BEFORE UPDATE ON grants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_startups_updated_at
  BEFORE UPDATE ON startups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_documents_updated_at
  BEFORE UPDATE ON kb_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
