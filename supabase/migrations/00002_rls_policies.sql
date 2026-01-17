-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- GRANTS POLICIES (Public read, admin write)
-- ============================================
-- Anyone can read active grants
CREATE POLICY "Grants are viewable by everyone"
  ON grants FOR SELECT
  USING (is_active = true);

-- Only service role can insert/update/delete grants
-- (handled by using service role key for scraper/admin operations)

-- ============================================
-- STARTUPS POLICIES
-- ============================================
-- Users can only view their own startup
CREATE POLICY "Users can view own startup"
  ON startups FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own startup
CREATE POLICY "Users can create own startup"
  ON startups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own startup
CREATE POLICY "Users can update own startup"
  ON startups FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own startup
CREATE POLICY "Users can delete own startup"
  ON startups FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- KB_DOCUMENTS POLICIES
-- ============================================
-- Users can view documents for their startup
CREATE POLICY "Users can view own documents"
  ON kb_documents FOR SELECT
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can insert documents for their startup
CREATE POLICY "Users can create documents for own startup"
  ON kb_documents FOR INSERT
  WITH CHECK (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
  ON kb_documents FOR UPDATE
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
  ON kb_documents FOR DELETE
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- KB_CHUNKS POLICIES
-- ============================================
-- Users can view chunks for their startup
CREATE POLICY "Users can view own chunks"
  ON kb_chunks FOR SELECT
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Chunks are created by backend (service role), no insert policy for users

-- ============================================
-- APPLICATIONS POLICIES
-- ============================================
-- Users can view their own applications
CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can create applications for their startup
CREATE POLICY "Users can create applications for own startup"
  ON applications FOR INSERT
  WITH CHECK (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can update their own applications
CREATE POLICY "Users can update own applications"
  ON applications FOR UPDATE
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own applications
CREATE POLICY "Users can delete own applications"
  ON applications FOR DELETE
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- WATCHLIST POLICIES
-- ============================================
-- Users can view their own watchlist
CREATE POLICY "Users can view own watchlist"
  ON watchlist FOR SELECT
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can add to their watchlist
CREATE POLICY "Users can add to own watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can update their watchlist preferences
CREATE POLICY "Users can update own watchlist"
  ON watchlist FOR UPDATE
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can remove from their watchlist
CREATE POLICY "Users can delete from own watchlist"
  ON watchlist FOR DELETE
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    startup_id IN (
      SELECT id FROM startups WHERE user_id = auth.uid()
    )
  );

-- Notifications are created by backend (service role)

-- ============================================
-- STORAGE BUCKET POLICIES
-- ============================================
-- Note: Run these in Supabase dashboard or via storage API
-- Storage bucket: kb-documents
-- Policy: Users can upload to their startup folder
-- Policy: Users can download from their startup folder
