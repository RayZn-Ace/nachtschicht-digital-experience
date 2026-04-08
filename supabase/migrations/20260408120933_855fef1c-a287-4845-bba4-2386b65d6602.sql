
-- Allow anonymous uploads to the applicants folder in avatars bucket
CREATE POLICY "Anyone can upload applicant photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'applicants');

-- Allow public read access to applicant photos
CREATE POLICY "Anyone can view applicant photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'applicants');
