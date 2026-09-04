-- Migration: 20260823000000_add_students_join_date.sql
-- Description: Add join_date (DATE) to students table and initialize with created_at date for existing records.

-- 1. Add join_date column to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE;

-- 2. Backfill existing students with their created_at date
UPDATE public.students
SET join_date = COALESCE(created_at::date, CURRENT_DATE)
WHERE join_date IS NULL;

-- 3. Update students_with_summary view to include join_date
CREATE OR REPLACE VIEW public.students_with_summary AS
SELECT 
  s.id,
  s.teacher_id,
  s.group_id,
  s.full_name,
  s.parent_phone,
  s.parent_token,
  s.academic_grade,
  s.school_name,
  s.address,
  s.father_job,
  s.avatar_url,
  s.is_archived,
  s.deleted_at,
  s.last_contacted_at,
  s.join_date,
  s.created_at,
  s.updated_at,
  COALESCE(SUM(l.page_count), 0)::numeric(10,2) AS total_pages_memorized,
  COUNT(l.id)::bigint AS total_recitations_count
FROM public.students s
LEFT JOIN public.memorization_logs l 
  ON l.student_id = s.id 
  AND (l.deleted_at IS NULL)
GROUP BY s.id;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
