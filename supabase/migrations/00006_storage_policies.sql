-- Storage policies for startup-logos bucket

-- Allow authenticated users to upload to startup-logos bucket
CREATE POLICY "Users can upload their own logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'startup-logos');

-- Allow authenticated users to update their own logos
CREATE POLICY "Users can update their own logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'startup-logos');

-- Allow authenticated users to delete their own logos
CREATE POLICY "Users can delete their own logos"
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
