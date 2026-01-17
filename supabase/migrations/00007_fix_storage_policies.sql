-- Fix storage policies for logo replacement

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;

-- Recreate with proper permissions

-- Allow authenticated users to upload to startup-logos bucket
CREATE POLICY "Users can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'startup-logos');

-- Allow authenticated users to update/replace their logos (needs both USING and WITH CHECK)
CREATE POLICY "Users can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'startup-logos')
WITH CHECK (bucket_id = 'startup-logos');

-- Allow authenticated users to delete their logos
CREATE POLICY "Users can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'startup-logos');

-- Allow public read access to logos
CREATE POLICY "Public can view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'startup-logos');

-- Allow authenticated users to read (needed for upsert check)
CREATE POLICY "Users can read logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'startup-logos');
