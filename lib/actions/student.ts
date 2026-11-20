"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { studentSchema, StudentInput } from "@/lib/validations/student";
import { validateAndFormatJordanianPhone } from "@/lib/phoneUtils";
import {
  StudentRow,
  StudentInsert,
  StudentUpdate,
  ParentProgressPayload,
  MemorizationLogRow,
  AttendanceRecordRow,
  SeasonRow,
  CircleRow,
} from "@/types";
import { calculateRecitationPages } from "@/lib/quranMetadata";
import { revalidatePath } from "next/cache";
import { getActiveGroupId } from "./group";
import { getSeasonsCached } from "./season";
import { getCurrentUserProfile } from "./auth";
import { normalizeMemorizationLogRow } from "@/lib/logUtils";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getStudents(): Promise<ActionResult<StudentRow[]>> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "غير مصرح لك للوصول، يرجى تسجيل الدخول أولاً",
      };
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = Boolean(profile && (profile.role === "admin" || profile.role === "superadmin") && profile.is_active);

    // 1. Query directly from public.students table (scoped to teacher's own students unless admin)
    let studentsQuery = supabase.from("students").select("*");
    if (!isAdmin) {
      const { data: teacherCircles } = await supabase
        .from("circles")
        .select("id")
        .eq("teacher_id", user.id);

      const circleIds = (teacherCircles || []).map((c: any) => c.id);
      if (circleIds.length > 0) {
        studentsQuery = studentsQuery.or(`teacher_id.eq.${user.id},group_id.in.(${circleIds.join(",")})`);
      } else {
        studentsQuery = studentsQuery.eq("teacher_id", user.id);
      }
    }

    const { data: rawStudents, error: studentsError } = await studentsQuery;

    if (studentsError) {
      return {
        success: false,
        error: "فشل جلب قائمة الطلاب: " + studentsError.message,
      };
    }

    const students = (rawStudents || [])
      .filter((s) => !(s as any).deleted_at)
      .map((s: any) => ({
        ...s,
        full_name: s.name || s.full_name || "طالب",
        name: s.name || s.full_name || "طالب",
      }))
      .sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || "", "ar"));

    // 2. Fetch active memorization logs summary to compute all-time total pages & recitations
    const studentIds = (students || []).map((s) => s.id);
    let logsSummary: any[] = [];
    if (studentIds.length > 0) {
      const { data: logsData } = await supabase
        .from("memorization_logs")
        .select("*")
        .in("student_id", studentIds);
      logsSummary = (logsData || []).map(normalizeMemorizationLogRow);
    }

    const logsMap = new Map<string, { totalPages: number; count: number }>();
    logsSummary.forEach((l) => {
      if (l.deleted_at) return;

      if (l.student_id) {
        const cur = logsMap.get(l.student_id) || { totalPages: 0, count: 0 };
        let pages = typeof l.page_count === "number" && !isNaN(l.page_count) && l.page_count > 0
          ? Number(l.page_count)
          : null;

        if (pages === null) {
          if (l.surah_start && l.surah_end) {
            const calculated = calculateRecitationPages(l.surah_start, l.surah_end, l.aya_start || 1, l.aya_end || 1);
            pages = isNaN(calculated) || calculated < 0 ? 0 : calculated;
          } else {
            pages = 0;
          }
        }
        cur.totalPages += pages;
        cur.count += 1;
        logsMap.set(l.student_id, cur);
      }
    });

    // 3. Auto-patch any student missing parent_token and map pre-aggregated totals
    const safeStudents: StudentRow[] = await Promise.all(
      (students || []).map(async (student) => {
        let token = student.parent_token;
        if (!token) {
          token = crypto.randomUUID();
          await supabase
            .from("students")
            .update({ parent_token: token })
            .eq("id", student.id);
        }
        const stats = logsMap.get(student.id) || { totalPages: 0, count: 0 };
        const totalPages = Number(stats.totalPages.toFixed(2));
        const sName = (student as any).name || student.full_name || "طالب";
        return {
          ...student,
          full_name: sName,
          name: sName,
          parent_token: token,
          total_pages_memorized: totalPages,
          total_recitations_count: stats.count,
          total_pages_count: totalPages,
        };
      })
    );

    return {
      success: true,
      data: safeStudents,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
    };
  }
}

/**
 * Helper to check whether the current user has access to manage a specific student.
 * Center admins can manage all students.
 * Teachers can only manage students assigned to them directly or via their circle.
 */
async function checkStudentAccess(
  supabase: any,
  userId: string,
  studentId: string
): Promise<{ allowed: boolean; isAdmin: boolean; student: any | null }> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  const isAdmin = Boolean(profile && (profile.role === "admin" || profile.role === "superadmin") && profile.is_active);
  if (isAdmin) {
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .maybeSingle();
    return { allowed: Boolean(student), isAdmin: true, student };
  }

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (!student) {
    return { allowed: false, isAdmin: false, student: null };
  }

  if (student.teacher_id === userId) {
    return { allowed: true, isAdmin: false, student };
  }

  if (student.group_id) {
    const { data: circle } = await supabase
      .from("circles")
      .select("id")
      .eq("id", student.group_id)
      .eq("teacher_id", userId)
      .maybeSingle();
    if (circle) {
      return { allowed: true, isAdmin: false, student };
    }
  }

  return { allowed: false, isAdmin: false, student };
}

export async function createStudent(data: StudentInput): Promise<ActionResult<StudentRow>> {
  const validation = studentSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "بيانات الطالب غير صحيحة",
    };
  }

  // Normalize and validate parent phone to standard Jordanian format (07XXXXXXXX)
  let normalizedPhone: string | null = null;
  if (validation.data.parent_phone && validation.data.parent_phone.trim() !== "") {
    const phoneRes = validateAndFormatJordanianPhone(validation.data.parent_phone);
    if (!phoneRes.isValid) {
      return {
        success: false,
        error: phoneRes.error || "رقم هاتف ولي الأمر غير صحيح",
      };
    }
    normalizedPhone = phoneRes.local || null;
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "غير مصرح لك بإضافة طالب، يرجى تسجيل الدخول",
      };
    }

    let assignedGroupId: string | null = (validation.data as any).group_id || null;

    if (!assignedGroupId) {
      // Priority 1: Check if teacher has an assigned circle in `circles` table
      const { data: teacherCircle } = await supabase
        .from("circles")
        .select("id")
        .eq("teacher_id", user.id)
        .limit(1)
        .maybeSingle();

      if (teacherCircle) {
        assignedGroupId = teacherCircle.id;
      }
    }

    if (!assignedGroupId) {
      const groupResult = await getActiveGroupId();
      if (groupResult.status === "ok" && groupResult.groupId) {
        assignedGroupId = groupResult.groupId;
      } else {
        // Fallback 1: check if user created any group
        const { data: anyUserGroup } = await supabase
          .from("groups")
          .select("id")
          .eq("created_by", user.id)
          .limit(1)
          .maybeSingle();

        if (anyUserGroup) {
          assignedGroupId = anyUserGroup.id;
        } else {
          // Fallback 2: check if any group exists in the center
          const { data: anyCenterGroup } = await supabase
            .from("groups")
            .select("id")
            .limit(1)
            .maybeSingle();

          if (anyCenterGroup) {
            assignedGroupId = anyCenterGroup.id;
          } else {
            // Auto-create initial default group
            const defId = crypto.randomUUID();
            await supabase.from("groups").insert({
              id: defId,
              name: "حلقة القرآن الكريم الأولى",
              created_by: user.id,
            });
            try {
              await supabase.from("group_members").insert({
                id: crypto.randomUUID(),
                group_id: defId,
                user_id: user.id,
                role: "owner",
              });
            } catch {}
            assignedGroupId = defId;
          }
        }
      }
    }

    const insertPayload: any = {
      teacher_id: user.id,
      group_id: assignedGroupId,
      name: validation.data.full_name,
      parent_phone: normalizedPhone,
      parent_token: crypto.randomUUID(),
    };
    if (validation.data.avatar_url !== undefined) {
      insertPayload.avatar_url = validation.data.avatar_url || null;
    }
    if ((validation.data as any).notes) {
      insertPayload.notes = (validation.data as any).notes;
    }

    const { data: newStudent, error } = await supabase
      .from("students")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: "فشل إضافة الطالب: " + error.message,
      };
    }

    const normalizedStudent = {
      ...newStudent,
      full_name: (newStudent as any).name || newStudent.full_name || validation.data.full_name,
    };

    revalidatePath("/students");
    revalidatePath("/dashboard");
    return {
      success: true,
      data: normalizedStudent as StudentRow,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إضافة الطالب",
    };
  }
}

export async function updateStudent(id: string, data: StudentInput): Promise<ActionResult<StudentRow>> {
  if (!id) {
    return { success: false, error: "معرف الطالب مطلوب" };
  }

  const validation = studentSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "بيانات التعديل غير صحيحة",
    };
  }

  // Normalize and validate parent phone to standard Jordanian format (07XXXXXXXX)
  let normalizedPhone: string | null = null;
  if (validation.data.parent_phone && validation.data.parent_phone.trim() !== "") {
    const phoneRes = validateAndFormatJordanianPhone(validation.data.parent_phone);
    if (!phoneRes.isValid) {
      return {
        success: false,
        error: phoneRes.error || "رقم هاتف ولي الأمر غير صحيح",
      };
    }
    normalizedPhone = phoneRes.local || null;
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "غير مصرح لك لتعديل بيانات الطالب",
      };
    }

    const { allowed } = await checkStudentAccess(supabase, user.id, id);
    if (!allowed) {
      return {
        success: false,
        error: "غير مصرح لك بتعديل بيانات هذا الطالب، الطالب يتبع لحلقة أخرى",
      };
    }

    const updatePayload: any = {
      name: validation.data.full_name,
      parent_phone: normalizedPhone,
    };
    if (validation.data.avatar_url !== undefined) {
      updatePayload.avatar_url = validation.data.avatar_url || null;
    }
    if ((validation.data as any).notes !== undefined) {
      updatePayload.notes = (validation.data as any).notes;
    }

    const { data: updatedStudent, error } = await supabase
      .from("students")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: "فشل تحديث بيانات الطالب: " + error.message,
      };
    }

    const normalizedUpdated = {
      ...updatedStudent,
      full_name: (updatedStudent as any).name || updatedStudent.full_name || validation.data.full_name,
    };

    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath(`/students/${id}`);
    if (updatedStudent.parent_token) {
      revalidatePath(`/parent/${updatedStudent.parent_token}`);
    }
    return {
      success: true,
      data: normalizedUpdated as StudentRow,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تحديث بيانات الطالب",
    };
  }
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  if (!id) {
    return { success: false, error: "معرف الطالب مطلوب" };
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "غير مصرح لك بحذف الطالب",
      };
    }

    const { allowed } = await checkStudentAccess(supabase, user.id, id);
    if (!allowed) {
      return {
        success: false,
        error: "غير مصرح لك بحذف هذا الطالب، الطالب يتبع لحلقة أخرى",
      };
    }

    // Soft delete: Mark student with deleted_at timestamp to protect historical logs and attendance records
    const { error } = await supabase
      .from("students")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: "فشل حذف الطالب: " + error.message,
      };
    }

    revalidatePath("/students");
    revalidatePath("/trash");
    revalidatePath("/dashboard");
    revalidatePath(`/students/${id}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء حذف الطالب",
    };
  }
}

export async function restoreStudent(id: string): Promise<ActionResult<StudentRow>> {
  if (!id) {
    return { success: false, error: "معرف الطالب مطلوب للاستعادة" };
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "غير مصرح لك باستعادة الطالب، يرجى تسجيل الدخول",
      };
    }

    const { allowed } = await checkStudentAccess(supabase, user.id, id);
    if (!allowed) {
      return {
        success: false,
        error: "غير مصرح لك باستعادة هذا الطالب، الطالب يتبع لحلقة أخرى",
      };
    }

    // Restore student by clearing deleted_at under RLS
    const { data: restoredStudent, error } = await supabase
      .from("students")
      .update({
        deleted_at: null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !restoredStudent) {
      return {
        success: false,
        error: "فشل استعادة الطالب: " + (error?.message || "الطالب غير موجود أو غير مصرح لك باستعادته"),
      };
    }

    revalidatePath("/students");
    revalidatePath("/trash");
    revalidatePath("/dashboard");
    revalidatePath(`/students/${id}`);
    if (restoredStudent.parent_token) {
      revalidatePath(`/parent/${restoredStudent.parent_token}`);
    }

    const sName = (restoredStudent as any).name || restoredStudent.full_name || "طالب";
    const normalizedRestored = {
      ...restoredStudent,
      full_name: sName,
      name: sName,
    };

    return {
      success: true,
      data: normalizedRestored as StudentRow,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء استعادة الطالب",
    };
  }
}

export async function getDeletedStudents(): Promise<ActionResult<StudentRow[]>> {
  try {
    const { user, profile } = await getCurrentUserProfile();

    if (!user) {
      return {
        success: false,
        error: "غير مصرح لك للوصول، يرجى تسجيل الدخول أولاً",
      };
    }

    const supabase = createClient();
    const isAdmin = Boolean(profile && (profile.role === "admin" || profile.role === "superadmin") && profile.is_active);

    // 1. Query deleted students from public.students table (scoped to teacher unless admin)
    let deletedQuery = supabase
      .from("students")
      .select("*")
      .not("deleted_at", "is", null);

    if (!isAdmin) {
      deletedQuery = deletedQuery.eq("teacher_id", user.id);
    }

    const { data: students, error: studentsError } = await deletedQuery
      .order("deleted_at", { ascending: false });

    if (studentsError) {
      return {
        success: false,
        error: "فشل جلب قائمة الطلاب المحذوفين: " + studentsError.message,
      };
    }

    if (!students || students.length === 0) {
      return {
        success: true,
        data: [],
      };
    }

    const studentIds = students.map((s) => s.id);

    // 2. Fetch memorization logs summary for deleted students
    const { data: logsSummary } = await supabase
      .from("memorization_logs")
      .select("student_id, page_count")
      .in("student_id", studentIds);

    const logsMap = new Map<string, { totalPages: number; count: number }>();
    (logsSummary || []).forEach((l) => {
      if (l.student_id) {
        const cur = logsMap.get(l.student_id) || { totalPages: 0, count: 0 };
        cur.totalPages += Number(l.page_count) || 1;
        cur.count += 1;
        logsMap.set(l.student_id, cur);
      }
    });

    const safeStudents: StudentRow[] = students.map((student) => {
      const stats = logsMap.get(student.id) || { totalPages: 0, count: 0 };
      const totalPages = Number(stats.totalPages.toFixed(2));
      const sName = (student as any).name || student.full_name || "طالب";
      return {
        ...student,
        full_name: sName,
        name: sName,
        total_pages_memorized: totalPages,
        total_recitations_count: stats.count,
        total_pages_count: totalPages,
      };
    });

    return {
      success: true,
      data: safeStudents,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء جلب سلة المهملات",
    };
  }
}

export const getDeletedStudentsCached = cache(getDeletedStudents);

/**
 * Permanently deletes all students currently in the archive / trash (deleted_at IS NOT NULL)
 * belonging to the authenticated teacher.
 * Also cascades and purges all associated attendance records and memorization logs
 * to ensure no orphaned records remain.
 */
export async function emptyTrashStudents(): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "غير مصرح لك بتنفيذ هذه العملية، يرجى تسجيل الدخول أولاً",
      };
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = Boolean(profile && (profile.role === "admin" || profile.role === "superadmin") && profile.is_active);

    // 1. Find archived/soft-deleted students (scoped to teacher's own students unless admin)
    let trashedQuery = supabase
      .from("students")
      .select("id, avatar_url")
      .not("deleted_at", "is", null);

    if (!isAdmin) {
      const { data: teacherCircles } = await supabase
        .from("circles")
        .select("id")
        .eq("teacher_id", user.id);
      const circleIds = (teacherCircles || []).map((c: any) => c.id);
      if (circleIds.length > 0) {
        trashedQuery = trashedQuery.or(`teacher_id.eq.${user.id},group_id.in.(${circleIds.join(",")})`);
      } else {
        trashedQuery = trashedQuery.eq("teacher_id", user.id);
      }
    }

    const { data: trashedStudents, error: fetchErr } = await trashedQuery;

    if (fetchErr) {
      return {
        success: false,
        error: "فشل استعلام الطلاب المؤرشفين: " + fetchErr.message,
      };
    }

    if (!trashedStudents || trashedStudents.length === 0) {
      return {
        success: true,
        data: { deletedCount: 0 },
      };
    }

    const trashedIds = trashedStudents.map((s) => s.id);

    // 2. Cascade delete attendance records
    await supabase
      .from("attendance_records")
      .delete()
      .in("student_id", trashedIds);

    // Also purge from legacy attendance table if present
    await supabase
      .from("attendance")
      .delete()
      .in("student_id", trashedIds);

    // 3. Cascade delete memorization logs
    await supabase
      .from("memorization_logs")
      .delete()
      .in("student_id", trashedIds);

    // 4. Permanently delete student rows from public.students
    const { error: delError } = await supabase
      .from("students")
      .delete()
      .in("id", trashedIds);

    if (delError) {
      return {
        success: false,
        error: "فشل حذف بيانات الطلاب نهائياً: " + delError.message,
      };
    }

    // 5. Clean up avatar files from storage if applicable
    for (const student of trashedStudents) {
      if (student.avatar_url && student.avatar_url.includes("/avatars/")) {
        try {
          const path = student.avatar_url.split("/avatars/")[1];
          if (path) {
            await supabase.storage.from("avatars").remove([path]);
          }
        } catch {
          // Non-blocking storage cleanup
        }
      }
    }

    revalidatePath("/trash");
    revalidatePath("/students");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { deletedCount: trashedIds.length },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تفريغ سلة المهملات",
    };
  }
}

export async function regenerateParentToken(studentId: string): Promise<ActionResult<{ parent_token: string }>> {
  if (!studentId) {
    return { success: false, error: "معرف الطالب مطلوب" };
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "غير مصرح لك بتجديد الرابط، يرجى تسجيل الدخول",
      };
    }

    const { allowed } = await checkStudentAccess(supabase, user.id, studentId);
    if (!allowed) {
      return {
        success: false,
        error: "غير مصرح لك بتجديد الرابط، الطالب يتبع لحلقة أخرى",
      };
    }

    const newToken = crypto.randomUUID();

    const { data: updatedStudent, error } = await supabase
      .from("students")
      .update({ parent_token: newToken })
      .eq("id", studentId)
      .select("id, parent_token")
      .single();

    if (error || !updatedStudent) {
      return {
        success: false,
        error: "فشل تجديد رابط المتابعة: " + (error?.message || "الطالب غير موجود"),
      };
    }

    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { parent_token: updatedStudent.parent_token },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تجديد الرابط",
    };
  }
}


import {
  getStudentProgressByToken as getParentProgressByToken,
  findStudentByPhoneOrCode as findParentStudentByPhoneOrCode,
  type ParentSearchResult,
} from "./parent";
export type { ParentSearchResult };

export async function getStudentProgressByToken(token: string): Promise<ParentProgressPayload> {
  return getParentProgressByToken(token);
}

export async function findStudentByPhoneOrCode(input: string): Promise<ParentSearchResult> {
  return findParentStudentByPhoneOrCode(input);
}

export const getStudentsCached = cache(getStudents);

export type TimeframeFilter = "today" | "this_week" | "this_month" | "last_30_days" | "all";

export interface TeacherReportDataOptions {
  timeframe?: TimeframeFilter;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface TeacherReportStats {
  totalStudents: number;
  activeStudents: number;
  totalMemorizedPages: number;
  overallAttendanceRate: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalExcused: number;
}

export interface TeacherReportDataResult {
  success: boolean;
  students?: Array<
    StudentRow & {
      season_id?: string;
      season_name?: string;
      halaqa_name?: string;
    }
  >;
  logs?: MemorizationLogRow[];
  attendance?: AttendanceRecordRow[];
  stats?: TeacherReportStats;
  seasons?: SeasonRow[];
  circles?: CircleRow[];
  error?: string;
}

function resolveDateRange(options?: TeacherReportDataOptions): { startStr: string; endStr: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  if (options?.startDate && options?.endDate) {
    return { startStr: options.startDate, endStr: options.endDate };
  }

  const timeframe = options?.timeframe || "this_month";

  if (timeframe === "all") {
    return { startStr: "", endStr: "" };
  }

  if (timeframe === "today") {
    return { startStr: todayStr, endStr: todayStr };
  }

  if (timeframe === "this_week") {
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
    const wYear = startOfWeek.getFullYear();
    const wMonth = String(startOfWeek.getMonth() + 1).padStart(2, "0");
    const wDay = String(startOfWeek.getDate()).padStart(2, "0");
    return { startStr: `${wYear}-${wMonth}-${wDay}`, endStr: todayStr };
  }

  if (timeframe === "last_30_days") {
    const start30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sYear = start30.getFullYear();
    const sMonth = String(start30.getMonth() + 1).padStart(2, "0");
    const sDay = String(start30.getDate()).padStart(2, "0");
    return { startStr: `${sYear}-${sMonth}-${sDay}`, endStr: todayStr };
  }

  // Default: "this_month"
  // For early days in the month (first 7 days), extend window back 30 days so streak/absence alerts retain full historical context
  const dayOfMonth = now.getDate();
  if (dayOfMonth < 7) {
    const start30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sYear = start30.getFullYear();
    const sMonth = String(start30.getMonth() + 1).padStart(2, "0");
    const sDay = String(start30.getDate()).padStart(2, "0");
    return { startStr: `${sYear}-${sMonth}-${sDay}`, endStr: todayStr };
  }

  const startOfMonthStr = `${year}-${month}-01`;
  return { startStr: startOfMonthStr, endStr: todayStr };
}

export async function getTeacherReportData(options?: TeacherReportDataOptions): Promise<TeacherReportDataResult> {
  try {
    const [{ user, profile }, seasonsRes] = await Promise.all([
      getCurrentUserProfile(),
      getSeasonsCached(),
    ]);

    if (!user) {
      return { success: false, error: "غير مصرح لك للوصول، يرجى تسجيل الدخول أولاً" };
    }

    const supabase = createClient();
    const { startStr, endStr } = resolveDateRange(options);
    const isAdmin = Boolean(profile && (profile.role === "admin" || profile.role === "superadmin") && profile.is_active);

    let studentsRes: { data: any[] | null; error?: any };
    let circlesRes: { data: any[] | null; error?: any };
    let attendanceRes: { data: any[] | null; error?: any };
    let logsRes: { data: any[] | null; error?: any };

    if (isAdmin) {
      // Admin: all queries are independent -> run everything in one concurrent batch
      let attendanceQuery = supabase.from("attendance_records").select("*");
      if (startStr) attendanceQuery = attendanceQuery.gte("date", startStr);
      if (endStr) attendanceQuery = attendanceQuery.lte("date", endStr);

      let logsQuery = supabase.from("memorization_logs").select("*");
      if (startStr) logsQuery = logsQuery.gte("date", startStr);
      if (endStr) logsQuery = logsQuery.lte("date", endStr);
      if (options?.limit) logsQuery = logsQuery.limit(options.limit);

      [studentsRes, circlesRes, attendanceRes, logsRes] = await Promise.all([
        supabase.from("students").select("*"),
        supabase.from("circles").select("*"),
        attendanceQuery.order("date", { ascending: false }),
        logsQuery.order("created_at", { ascending: false }),
      ]);
    } else {
      // Teacher: fetch assigned circles once, then students, then attendance & logs in parallel
      circlesRes = await supabase.from("circles").select("*").eq("teacher_id", user.id);
      const teacherCircleIds = (circlesRes.data || []).map((c: any) => c.id);

      let studentsQuery = supabase.from("students").select("*");
      if (teacherCircleIds.length > 0) {
        studentsQuery = studentsQuery.or(`teacher_id.eq.${user.id},group_id.in.(${teacherCircleIds.join(",")})`);
      } else {
        studentsQuery = studentsQuery.eq("teacher_id", user.id);
      }

      studentsRes = await studentsQuery;
      const teacherStudentIds = (studentsRes.data || [])
        .filter((s: any) => !s.deleted_at)
        .map((s: any) => s.id);

      if (teacherStudentIds.length === 0) {
        attendanceRes = { data: [], error: null };
        logsRes = { data: [], error: null };
      } else {
        let attendanceQuery = supabase
          .from("attendance_records")
          .select("*")
          .in("student_id", teacherStudentIds);
        if (startStr) attendanceQuery = attendanceQuery.gte("date", startStr);
        if (endStr) attendanceQuery = attendanceQuery.lte("date", endStr);

        let logsQuery = supabase
          .from("memorization_logs")
          .select("*")
          .in("student_id", teacherStudentIds);
        if (startStr) logsQuery = logsQuery.gte("date", startStr);
        if (endStr) logsQuery = logsQuery.lte("date", endStr);
        if (options?.limit) logsQuery = logsQuery.limit(options.limit);

        [attendanceRes, logsRes] = await Promise.all([
          attendanceQuery.order("date", { ascending: false }),
          logsQuery.order("created_at", { ascending: false }),
        ]);
      }
    }

    const rawStudents = (studentsRes.data || [])
      .filter((s) => !(s as any).deleted_at)
      .map((s: any) => ({
        ...s,
        full_name: s.name || s.full_name || "طالب",
        name: s.name || s.full_name || "طالب",
      }));
    const studentIds = rawStudents.map((s) => s.id);

    const logs = logsRes.data || [];

    // 4. All-time logs summary for the teacher's active students to pre-aggregate totals accurately.
    // Optimization: When timeframe is "all" (no date bounds & no limit), reuse `logs` directly
    // to eliminate duplicate multi-MB database queries. Only query separately if date filter is active.
    let allLogsSummary: any[] = [];
    if (!startStr && !endStr && !options?.limit) {
      allLogsSummary = logs;
    } else if (studentIds.length > 0) {
      const { data: allLogsData } = await supabase
        .from("memorization_logs")
        .select("*")
        .in("student_id", studentIds);
      allLogsSummary = allLogsData || [];
    }

    const statsLogs = logs;

    const logsMap = new Map<string, { totalPages: number; count: number }>();
    allLogsSummary.forEach((l) => {
      if (l.deleted_at) return;

      if (l.student_id) {
        const cur = logsMap.get(l.student_id) || { totalPages: 0, count: 0 };
        let pages = typeof l.page_count === "number" && !isNaN(l.page_count) && l.page_count > 0
          ? Number(l.page_count)
          : null;

        if (pages === null) {
          if (l.surah_start && l.surah_end) {
            const calculated = calculateRecitationPages(l.surah_start, l.surah_end, l.aya_start || 1, l.aya_end || 1);
            pages = isNaN(calculated) || calculated < 0 ? 0 : calculated;
          } else {
            pages = 0;
          }
        }
        cur.totalPages += pages;
        cur.count += 1;
        logsMap.set(l.student_id, cur);
      }
    });

    const seasonsList = seasonsRes.data;
    const activeSeason = seasonsRes.activeSeason || seasonsList[0];
    const seasonMap = new Map(seasonsList.map((s) => [s.id, s]));
    const circlesList = (circlesRes.data || []) as CircleRow[];
    const circleMap = new Map(circlesList.map((c) => [c.id, c]));

    const students = rawStudents.map((s) => {
      const stats = logsMap.get(s.id) || { totalPages: 0, count: 0 };
      const totalPages = Number(stats.totalPages.toFixed(2));
      const circle = circleMap.get(s.group_id);
      const seasonId = circle?.season_id || activeSeason.id;
      const seasonName = seasonMap.get(seasonId)?.name || activeSeason.name;

      return {
        ...s,
        season_id: seasonId,
        season_name: seasonName,
        halaqa_name: circle?.name || "حلقة",
        total_pages_memorized: totalPages,
        total_recitations_count: stats.count,
        total_pages_count: totalPages,
      };
    });
    const attendance = attendanceRes.data || [];

    // Calculate Summary Statistics
    let totalMemorizedPages = 0;
    const activeStudentIds = new Set<string>();

    statsLogs.forEach((l) => {
      if (l.student_id) {
        activeStudentIds.add(l.student_id);
      }
      totalMemorizedPages += Number(l.page_count) || 1;
    });
    totalMemorizedPages = Number(totalMemorizedPages.toFixed(2));

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;

    attendance.forEach((a) => {
      if (a.status === "حاضر") totalPresent++;
      else if (a.status === "غائب") totalAbsent++;
      else if (a.status === "متأخر") totalLate++;
      else if (a.status === "مستأذن") totalExcused++;
    });

    const totalRecorded = totalPresent + totalAbsent + totalLate + totalExcused;
    const overallAttendanceRate = totalRecorded > 0
      ? Math.round(((totalPresent + totalLate) / totalRecorded) * 100)
      : 100;

    const stats: TeacherReportStats = {
      totalStudents: students.length,
      activeStudents: activeStudentIds.size,
      totalMemorizedPages,
      overallAttendanceRate,
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
    };

    return {
      success: true,
      students,
      logs: allLogsSummary.length > 0 ? allLogsSummary : logs,
      attendance,
      stats,
      seasons: seasonsList,
      circles: circlesList,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ أثناء جلب بيانات التقرير",
    };
  }
}

export const getTeacherReportDataCached = cache(getTeacherReportData);

/**
 * Mark student as contacted by the teacher for follow-up alerts
 */
export async function markStudentContacted(studentId: string): Promise<ActionResult<StudentRow>> {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "غير مصرح لك بتسجيل التواصل، يرجى تسجيل الدخول أولاً" };
    }

    const { allowed } = await checkStudentAccess(supabase, user.id, studentId);
    if (!allowed) {
      return { success: false, error: "غير مصرح لك بتسجيل التواصل مع هذا الطالب، يتبع لحلقة أخرى" };
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("students")
      .update({ last_contacted_at: now, updated_at: now })
      .eq("id", studentId)
      .select()
      .single();

    if (error) {
      return { success: false, error: "فشل حفظ حالة التواصل في قاعدة البيانات" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/students");

    const sName = (data as any).name || data.full_name || "طالب";
    const normalizedData = {
      ...data,
      full_name: sName,
      name: sName,
    };

    return {
      success: true,
      data: normalizedData as StudentRow,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تسجيل التواصل",
    };
  }
}

export async function updateStudentAvatar(
  studentId: string,
  avatarUrl: string
): Promise<ActionResult<{ avatar_url: string }>> {
  if (!studentId) {
    return { success: false, error: "معرف الطالب مطلوب" };
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "غير مصرح لك بتحديث صورة الطالب، يرجى تسجيل الدخول" };
    }

    const { allowed } = await checkStudentAccess(supabase, user.id, studentId);
    if (!allowed) {
      return { success: false, error: "غير مصرح لك بتحديث صورة هذا الطالب، يتبع لحلقة أخرى" };
    }

    const { data: updated, error } = await supabase
      .from("students")
      .update({ avatar_url: avatarUrl || null })
      .eq("id", studentId)
      .select("id, avatar_url, parent_token")
      .single();

    if (error) {
      return { success: false, error: "فشل حفظ صورة الطالب: " + error.message };
    }

    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");
    if (updated?.parent_token) {
      revalidatePath(`/parent/${updated.parent_token}`);
    }

    return {
      success: true,
      data: { avatar_url: updated.avatar_url || avatarUrl },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تحديث صورة الطالب",
    };
  }
}

