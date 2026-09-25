-- ==========================================================
-- Migration: 20260925100000_create_activities_and_responses.sql
-- Description: Create activities/trips management tables and parent response tracking
-- ==========================================================

-- 1. Create activities table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'رحلة ترفيهية',
  cost TEXT NOT NULL DEFAULT 'مجاناً',
  activity_date TEXT NOT NULL,
  location TEXT,
  description TEXT,
  target_type TEXT NOT NULL DEFAULT 'all', -- 'all' | 'halaqa'
  target_group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  target_group_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_activities_target_group ON public.activities(target_group_id);
CREATE INDEX IF NOT EXISTS idx_activities_is_active ON public.activities(is_active);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

-- 2. Create activity_responses table
CREATE TABLE IF NOT EXISTS public.activity_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected', 'pending')),
  notes TEXT,
  parent_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_activity_student UNIQUE (activity_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_activity_responses_activity ON public.activity_responses(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_student ON public.activity_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_status ON public.activity_responses(status);

-- 3. Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_responses ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for activities
-- Admins have full access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'admin_all_activities') THEN
    CREATE POLICY admin_all_activities ON public.activities
      FOR ALL
      TO authenticated
      USING (public.is_center_admin())
      WITH CHECK (public.is_center_admin());
  END IF;
END $$;

-- Public/Anon can read active activities
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'public_read_active_activities') THEN
    CREATE POLICY public_read_active_activities ON public.activities
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

-- 5. RLS Policies for activity_responses
-- Admins have full access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_responses' AND policyname = 'admin_all_activity_responses') THEN
    CREATE POLICY admin_all_activity_responses ON public.activity_responses
      FOR ALL
      TO authenticated
      USING (public.is_center_admin())
      WITH CHECK (public.is_center_admin());
  END IF;
END $$;

-- Public/Anon can insert or update their response for their student
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_responses' AND policyname = 'public_upsert_activity_responses') THEN
    CREATE POLICY public_upsert_activity_responses ON public.activity_responses
      FOR ALL
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
