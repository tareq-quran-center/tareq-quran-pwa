-- ==========================================================
-- Migration: 20260912000000_fix_admin_student_import_rls.sql
-- Description: Allow center admins to insert and manage students across all halaqat and teachers
-- ==========================================================

-- 1. Ensure public.is_center_admin function exists and is robust
CREATE OR REPLACE FUNCTION public.is_center_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin') AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Ensure admin RLS policy for students table allows full INSERT/SELECT/UPDATE/DELETE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'students' AND policyname = 'admin_all_students'
  ) THEN
    CREATE POLICY admin_all_students ON public.students
      FOR ALL
      TO authenticated
      USING (public.is_center_admin())
      WITH CHECK (public.is_center_admin());
  END IF;
END $$;
