-- Add logo_url column to startups table
ALTER TABLE startups ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create storage bucket for startup logos if it doesn't exist
-- Note: Storage bucket creation is done via Supabase dashboard or CLI
-- This is documented here for reference:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('startup-logos', 'startup-logos', true);
