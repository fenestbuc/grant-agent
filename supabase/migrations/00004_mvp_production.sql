-- Migration: MVP Production Ready
-- Description: Add usage tracking, answer edits, and user-submitted grants

-- ============================================
-- 1. Startups table: Add usage tracking columns
-- ============================================

ALTER TABLE startups ADD COLUMN IF NOT EXISTS answers_generated INTEGER DEFAULT 0;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS applications_today INTEGER DEFAULT 0;
ALTER TABLE startups ADD COLUMN IF NOT EXISTS last_application_date DATE;

-- ============================================
-- 2. Answer edits tracking table
-- ============================================

CREATE TABLE IF NOT EXISTS answer_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  original_answer TEXT NOT NULL,
  edited_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_answer_edits_application_id ON answer_edits(application_id);

-- RLS for answer_edits
ALTER TABLE answer_edits ENABLE ROW LEVEL SECURITY;

-- Users can only view/insert edits for their own applications
CREATE POLICY "Users can view own answer edits" ON answer_edits
  FOR SELECT
  USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN startups s ON a.startup_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own answer edits" ON answer_edits
  FOR INSERT
  WITH CHECK (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN startups s ON a.startup_id = s.id
      WHERE s.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. User-submitted grants table
-- ============================================

CREATE TABLE IF NOT EXISTS user_submitted_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_google_form BOOLEAN DEFAULT false,
  name TEXT,
  provider TEXT,
  scraped_questions JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_submitted_grants_startup_id ON user_submitted_grants(startup_id);
CREATE INDEX IF NOT EXISTS idx_user_submitted_grants_status ON user_submitted_grants(status);

-- RLS for user_submitted_grants
ALTER TABLE user_submitted_grants ENABLE ROW LEVEL SECURITY;

-- Users can view their own submitted grants
CREATE POLICY "Users can view own submitted grants" ON user_submitted_grants
  FOR SELECT
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own submitted grants
CREATE POLICY "Users can insert own submitted grants" ON user_submitted_grants
  FOR INSERT
  WITH CHECK (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can update their own submitted grants (for editing before approval)
CREATE POLICY "Users can update own submitted grants" ON user_submitted_grants
  FOR UPDATE
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 4. RPC function to increment answers generated
-- ============================================

CREATE OR REPLACE FUNCTION increment_answers_generated(p_startup_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last_date DATE;
BEGIN
  -- Get the last application date
  SELECT last_application_date INTO v_last_date
  FROM startups
  WHERE id = p_startup_id;

  -- If it's a new day, reset applications_today
  IF v_last_date IS NULL OR v_last_date < v_today THEN
    UPDATE startups
    SET
      answers_generated = answers_generated + 1,
      applications_today = 1,
      last_application_date = v_today
    WHERE id = p_startup_id;
  ELSE
    -- Same day, just increment
    UPDATE startups
    SET answers_generated = answers_generated + 1
    WHERE id = p_startup_id;
  END IF;
END;
$$;

-- ============================================
-- 5. RPC function to track application usage (per grant per day)
-- ============================================

CREATE OR REPLACE FUNCTION track_application_usage(p_startup_id UUID, p_grant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_last_date DATE;
  v_app_count INTEGER;
  v_result JSONB;
BEGIN
  -- Get current state
  SELECT last_application_date, applications_today INTO v_last_date, v_app_count
  FROM startups
  WHERE id = p_startup_id;

  -- Reset if new day
  IF v_last_date IS NULL OR v_last_date < v_today THEN
    UPDATE startups
    SET
      applications_today = 1,
      last_application_date = v_today
    WHERE id = p_startup_id;

    v_result := jsonb_build_object('new_day', true, 'count', 1);
  ELSE
    -- Same day - increment only if this is a new grant for today
    -- (In MVP, we just increment; smarter tracking can be added later)
    UPDATE startups
    SET applications_today = applications_today + 1
    WHERE id = p_startup_id;

    v_result := jsonb_build_object('new_day', false, 'count', v_app_count + 1);
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================
-- 6. RPC function to get usage status
-- ============================================

CREATE OR REPLACE FUNCTION get_usage_status(p_startup_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_answers INTEGER;
  v_apps_today INTEGER;
  v_last_date DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT answers_generated, applications_today, last_application_date
  INTO v_answers, v_apps_today, v_last_date
  FROM startups
  WHERE id = p_startup_id;

  -- Reset apps_today count if it's a new day
  IF v_last_date IS NULL OR v_last_date < v_today THEN
    v_apps_today := 0;
  END IF;

  RETURN jsonb_build_object(
    'answers_generated', COALESCE(v_answers, 0),
    'answers_remaining', 70 - COALESCE(v_answers, 0),
    'applications_today', COALESCE(v_apps_today, 0),
    'applications_remaining_today', 10 - COALESCE(v_apps_today, 0),
    'lifetime_limit', 70,
    'daily_limit', 10
  );
END;
$$;
