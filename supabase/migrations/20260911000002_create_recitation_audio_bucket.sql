-- ==============================================================================
-- Migration: 20260911000002_create_recitation_audio_bucket.sql
-- Description: Creates the 'recitation-audio' bucket in Supabase Storage with
-- public read access for parents/teachers and authenticated upload access.
-- ==============================================================================

-- 1. Create 'recitation-audio' bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recitation-audio',
  'recitation-audio',
  true,
  10485760, -- 10 MB limit (compact voice recordings are < 200 KB/min)
  ARRAY['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/x-m4a']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'];

-- Also create aliases if desired
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-recordings',
  'audio-recordings',
  true,
  10485760,
  ARRAY['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/x-m4a']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Storage Policies for 'recitation-audio'

-- Policy: Allow public read access to recitation audio recordings (parents & teachers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public Read Recitation Audio'
  ) THEN
    CREATE POLICY "Public Read Recitation Audio"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('recitation-audio', 'audio-recordings', 'memorization-audio'));
  END IF;
END $$;

-- Policy: Allow authenticated users (teachers/admins) to upload recitation audio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated Upload Recitation Audio'
  ) THEN
    CREATE POLICY "Authenticated Upload Recitation Audio"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id IN ('recitation-audio', 'audio-recordings', 'memorization-audio'));
  END IF;
END $$;

-- Policy: Allow authenticated users to update recitation audio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated Update Recitation Audio'
  ) THEN
    CREATE POLICY "Authenticated Update Recitation Audio"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id IN ('recitation-audio', 'audio-recordings', 'memorization-audio'));
  END IF;
END $$;

-- Policy: Allow authenticated users to delete recitation audio
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated Delete Recitation Audio'
  ) THEN
    CREATE POLICY "Authenticated Delete Recitation Audio"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id IN ('recitation-audio', 'audio-recordings', 'memorization-audio'));
  END IF;
END $$;
