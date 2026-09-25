-- ==========================================================
-- Migration: 20260925180000_bulk_import_rpc_fix.sql
-- Description: نهائي - دالة RPC آمنة للاستيراد الجماعي للطلاب
--   - تزامن الحلقة بين circles وgroups تلقائياً
--   - تتجاوز RLS باستخدام SECURITY DEFINER
--   - تضمن صحة المفاتيح الأجنبية قبل الإدراج
-- ==========================================================

-- 1. دالة مساعدة: ضمان وجود الحلقة في جدول groups (مزامنة circles → groups)
CREATE OR REPLACE FUNCTION public.ensure_group_from_circle(p_circle_id UUID)
RETURNS VOID AS $$
BEGIN
  -- إدراج الحلقة من circles إذا لم تكن موجودة في groups
  INSERT INTO public.groups (id, name, created_at)
  SELECT c.id, c.name, COALESCE(c.created_at, now())
  FROM public.circles c
  WHERE c.id = p_circle_id
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- إذا لم تكن موجودة في circles أيضاً، ننشئها بسم افتراضي
  INSERT INTO public.groups (id, name, created_at)
  VALUES (p_circle_id, 'حلقة قرآنية', now())
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. الدالة الرئيسية: استيراد جماعي للطلاب
CREATE OR REPLACE FUNCTION public.bulk_import_students_safe(
  p_circle_id UUID,
  p_students JSONB,          -- [{name, parent_phone, notes}]
  p_requesting_user_id UUID  -- معرف المدير (للتحقق)
)
RETURNS JSONB AS $$
DECLARE
  v_student         JSONB;
  v_name            TEXT;
  v_phone           TEXT;
  v_notes           TEXT;
  v_teacher_id      UUID;
  v_is_admin        BOOLEAN;
  v_inserted_count  INT := 0;
  v_failed_count    INT := 0;
  v_errors          TEXT[] := '{}';
  v_inserted_ids    JSONB[] := '{}';
  v_new_id          UUID;
  v_token           UUID;
  v_idx             INT := 0;
BEGIN
  -- 0. التحقق أن المستخدم مدير مركز
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = p_requesting_user_id
      AND (role = 'admin' OR role = 'superadmin')
      AND is_active = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'غير مصرح، هذه الميزة مخصصة لمدير المركز فقط'
    );
  END IF;

  -- 1. ضمان وجود الحلقة في جدول groups
  PERFORM public.ensure_group_from_circle(p_circle_id);

  -- 2. تحديد المعلم المسؤول عن الحلقة
  SELECT teacher_id INTO v_teacher_id
  FROM public.circles
  WHERE id = p_circle_id;

  IF v_teacher_id IS NULL THEN
    SELECT user_id INTO v_teacher_id
    FROM public.group_members
    WHERE group_id = p_circle_id
    LIMIT 1;
  END IF;

  -- إذا لم نجد معلمًا، نستخدم المدير نفسه
  IF v_teacher_id IS NULL THEN
    v_teacher_id := p_requesting_user_id;
  END IF;

  -- التحقق أن المعلم موجود في profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_teacher_id) THEN
    v_teacher_id := p_requesting_user_id;
  END IF;

  -- 3. إدراج الطلاب واحداً واحداً
  FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    v_idx := v_idx + 1;
    v_name  := trim(v_student->>'name');
    v_phone := trim(COALESCE(v_student->>'parent_phone', ''));
    v_notes := NULLIF(trim(COALESCE(v_student->>'notes', '')), '');

    -- تخطي الأسماء الفارغة
    IF v_name IS NULL OR length(v_name) < 2 THEN
      v_errors := v_errors || ('الصف ' || v_idx || ': تم تخطي الطالب لعدم وجود اسم صالح');
      v_failed_count := v_failed_count + 1;
      CONTINUE;
    END IF;

    -- قيمة افتراضية لرقم الهاتف إذا كان فارغاً
    IF v_phone = '' OR v_phone IS NULL THEN
      v_phone := '0700000000';
    END IF;

    v_new_id := gen_random_uuid();
    v_token  := gen_random_uuid();

    BEGIN
      INSERT INTO public.students (
        id,
        name,
        parent_phone,
        parent_token,
        group_id,
        teacher_id,
        notes,
        created_at
      ) VALUES (
        v_new_id,
        v_name,
        v_phone,
        v_token,
        p_circle_id,
        v_teacher_id,
        v_notes,
        now()
      );

      v_inserted_ids := v_inserted_ids || jsonb_build_object(
        'id',           v_new_id,
        'name',         v_name,
        'parent_phone', v_phone,
        'parent_token', v_token,
        'group_id',     p_circle_id,
        'teacher_id',   v_teacher_id,
        'track_url',    '/parent/' || v_token::text
      );
      v_inserted_count := v_inserted_count + 1;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || ('الطالب ' || v_name || ' (الصف ' || v_idx || '): ' || SQLERRM);
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  -- 4. إرجاع النتائج
  IF v_inserted_count = 0 THEN
    RETURN jsonb_build_object(
      'success',        false,
      'error',          'فشل إدراج جميع الطلاب في قاعدة البيانات',
      'inserted_count', 0,
      'failed_count',   v_failed_count,
      'errors',         to_jsonb(v_errors),
      'inserted_students', '[]'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'success',           true,
    'inserted_count',    v_inserted_count,
    'failed_count',      v_failed_count,
    'errors',            to_jsonb(v_errors),
    'inserted_students', to_jsonb(v_inserted_ids)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. منح صلاحية التنفيذ لجميع المستخدمين المصادق عليهم
GRANT EXECUTE ON FUNCTION public.ensure_group_from_circle(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_import_students_safe(UUID, JSONB, UUID) TO authenticated;

-- 4. أيضاً: ضمان مزامنة كاملة لجميع الحلقات الحالية (circles → groups)
INSERT INTO public.groups (id, name, created_at)
SELECT c.id, c.name, COALESCE(c.created_at, now())
FROM public.circles c
WHERE NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.id = c.id)
ON CONFLICT (id) DO NOTHING;
