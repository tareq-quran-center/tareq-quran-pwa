-- ==============================================================================
-- Migration: 20260911000003_fix_attendance_records_schema.sql
-- Description: Ensures all required columns exist on public.attendance_records
-- Adds missing columns (notes, updated_at) if not already present.
-- ==============================================================================

-- 1. Ensure notes and standard columns exist on attendance_records
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_date
  ON public.attendance_records(student_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_date
  ON public.attendance_records(date DESC);

-- 3. Automatically reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
