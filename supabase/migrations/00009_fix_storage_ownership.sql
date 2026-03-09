-- 00009_fix_storage_ownership.sql
-- Add path-based ownership checks to storage policies

-- Helper function: get the startup_id owned by the current user
CREATE OR REPLACE FUNCTION public.get_user_startup_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.startups WHERE user_id = auth.uid() LIMIT 1;
$$;

-- =====================
-- STARTUP-LOGOS BUCKET
-- =====================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can read logos" ON storage.objects;

-- Recreate with ownership checks
-- Users can only upload to their own startup's folder
CREATE POLICY "Users can upload own logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'startup-logos'
  AND (storage.foldername(name))[1] = public.get_user_startup_id()::text
);

-- Users can only update their own startup's logos
CREATE POLICY "Users can update own logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'startup-logos'
  AND (storage.foldername(name))[1] = public.get_user_startup_id()::text
)
WITH CHECK (
  bucket_id = 'startup-logos'
  AND (storage.foldername(name))[1] = public.get_user_startup_id()::text
);

-- Users can only delete their own startup's logos
CREATE POLICY "Users can delete own logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'startup-logos'
  AND (storage.foldername(name))[1] = public.get_user_startup_id()::text
);

-- Public can view all logos (needed for display)
CREATE POLICY "Public can view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'startup-logos');

-- Authenticated users can read logos (needed for upsert check)
CREATE POLICY "Authenticated can read logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'startup-logos');

-- =====================
-- KB-DOCUMENTS BUCKET
-- =====================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can upload kb documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can read kb documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete kb documents" ON storage.objects;

-- Recreate with ownership checks
CREATE POLICY "Users can upload own kb documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kb-documents'
  AND (storage.foldername(name))[1] = public.get_user_startup_id()::text
);

CREATE POLICY "Users can read own kb documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kb-documents'
  AND (storage.foldername(name))[1] = public.get_user_startup_id()::text
);

CREATE POLICY "Users can delete own kb documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'kb-documents'
  AND (storage.foldername(name))[1] = public.get_user_startup_id()::text
);
