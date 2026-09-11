-- Create 'student-avatars' bucket in Supabase Storage if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-avatars',
  'student-avatars',
  true,
  5242880, -- 5 MB limit (compressed avatars are < 50 KB)
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- Policy: Allow public read access to student avatars
CREATE POLICY "Public Read Student Avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-avatars');

-- Policy: Allow authenticated users (teachers/admins) to upload student avatars
CREATE POLICY "Authenticated Users Upload Student Avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-avatars');

-- Policy: Allow authenticated users to update/overwrite student avatars
CREATE POLICY "Authenticated Users Update Student Avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'student-avatars');
