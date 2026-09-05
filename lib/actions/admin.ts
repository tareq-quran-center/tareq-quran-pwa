"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "./auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  HalaqaWithDetails,
  TeacherWithHalaqat,
  AdminCenterOverview,
  StudentRow,
} from "@/types";

export interface AdminDataResult {
  success: boolean;
  error?: string;
  overview?: AdminCenterOverview;
  halaqat?: HalaqaWithDetails[];
  teachers?: TeacherWithHalaqat[];
  students?: Array<
    StudentRow & {
      halaqa_name?: string;
      teacher_name?: string;
    }
  >;
  currentUserIsAdmin?: boolean;
}

/**
 * Helper: ensure caller is authenticated and admin (or first user setup)
 */
async function checkAdminAuth() {
  const { user, profile, isAdmin } = await getCurrentUserProfile();
  if (!user) {
    return { authorized: false, user: null, profile: null, isAdmin: false, error: "AUTH_REQUIRED" };
  }
  return { authorized: true, user, profile, isAdmin };
}

/**
 * Fetch all comprehensive data for the Center Admin Dashboard
 */
export async function getAdminCenterData(): Promise<AdminDataResult> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: "AUTH_REQUIRED" };
    }

    const supabase = createClient();

    // 1. Fetch all profiles (teachers & admins)
    let profiles: any[] = [];
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");
      if (!error && data) profiles = data;
    } catch (e) {
      console.error("Failed to fetch profiles:", e);
    }

    // 2. Fetch all groups (halaqat)
    let groups: any[] = [];
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*");
      if (!error && data) groups = data;
    } catch (e) {
      console.error("Failed to fetch groups:", e);
    }

    // 3. Fetch all group_members
    let members: any[] = [];
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("*");
      if (!error && data) members = data;
    } catch (e) {
      console.error("Failed to fetch group_members:", e);
    }

    // 4. Fetch all students across center
    let rawStudents: any[] = [];
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*");
      if (!error && data) rawStudents = data;
    } catch (e) {
      console.error("Failed to fetch students:", e);
    }

    // 5. Fetch all memorization logs
    let rawLogs: any[] = [];
    try {
      const { data, error } = await supabase
        .from("memorization_logs")
        .select("*");
      if (!error && data) rawLogs = data;
    } catch (e) {
      console.error("Failed to fetch memorization_logs:", e);
    }

    // 6. Fetch recent attendance records
    let attendance: any[] = [];
    try {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*");
      if (!error && data) attendance = data;
    } catch (e) {
      console.error("Failed to fetch attendance_records:", e);
    }

    const safeProfiles = profiles;
    safeProfiles.sort((a: any, b: any) =>
      (a.full_name || a.name || "").localeCompare(b.full_name || b.name || "", "ar")
    );

    const safeGroups = groups;
    safeGroups.sort((a: any, b: any) =>
      (a.name || "").localeCompare(b.name || "", "ar")
    );

    const safeMembers = members;

    const safeStudents = rawStudents.filter((s: any) => !s.deleted_at);
    safeStudents.sort((a: any, b: any) => {
      const nameA = a.name || a.full_name || "";
      const nameB = b.name || b.full_name || "";
      return nameA.localeCompare(nameB, "ar");
    });

    const safeLogs = rawLogs.filter((l: any) => !l.deleted_at);
    const safeAttendance = attendance;

    // Today's date for today's attendance count
    const today = new Date().toISOString().split("T")[0];
    const todayAttendance = safeAttendance.filter((a: any) => a.date === today);

    // Build Maps for fast lookup
    const profileMap = new Map(safeProfiles.map((p: any) => [p.id, p]));
    const groupMap = new Map(safeGroups.map((g: any) => [g.id, g]));

    // Halaqa to Teacher mapping from group_members
    const groupToTeacherMap = new Map<string, { id: string; name: string; phone: string | null }>();
    const teacherToGroupsMap = new Map<string, Array<{ id: string; name: string }>>();

    safeMembers.forEach((m: any) => {
      const p = profileMap.get(m.user_id);
      const g = groupMap.get(m.group_id);
      if (p && g) {
        if (!groupToTeacherMap.has(m.group_id)) {
          groupToTeacherMap.set(m.group_id, {
            id: p.id,
            name: p.full_name || p.name || "معلم",
            phone: p.phone,
          });
        }
        const existing = teacherToGroupsMap.get(m.user_id) || [];
        existing.push({ id: g.id, name: g.name });
        teacherToGroupsMap.set(m.user_id, existing);
      }
    });

    // Also fallback check groups.created_by
    safeGroups.forEach((g: any) => {
      if (!groupToTeacherMap.has(g.id) && g.created_by) {
        const p = profileMap.get(g.created_by);
        if (p) {
          groupToTeacherMap.set(g.id, {
            id: p.id,
            name: p.full_name || p.name || "معلم",
            phone: p.phone,
          });
          const existing = teacherToGroupsMap.get(p.id) || [];
          if (!existing.some((x) => x.id === g.id)) {
            existing.push({ id: g.id, name: g.name });
            teacherToGroupsMap.set(p.id, existing);
          }
        }
      }
    });

    // Total pages & stats
    let totalPagesMemorized = 0;
    const studentPagesMap = new Map<string, number>();

    safeLogs.forEach((l: any) => {
      const pages = Number(l.page_count || l.pages) || 1;
      totalPagesMemorized += pages;
      const cur = studentPagesMap.get(l.student_id) || 0;
      studentPagesMap.set(l.student_id, cur + pages);
    });

    // Attendance rate
    const totalAttendanceDays = safeAttendance.length;
    const presentAttendanceDays = safeAttendance.filter((a: any) => a.status === "حاضر").length;
    const overallAttendanceRate =
      totalAttendanceDays > 0
        ? Math.round((presentAttendanceDays / totalAttendanceDays) * 100)
        : 100;

    // Halaqat with Details
    const halaqatWithDetails: HalaqaWithDetails[] = safeGroups.map((g: any) => {
      const assignedTeacher = groupToTeacherMap.get(g.id);
      const groupStudents = safeStudents.filter((s: any) => s.group_id === g.id);
      const groupStudentIds = new Set(groupStudents.map((s: any) => s.id));

      const groupLogs = safeLogs.filter((l: any) => groupStudentIds.has(l.student_id));
      const groupPages = groupLogs.reduce(
        (acc: number, l: any) => acc + (Number(l.page_count || l.pages) || 1),
        0
      );

      const groupAtt = safeAttendance.filter((a: any) => groupStudentIds.has(a.student_id));
      const groupPresent = groupAtt.filter((a: any) => a.status === "حاضر").length;
      const attRate = groupAtt.length > 0 ? Math.round((groupPresent / groupAtt.length) * 100) : 100;

      return {
        id: g.id,
        name: g.name,
        created_by: g.created_by,
        created_at: g.created_at,
        teacher_id: assignedTeacher?.id || null,
        teacher_name: assignedTeacher?.name || "غير معين",
        teacher_phone: assignedTeacher?.phone || null,
        students_count: groupStudents.length,
        attendance_rate: attRate,
        total_pages: Number(groupPages.toFixed(1)),
      };
    });

    // Teachers with Halaqat
    const teachersWithHalaqat: TeacherWithHalaqat[] = safeProfiles.map((p: any) => {
      const halaqat = teacherToGroupsMap.get(p.id) || [];
      const teacherStudentCount = safeStudents.filter(
        (s: any) => s.teacher_id === p.id || (s.group_id && halaqat.some((h) => h.id === s.group_id))
      ).length;

      return {
        id: p.id,
        full_name: p.full_name || p.name || "معلم",
        phone: p.phone,
        role: (p as any).role || "teacher",
        is_active: (p as any).is_active ?? true,
        created_at: p.created_at,
        halaqat,
        students_count: teacherStudentCount,
      };
    });

    // Enriched Students
    const enrichedStudents = safeStudents.map((s: any) => {
      const g = s.group_id ? groupMap.get(s.group_id) : null;
      const t = s.teacher_id ? profileMap.get(s.teacher_id) : null;
      const totalPages = Number((studentPagesMap.get(s.id) || 0).toFixed(1));
      const displayName = s.name || s.full_name || "بدون اسم";

      return {
        ...s,
        full_name: displayName,
        name: displayName,
        phone: s.phone || s.parent_phone || null,
        halaqa_name: g?.name || "بدون حلقة",
        teacher_name: t?.full_name || t?.name || "غير محدد",
        total_pages_memorized: totalPages,
        total_pages_count: totalPages,
      };
    });

    // Overview KPIs
    const overview: AdminCenterOverview = {
      totalStudents: safeStudents.length,
      totalHalaqat: safeGroups.length,
      totalTeachers: safeProfiles.filter((p: any) => (p as any).role !== "admin").length || safeProfiles.length,
      attendanceRate: overallAttendanceRate,
      totalPagesMemorized: Number(totalPagesMemorized.toFixed(1)),
      totalRecitations: safeLogs.length,
      todayAttendanceCount: todayAttendance.length,
    };

    return {
      success: true,
      overview,
      halaqat: halaqatWithDetails,
      teachers: teachersWithHalaqat,
      students: enrichedStudents,
      currentUserIsAdmin: auth.isAdmin,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
    };
  }
}

/**
 * Create a new Halaqa and optionally assign a teacher
 */
export async function createHalaqa(data: { name: string; teacher_id?: string }) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "غير مصرح لك، يرجى تسجيل الدخول أولاً" };
    }

    const newGroupId = crypto.randomUUID();
    const cleanName = data.name.trim();

    // 1. Ensure user profile exists and has admin privileges
    try {
      await supabase
        .from("profiles")
        .update({ role: "admin", is_active: true })
        .eq("id", user.id);
    } catch {
      // ignore
    }

    // 2. Insert into groups table
    let newGroup: any = null;
    const { data: insertedGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        id: newGroupId,
        name: cleanName,
        created_by: user.id,
      })
      .select()
      .maybeSingle();

    if (groupError) {
      // Fallback: try inserting without created_by in case foreign key check fails
      const retry = await supabase
        .from("groups")
        .insert({
          id: newGroupId,
          name: cleanName,
        })
        .select()
        .maybeSingle();

      if (retry.error) {
        return {
          success: false,
          error: "فشل إنشاء الحلقة: " + (retry.error.message || groupError.message),
        };
      }
      newGroup = retry.data || { id: newGroupId, name: cleanName, created_by: user.id };
    } else {
      newGroup = insertedGroup || { id: newGroupId, name: cleanName, created_by: user.id };
    }

    // 3. Add creator to group_members so they are immediately part of the group
    try {
      await supabase.from("group_members").insert({
        id: crypto.randomUUID(),
        group_id: newGroupId,
        user_id: user.id,
        role: "owner",
      });
    } catch (e) {
      console.warn("Could not insert creator to group_members:", e);
    }

    // 4. If a teacher was assigned (and distinct from creator), also add to group_members
    if (data.teacher_id && data.teacher_id !== user.id) {
      try {
        await supabase.from("group_members").insert({
          id: crypto.randomUUID(),
          group_id: newGroupId,
          user_id: data.teacher_id,
          role: "owner",
        });
      } catch (e) {
        console.warn("Could not insert teacher to group_members:", e);
      }
    }

    // 5. Automatically activate this new Halaqa in cookies
    try {
      const cookieStore = cookies();
      cookieStore.set("active_group_id", newGroupId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    } catch {
      // ignore
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/students");
    return { success: true, data: newGroup };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

/**
 * Update Halaqa name and assigned teacher
 */
export async function updateHalaqa(data: { id: string; name: string; teacher_id?: string }) {
  try {
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("groups")
      .update({ name: data.name.trim() })
      .eq("id", data.id);

    if (updateError) {
      return { success: false, error: "فشل تحديث الحلقة: " + updateError.message };
    }

    if (data.teacher_id) {
      // Remove old owner membership and set new
      try {
        await supabase.from("group_members").delete().eq("group_id", data.id);
        await supabase.from("group_members").insert({
          id: crypto.randomUUID(),
          group_id: data.id,
          user_id: data.teacher_id,
          role: "owner",
        });
      } catch (e) {
        console.warn("Failed to update teacher membership:", e);
      }
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/students");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

/**
 * Delete a Halaqa (unlinks students)
 */
export async function deleteHalaqa(id: string) {
  try {
    const supabase = createClient();

    // 1. Unlink students
    await supabase
      .from("students")
      .update({ group_id: null })
      .eq("group_id", id);

    // 2. Remove memberships
    await supabase.from("group_members").delete().eq("group_id", id);

    // 3. Delete group
    const { error } = await supabase.from("groups").delete().eq("id", id);

    if (error) {
      return { success: false, error: "فشل حذف الحلقة: " + error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

/**
 * Update Teacher details (Role, is_active, phone, full_name)
 */
export async function updateTeacher(
  id: string,
  data: {
    full_name?: string;
    phone?: string | null;
    role?: "admin" | "teacher" | string;
    is_active?: boolean;
  }
) {
  try {
    const supabase = createClient();

    const updatePayload: {
      full_name?: string;
      phone?: string | null;
      role?: string | null;
      is_active?: boolean | null;
    } = {};
    if (data.full_name !== undefined) updatePayload.full_name = data.full_name.trim();
    if (data.phone !== undefined) updatePayload.phone = data.phone?.trim() || null;
    if (data.role !== undefined) updatePayload.role = data.role;
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active;

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      return { success: false, error: "فشل تحديث بيانات المعلم: " + error.message };
    }

    revalidatePath("/admin");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

/**
 * Toggle Teacher active status
 */
export async function toggleTeacherActive(id: string, is_active: boolean) {
  return updateTeacher(id, { is_active });
}

/**
 * Transfer student to another Halaqa and optionally another teacher
 */
export async function transferStudentHalaqa(
  studentId: string,
  newHalaqaId: string,
  newTeacherId?: string
) {
  try {
    const supabase = createClient();

    const updatePayload: {
      group_id: string | null;
      teacher_id?: string;
    } = {
      group_id: newHalaqaId || null,
    };
    if (newTeacherId) {
      updatePayload.teacher_id = newTeacherId;
    }

    const { error } = await supabase
      .from("students")
      .update(updatePayload)
      .eq("id", studentId);

    if (error) {
      return { success: false, error: "فشل نقل الطالب: " + error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/students");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

/**
 * Allows the current logged-in center director to claim/confirm the Admin role
 */
export async function claimAdminRole() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "غير مصرح، يرجى تسجيل الدخول أولاً" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin", is_active: true })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: "فشل تعيين الصلاحية: " + error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

