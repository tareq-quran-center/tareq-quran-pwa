-- ==========================================================
-- Migration: 20260905000000_add_role_and_center_hierarchy.sql
-- Description: Tareq Quran Center hierarchy, role-based access control,
--              Halaqat management, and admin oversight.
-- ==========================================================

-- 1. Add role & is_active columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'teacher',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Ensure group_id column exists on students with index
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_group_id ON public.students(group_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Update handle_new_user trigger to preserve role if provided
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'معلم جديد'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'teacher'),
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Helper function to check if current authenticated user is center admin
CREATE OR REPLACE FUNCTION public.is_center_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. Admin RLS Policies for Groups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'admin_all_groups'
  ) THEN
    CREATE POLICY admin_all_groups ON public.groups
      FOR ALL
      TO authenticated
      USING (public.is_center_admin())
      WITH CHECK (public.is_center_admin());
  END IF;
END $$;

-- 5. Admin RLS Policies for Group Members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'group_members' AND policyname = 'admin_all_group_members'
  ) THEN
    CREATE POLICY admin_all_group_members ON public.group_members
      FOR ALL
      TO authenticated
      USING (public.is_center_admin())
      WITH CHECK (public.is_center_admin());
  END IF;
END $$;

-- 6. Admin RLS Policies for Profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'admin_all_profiles'
  ) THEN
    CREATE POLICY admin_all_profiles ON public.profiles
      FOR ALL
      TO authenticated
      USING (public.is_center_admin())
      WITH CHECK (public.is_center_admin());
  END IF;
END $$;

-- 7. Admin RLS Policies for Students
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

-- 8. Admin RLS Policies for Memorization Logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'memorization_logs' AND policyname = 'admin_all_memorization_logs'
  ) THEN
    CREATE POLICY admin_all_memorization_logs ON public.memorization_logs
      FOR ALL
      TO authenticated
      USING (public.is_center_admin())
      WITH CHECK (public.is_center_admin());
  END IF;
END $$;

-- 9. Admin RLS Policies for Attendance Records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'admin_all_attendance_records'
  ) THEN
    CREATE POLICY admin_all_attendance_records ON public.attendance_records
      FOR ALL
      TO authenticated
      USING (public.is_center_admin())
      WITH CHECK (public.is_center_admin());
  END IF;
END $$;
