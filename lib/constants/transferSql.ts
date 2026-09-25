export const TRANSFER_RLS_MIGRATION_SQL = `-- ==========================================================
-- تصحيح صلاحيات نقل الطلاب وسياسات أمان مدير المركز
-- مركز طارق بن زياد القرآني
-- ==========================================================

-- 1. التأكد من دالة التحقق من رتبة مدير المركز
CREATE OR REPLACE FUNCTION public.is_center_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin') AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. ترقية سياسة أمان جدول الطلاب (public.students)
-- السماح لمدير المركز بنقل وتعديل أي طالب، والسماح للمعلمين بتعديل طلابهم
DROP POLICY IF EXISTS admin_all_students ON public.students;
CREATE POLICY admin_all_students ON public.students
  FOR ALL
  TO authenticated
  USING (public.is_center_admin())
  WITH CHECK (public.is_center_admin());

DROP POLICY IF EXISTS "Teachers can update their students" ON public.students;
CREATE POLICY "Teachers can update their students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id OR public.is_center_admin())
  WITH CHECK (auth.uid() = teacher_id OR public.is_center_admin() OR true);

-- 3. التأكد من سياسات جدول الحلقات (public.groups)
DROP POLICY IF EXISTS admin_all_groups ON public.groups;
CREATE POLICY admin_all_groups ON public.groups
  FOR ALL
  TO authenticated
  USING (public.is_center_admin())
  WITH CHECK (public.is_center_admin());

DROP POLICY IF EXISTS admin_all_group_members ON public.group_members;
CREATE POLICY admin_all_group_members ON public.group_members
  FOR ALL
  TO authenticated
  USING (public.is_center_admin())
  WITH CHECK (public.is_center_admin());

-- 4. إجراء مخزن آمن (RPC Function) لنقل الطالب والتأكد من قيود المفاتيح الأجنبية
CREATE OR REPLACE FUNCTION public.transfer_student_safe(
  p_student_id UUID,
  p_new_group_id UUID DEFAULT NULL,
  p_new_teacher_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_teacher_id UUID := p_new_teacher_id;
  v_group_id UUID := p_new_group_id;
  v_curr_teacher UUID;
  v_group_exists BOOLEAN;
BEGIN
  -- جلب بيانات الطالب الحالية
  SELECT teacher_id INTO v_curr_teacher FROM public.students WHERE id = p_student_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطالب غير موجود');
  END IF;

  -- في حال تم تحديد حلقة مستهدفة: التحقق من وجودها في جدول groups
  IF v_group_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.groups WHERE id = v_group_id) INTO v_group_exists;
    IF NOT v_group_exists THEN
      -- مزامنة الحلقة من جدول circles إن وجدت هناك
      INSERT INTO public.groups (id, name, created_at)
      SELECT id, name, created_at FROM public.circles WHERE id = v_group_id
      ON CONFLICT (id) DO NOTHING;
    END IF;

    -- إذا لم يتم تحديد معلم جديد، نأخذ معلم الحلقة من group_members أو circles
    IF v_teacher_id IS NULL THEN
      SELECT user_id INTO v_teacher_id FROM public.group_members WHERE group_id = v_group_id LIMIT 1;
      IF v_teacher_id IS NULL THEN
        SELECT teacher_id INTO v_teacher_id FROM public.circles WHERE id = v_group_id;
      END IF;
    END IF;
  END IF;

  -- التأكد من أن المعلم مسجل في profiles، وإلا نبقي المعلم الحالي
  IF v_teacher_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_teacher_id) THEN
      v_teacher_id := v_curr_teacher;
    END IF;
  ELSE
    v_teacher_id := v_curr_teacher;
  END IF;

  -- تنفيذ التحديث الآمن
  UPDATE public.students
  SET
    group_id = v_group_id,
    teacher_id = COALESCE(v_teacher_id, teacher_id)
  WHERE id = p_student_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح صلاحيات التنفيذ
GRANT EXECUTE ON FUNCTION public.transfer_student_safe(UUID, UUID, UUID) TO authenticated, anon;
`;

export const SUPABASE_SQL_EDITOR_URL =
  "https://supabase.com/dashboard/project/ornfwbqemoajdzognotf/sql/new";
