-- Storage policies for kb-documents bucket

-- Allow authenticated users to upload to kb-documents bucket
CREATE POLICY "Users can upload kb documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kb-documents');

-- Allow authenticated users to read their kb documents
CREATE POLICY "Users can read kb documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'kb-documents');

-- Allow authenticated users to delete their kb documents
CREATE POLICY "Users can delete kb documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'kb-documents');
