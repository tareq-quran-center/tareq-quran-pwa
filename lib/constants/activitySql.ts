export const ACTIVITIES_MIGRATION_SQL = `-- ==========================================================
-- جداول النشاطات والرحلات وتصويت أولياء الأمور
-- مركز طارق القرآني
-- ==========================================================

-- 1. إنشاء جدول الأنشطة والرحلات
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

-- فهارس تحسين سرعة الاستعلام
CREATE INDEX IF NOT EXISTS idx_activities_target_group ON public.activities(target_group_id);
CREATE INDEX IF NOT EXISTS idx_activities_is_active ON public.activities(is_active);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

-- 2. إنشاء جدول ردود وتصويت أولياء الأمور
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

-- 3. تفعيل أمان مستوى الصفوف RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_responses ENABLE ROW LEVEL SECURITY;

-- 4. سياسات الوصول لجدول النشاطات (activities)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'admin_all_activities') THEN
    CREATE POLICY admin_all_activities ON public.activities
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'public_read_active_activities') THEN
    CREATE POLICY public_read_active_activities ON public.activities
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

-- 5. سياسات الوصول لجدول الردود (activity_responses)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_responses' AND policyname = 'public_all_activity_responses') THEN
    CREATE POLICY public_all_activity_responses ON public.activity_responses
      FOR ALL
      TO anon, authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
`;

export const SUPABASE_SQL_EDITOR_URL =
  "https://supabase.com/dashboard/project/ornfwbqemoajdzognotf/sql/new";
