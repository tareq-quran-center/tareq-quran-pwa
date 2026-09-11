-- ==============================================================================
-- Migration: 20260911000001_fix_memorization_logs_schema.sql
-- Description: Unifies and fixes schema mismatch on public.memorization_logs
-- Adds missing columns (audio_url, assistant_name, page_count, surahs, etc.)
-- Supports both standard and legacy naming conventions seamlessly.
-- ==============================================================================

-- 1. Ensure all columns exist on memorization_logs
ALTER TABLE public.memorization_logs
  ADD COLUMN IF NOT EXISTS log_type text,
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS surah_start text,
  ADD COLUMN IF NOT EXISTS aya_start integer,
  ADD COLUMN IF NOT EXISTS surah_end text,
  ADD COLUMN IF NOT EXISTS aya_end integer,
  ADD COLUMN IF NOT EXISTS surah_number integer,
  ADD COLUMN IF NOT EXISTS from_verse integer,
  ADD COLUMN IF NOT EXISTS to_verse integer,
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS rating text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS assistant_name text,
  ADD COLUMN IF NOT EXISTS page_count numeric(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surahs text[],
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS season_id uuid,
  ADD COLUMN IF NOT EXISTS circle_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Synchronize existing column values between dual fields (backward compatibility)
UPDATE public.memorization_logs
SET log_type = type
WHERE log_type IS NULL AND type IS NOT NULL;

UPDATE public.memorization_logs
SET type = log_type
WHERE type IS NULL AND log_type IS NOT NULL;

UPDATE public.memorization_logs
SET aya_start = from_verse
WHERE aya_start IS NULL AND from_verse IS NOT NULL;

UPDATE public.memorization_logs
SET aya_end = to_verse
WHERE aya_end IS NULL AND to_verse IS NOT NULL;

UPDATE public.memorization_logs
SET from_verse = aya_start
WHERE from_verse IS NULL AND aya_start IS NOT NULL;

UPDATE public.memorization_logs
SET to_verse = aya_end
WHERE to_verse IS NULL AND aya_end IS NOT NULL;

-- Safely synchronize grade and rating depending on whether rating is integer or text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'memorization_logs' AND column_name = 'rating' 
    AND data_type IN ('integer', 'smallint', 'bigint', 'numeric')
  ) THEN
    UPDATE public.memorization_logs
    SET rating = CASE 
      WHEN grade IN ('ممتاز') THEN 5
      WHEN grade IN ('جيد_جدا') THEN 4
      WHEN grade IN ('جيد') THEN 3
      ELSE 2
    END
    WHERE rating IS NULL AND grade IS NOT NULL;

    UPDATE public.memorization_logs
    SET grade = CASE 
      WHEN rating >= 5 THEN 'ممتاز'
      WHEN rating = 4 THEN 'جيد_جدا'
      WHEN rating = 3 THEN 'جيد'
      ELSE 'يحتاج_تحسين'
    END
    WHERE grade IS NULL AND rating IS NOT NULL;
  ELSE
    UPDATE public.memorization_logs
    SET grade = rating::text
    WHERE grade IS NULL AND rating IS NOT NULL;

    UPDATE public.memorization_logs
    SET rating = grade::text
    WHERE rating IS NULL AND grade IS NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Non-fatal: continue migration if sync fails
  RAISE NOTICE 'grade/rating sync skipped: %', SQLERRM;
END $$;

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_memorization_logs_student_id
  ON public.memorization_logs(student_id);

CREATE INDEX IF NOT EXISTS idx_memorization_logs_created_at
  ON public.memorization_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memorization_logs_date
  ON public.memorization_logs(date DESC);

CREATE INDEX IF NOT EXISTS idx_memorization_logs_deleted_at
  ON public.memorization_logs(deleted_at)
  WHERE deleted_at IS NULL;

-- 4. Automatically reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
