-- ==============================================================================
-- Migration: 20260911000003_fix_attendance_records_schema.sql
-- Description: Ensures all required columns exist on public.attendance_records
-- Adds missing columns (notes, updated_at) and unifies status check constraint
-- to support both Arabic and English status values seamlessly.
-- ==============================================================================

-- 1. Ensure notes and standard columns exist on attendance_records
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Drop restrictive status check constraint if present and recreate with dual Arabic/English support
ALTER TABLE public.attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_status_check;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_status_check
  CHECK (status IN (
    'حاضر', 'غائب', 'متأخر', 'مستأذن', 'لم يرصد',
    'present', 'absent', 'late', 'excused', 'unrecorded'
  ));

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_date
  ON public.attendance_records(student_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_date
  ON public.attendance_records(date DESC);

-- 4. Automatically reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
