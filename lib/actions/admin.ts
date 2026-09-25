"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { getCurrentUserProfile } from "./auth";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  HalaqaWithDetails,
  TeacherWithHalaqat,
  AdminCenterOverview,
  StudentRow,
  SeasonRow,
  CircleRow,
  BulkImportPayload,
  BulkImportResult,
} from "@/types";
import { getSeasons } from "./season";
import { FALLBACK_SEASONS } from "@/lib/constants/seasons";
import { validateAndFormatJordanianPhone } from "@/lib/phoneUtils";

export interface AdminDataResult {
  success: boolean;
  error?: string;
  seasons?: SeasonRow[];
  overview?: AdminCenterOverview;
  halaqat?: HalaqaWithDetails[];
  teachers?: TeacherWithHalaqat[];
  students?: Array<
    StudentRow & {
      halaqa_name?: string;
      teacher_name?: string;
      season_id?: string;
      season_name?: string;
    }
  >;
  currentUserIsAdmin?: boolean;
  currentUserId?: string;
}

/**
 * Helper: ensure caller is authenticated and possesses admin role
 */
async function checkAdminAuth() {
  const { user, profile, isAdmin } = await getCurrentUserProfile();
  if (!user) {
    return { authorized: false, user: null, profile: null, isAdmin: false, error: "AUTH_REQUIRED" };
  }
  if (!isAdmin || profile?.role !== "admin") {
    return { authorized: false, user, profile, isAdmin: false, error: "ADMIN_REQUIRED" };
  }
  return { authorized: true, user, profile, isAdmin: true };
}

/**
 * Fetch all comprehensive data for the Center Admin Dashboard
 */
export async function getAdminCenterData(): Promise<AdminDataResult> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: auth.error || "AUTH_REQUIRED" };
    }

    const supabase = createClient();

    // 1. Fetch seasons
    const seasonsRes = await getSeasons();
    const seasonsList = seasonsRes.data;
    const activeSeason = seasonsRes.activeSeason || seasonsList[0];
    const seasonMap = new Map(seasonsList.map((s) => [s.id, s]));

    // 2. Fetch all profiles (teachers & admins)
    let profiles: any[] = [];
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*");
      if (!error && data) profiles = data;
    } catch (e) {
      console.error("Failed to fetch profiles:", e);
    }

    // 3. Fetch all circles (season-linked halaqat)
    let circles: CircleRow[] = [];
    try {
      const { data: cData, error: cErr } = await supabase
        .from("circles")
        .select("*");
      if (!cErr && cData) circles = cData as CircleRow[];
    } catch (e) {
      console.error("Failed to fetch circles:", e);
    }

    // 4. Fetch all groups (halaqat)
    let groups: any[] = [];
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*");
      if (!error && data) groups = data;
    } catch (e) {
      console.error("Failed to fetch groups:", e);
    }

    // 5. Fetch all group_members
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

    // Build circleMap
    const circleMap = new Map<string, CircleRow>(circles.map((c) => [c.id, c]));

    // Halaqat with Details - unify circles and groups
    const allHalaqaIds = new Set<string>();
    safeGroups.forEach((g) => allHalaqaIds.add(g.id));
    circles.forEach((c) => allHalaqaIds.add(c.id));

    const halaqatWithDetails: HalaqaWithDetails[] = Array.from(allHalaqaIds).map((id) => {
      const c = circleMap.get(id);
      const g = groupMap.get(id);
      const name = c?.name || g?.name || "حلقة";
      const seasonId = c?.season_id || activeSeason.id;
      const seasonName = seasonMap.get(seasonId)?.name || activeSeason.name;
      const assignedTeacher = groupToTeacherMap.get(id);
      const teacherId = c?.teacher_id || assignedTeacher?.id || null;
      const teacherName = teacherId
        ? profileMap.get(teacherId)?.full_name || profileMap.get(teacherId)?.name || assignedTeacher?.name || "غير معين"
        : assignedTeacher?.name || "غير معين";
      const teacherPhone = teacherId ? profileMap.get(teacherId)?.phone || assignedTeacher?.phone || null : null;

      const groupStudents = safeStudents.filter((s: any) => s.group_id === id);
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
        id,
        name,
        created_by: g?.created_by || null,
        created_at: c?.created_at || g?.created_at || new Date().toISOString(),
        teacher_id: teacherId,
        teacher_name: teacherName,
        teacher_phone: teacherPhone,
        season_id: seasonId,
        season_name: seasonName,
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

    // Enriched Students with season mapping
    const enrichedStudents = safeStudents.map((s: any) => {
      const g = s.group_id ? groupMap.get(s.group_id) : null;
      const c = s.group_id ? circleMap.get(s.group_id) : null;
      const t = s.teacher_id ? profileMap.get(s.teacher_id) : null;
      const totalPages = Number((studentPagesMap.get(s.id) || 0).toFixed(1));
      const displayName = s.name || s.full_name || "بدون اسم";
      const seasonId = c?.season_id || activeSeason.id;
      const seasonName = seasonMap.get(seasonId)?.name || activeSeason.name;

      return {
        ...s,
        full_name: displayName,
        name: displayName,
        phone: s.phone || s.parent_phone || null,
        halaqa_name: c?.name || g?.name || "بدون حلقة",
        teacher_name: t?.full_name || t?.name || "غير محدد",
        season_id: seasonId,
        season_name: seasonName,
        total_pages_memorized: totalPages,
        total_pages_count: totalPages,
      };
    });

    // Overview KPIs
    const overview: AdminCenterOverview = {
      totalStudents: safeStudents.length,
      totalHalaqat: halaqatWithDetails.length,
      totalTeachers: safeProfiles.filter((p: any) => (p as any).role !== "admin").length || safeProfiles.length,
      attendanceRate: overallAttendanceRate,
      totalPagesMemorized: Number(totalPagesMemorized.toFixed(1)),
      totalRecitations: safeLogs.length,
      todayAttendanceCount: todayAttendance.length,
    };

    return {
      success: true,
      seasons: seasonsList,
      overview,
      halaqat: halaqatWithDetails,
      teachers: teachersWithHalaqat,
      students: enrichedStudents,
      currentUserIsAdmin: auth.isAdmin,
      currentUserId: auth.user?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
    };
  }
}

/**
 * Create a new Halaqa and optionally assign a teacher and season
 */
export async function createHalaqa(data: {
  name: string;
  teacher_id?: string;
  season_id?: string;
}) {
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

    // Determine target season (default to active season or permanent club)
    let targetSeasonId = data.season_id;
    if (!targetSeasonId) {
      const seasonsRes = await getSeasons();
      targetSeasonId = seasonsRes.activeSeason?.id || FALLBACK_SEASONS[0].id;
    }

    // 1. Ensure user profile exists and has admin privileges
    try {
      await supabase
        .from("profiles")
        .update({ role: "admin", is_active: true })
        .eq("id", user.id);
    } catch {
      // ignore
    }

    // 2. Insert into circles table (season-linked halaqat)
    try {
      await supabase.from("circles").insert({
        id: newGroupId,
        name: cleanName,
        season_id: targetSeasonId,
        teacher_id: data.teacher_id || null,
      });
    } catch (circleErr) {
      console.warn("Could not insert to circles table:", circleErr);
    }

    // 3. Insert into groups table
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

      newGroup = retry.data || { id: newGroupId, name: cleanName, created_by: user.id };
    } else {
      newGroup = insertedGroup || { id: newGroupId, name: cleanName, created_by: user.id };
    }

    // 4. Add creator to group_members so they are immediately part of the group
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

    // 5. If a teacher was assigned (and distinct from creator), also add to group_members
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

    // 6. Automatically activate this new Halaqa in cookies
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
    return {
      success: true,
      data: {
        ...newGroup,
        season_id: targetSeasonId,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

/**
 * Update Halaqa name, assigned teacher, and season
 */
export async function updateHalaqa(data: {
  id: string;
  name: string;
  teacher_id?: string;
  season_id?: string;
}) {
  try {
    const supabase = createClient();

    // 1. Update circles table
    try {
      const circleUpdates: any = { name: data.name.trim() };
      if (data.season_id) circleUpdates.season_id = data.season_id;
      if (data.teacher_id !== undefined) circleUpdates.teacher_id = data.teacher_id || null;
      await supabase.from("circles").update(circleUpdates).eq("id", data.id);
    } catch (circleErr) {
      console.warn("Could not update circles table:", circleErr);
    }

    // 2. Update groups table
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
 * Delete a Halaqa (unlinks students and cleans up circles/groups)
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

    // 3. Delete from circles
    try {
      await supabase.from("circles").delete().eq("id", id);
    } catch (e) {}

    // 4. Delete group
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
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: "غير مصرح، هذه العملية تتطلب صلاحية مدير المركز" };
    }

    if (data.role !== undefined && auth.user?.id === id && data.role !== "admin") {
      return { success: false, error: "لا يمكنك خفض رتبة حسابك الإداري الحالي" };
    }

    if (data.is_active === false && auth.user?.id === id) {
      return { success: false, error: "لا يمكنك تعطيل حسابك الإداري الحالي" };
    }

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
 * Includes multi-strategy fallback: Safe RPC, Service Role (if configured), and Standard Update
 */
export async function transferStudentHalaqa(
  studentId: string,
  newHalaqaId: string,
  newTeacherId?: string
): Promise<{ success: boolean; error?: string; warning?: string; isRlsError?: boolean }> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: "غير مصرح، هذه العملية تتطلب صلاحية مدير المركز" };
    }

    if (!studentId) {
      return { success: false, error: "معرف الطالب مطلوب" };
    }

    const supabase = createClient();

    // 1. Fetch current student record
    const { data: currentStudent, error: fetchErr } = await supabase
      .from("students")
      .select("id, name, group_id, teacher_id")
      .eq("id", studentId)
      .maybeSingle();

    if (fetchErr || !currentStudent) {
      return { success: false, error: "لم يتم العثور على بيانات الطالب المحدد" };
    }

    const cleanHalaqaId = newHalaqaId && newHalaqaId.trim() !== "" ? newHalaqaId.trim() : null;
    let cleanTeacherId = newTeacherId && newTeacherId.trim() !== "" ? newTeacherId.trim() : null;

    // 2. If target halaqa provided, ensure it exists in groups table for foreign key constraint
    if (cleanHalaqaId) {
      const { data: existingGroup } = await supabase
        .from("groups")
        .select("id, name, created_by")
        .eq("id", cleanHalaqaId)
        .maybeSingle();

      if (!existingGroup) {
        // Sync name from circles if available
        const { data: circleData } = await supabase
          .from("circles")
          .select("id, name, teacher_id")
          .eq("id", cleanHalaqaId)
          .maybeSingle();

        const groupName = circleData?.name || "حلقة قرآنية";
        const { error: groupInsertErr } = await supabase.from("groups").insert({
          id: cleanHalaqaId,
          name: groupName,
          created_by: auth.user.id,
        });

        if (groupInsertErr) {
          console.warn("transferStudentHalaqa: could not ensure group existence:", groupInsertErr);
        }
      }

      // If teacher not explicitly passed, resolve from group_members or circles
      if (!cleanTeacherId) {
        const { data: gm } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", cleanHalaqaId)
          .limit(1)
          .maybeSingle();

        if (gm?.user_id) {
          cleanTeacherId = gm.user_id;
        } else {
          const { data: c } = await supabase
            .from("circles")
            .select("teacher_id")
            .eq("id", cleanHalaqaId)
            .maybeSingle();
          if (c?.teacher_id) {
            cleanTeacherId = c.teacher_id;
          }
        }
      }
    }

    // 3. Validate teacher ID in profiles table
    let finalTeacherId = currentStudent.teacher_id;
    if (cleanTeacherId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", cleanTeacherId)
        .maybeSingle();
      if (prof) {
        finalTeacherId = prof.id;
      }
    }

    // Strategy 1: Safe RPC Function (if installed in Supabase)
    try {
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)("transfer_student_safe", {
        p_student_id: studentId,
        p_new_group_id: cleanHalaqaId,
        p_new_teacher_id: finalTeacherId,
      });

      if (!rpcError && (rpcData as any)?.success) {
        revalidatePath("/admin");
        revalidatePath("/students");
        revalidatePath("/dashboard");
        return { success: true };
      }
    } catch {
      // Proceed to next strategy
    }

    // Strategy 2: Admin Service Role Client (if SUPABASE_SERVICE_ROLE_KEY is present)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (serviceKey && supabaseUrl) {
      try {
        const adminClient = createSupabaseJsClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { error: adminUpdateErr } = await adminClient
          .from("students")
          .update({
            group_id: cleanHalaqaId,
            teacher_id: finalTeacherId,
          })
          .eq("id", studentId);

        if (!adminUpdateErr) {
          revalidatePath("/admin");
          revalidatePath("/students");
          revalidatePath("/dashboard");
          return { success: true };
        }
      } catch (adminClientErr) {
        console.warn("transferStudentHalaqa: admin service client update failed:", adminClientErr);
      }
    }

    // Strategy 3: Standard Client Update
    const updatePayload: {
      group_id: string | null;
      teacher_id: string;
    } = {
      group_id: cleanHalaqaId,
      teacher_id: finalTeacherId,
    };

    const { error: updateError } = await supabase
      .from("students")
      .update(updatePayload)
      .eq("id", studentId);

    if (!updateError) {
      revalidatePath("/admin");
      revalidatePath("/students");
      revalidatePath("/dashboard");
      return { success: true };
    }

    // Strategy 4: If changing teacher_id violated RLS, try updating group_id alone
    if (finalTeacherId !== currentStudent.teacher_id) {
      const { error: groupOnlyErr } = await supabase
        .from("students")
        .update({ group_id: cleanHalaqaId })
        .eq("id", studentId);

      if (!groupOnlyErr) {
        revalidatePath("/admin");
        revalidatePath("/students");
        revalidatePath("/dashboard");
        return {
          success: true,
          warning: "تم نقل الطالب إلى الحلقة بنجاح مع إبقاء المعلم السابق لسياسات الأمان.",
        };
      }
    }

    const errMsg = (updateError.message || "").toLowerCase();
    if (errMsg.includes("row-level security") || errMsg.includes("policy")) {
      return {
        success: false,
        error: "فشل النقل بسبب سياسة أمان قاعدة البيانات (RLS): جدول الطلاب يتطلب تفعيل صلاحية المدير لنقل الطلاب بين الحلقات. يرجى تشغيل كود SQL الخاص بالصلاحيات في Supabase.",
        isRlsError: true,
      };
    }

    return { success: false, error: "فشل نقل الطالب: " + updateError.message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع" };
  }
}

/**
 * Create a new teacher in Supabase Auth & public.profiles with role 'teacher'
 */
export async function createTeacher(data: {
  full_name: string;
  email: string;
  password: string;
  phone?: string | null;
}) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: "غير مصرح، هذه العملية تتطلب صلاحية مدير المركز" };
    }

    const fullName = data.full_name?.trim();
    const email = data.email?.trim().toLowerCase();
    const password = data.password;
    const phone = data.phone?.trim() || null;

    if (!fullName || fullName.length < 3) {
      return { success: false, error: "يرجى كتابة الاسم الرباعي للمعلم بشكل صحيح" };
    }
    if (!email || !email.includes("@")) {
      return { success: false, error: "يرجى إدخال بريد إلكتروني صالح" };
    }
    if (!password || password.length < 6) {
      return { success: false, error: "كلمة المرور يجب ألا تقل عن 6 خانات" };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: "إعدادات الاتصال بقاعدة البيانات غير متوفرة" };
    }

    // Use isolated Supabase JS client to avoid touching current admin session cookies
    const isolatedClient = createSupabaseJsClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data: authData, error: authErr } = await isolatedClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: "teacher",
        },
      },
    });

    if (authErr) {
      const msg = authErr.message?.toLowerCase() || "";
      if (authErr.status === 429 || msg.includes("rate limit")) {
        return {
          success: false,
          error: "تم تجاوز حد إنشاء الحسابات في Supabase مؤقتاً، يرجى الانتظار قليلاً أو مراجعة إعدادات تأكيد البريد.",
        };
      }
      return { success: false, error: "فشل إنشاء الحساب: " + authErr.message };
    }

    if (authData?.user?.identities && authData.user.identities.length === 0) {
      return {
        success: false,
        error: "هذا البريد الإلكتروني مسجل بالفعل مسبقاً لمستخدم آخر.",
      };
    }

    const newUserId = authData?.user?.id;
    if (!newUserId) {
      return { success: false, error: "تعذر الحصول على معرف المستخدم الجديد" };
    }

    // Ensure/update profile record in public.profiles with teacher role
    const supabase = createClient();
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: newUserId,
      full_name: fullName,
      phone: phone,
      role: "teacher",
      is_active: true,
    });

    if (profileErr) {
      console.warn("Profile upsert notice:", profileErr.message);
    }

    revalidatePath("/admin");
    return {
      success: true,
      teacher: {
        id: newUserId,
        full_name: fullName,
        phone: phone,
        role: "teacher",
        is_active: true,
        created_at: new Date().toISOString(),
        halaqat: [],
        students_count: 0,
      } as TeacherWithHalaqat,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع أثناء إضافة المعلم" };
  }
}

/**
 * Delete teacher completely from public.profiles, unlinking their halaqat
 */
export async function deleteTeacher(teacherId: string) {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: "غير مصرح، هذه العملية تتطلب صلاحية مدير المركز" };
    }

    if (auth.user?.id === teacherId) {
      return { success: false, error: "لا يمكنك حذف حسابك الإداري الحالي" };
    }

    const supabase = createClient();

    // 1. Unlink teacher from any circles/halaqat
    const { error: circleErr } = await supabase
      .from("circles")
      .update({ teacher_id: null })
      .eq("teacher_id", teacherId);
    if (circleErr) {
      console.warn("Unlink circles warning:", circleErr.message);
    }

    // 2. Remove from group_members
    const { error: gmErr } = await supabase
      .from("group_members")
      .delete()
      .eq("user_id", teacherId);
    if (gmErr) {
      console.warn("Remove group_members warning:", gmErr.message);
    }

    // 3. Reassign any students linked to this teacher to the current admin to prevent cascade deletion
    const { error: stdErr } = await supabase
      .from("students")
      .update({ teacher_id: auth.user.id })
      .eq("teacher_id", teacherId);
    if (stdErr) {
      console.warn("Reassign students warning:", stdErr.message);
    }

    // 4. Delete profile from public.profiles
    const { error: delErr } = await supabase
      .from("profiles")
      .delete()
      .eq("id", teacherId);

    if (delErr) {
      return { success: false, error: "فشل حذف المعلم من قاعدة البيانات: " + delErr.message };
    }

    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "خطأ غير متوقع أثناء حذف المعلم" };
  }
}

/**
 * Bulk import students for a specific circle (Admin only)
 * PRIMARY: Uses SECURITY DEFINER RPC (bulk_import_students_safe) to bypass RLS and FK issues.
 * FALLBACK: Direct insert with manual group sync via ensure_group_from_circle RPC.
 */
export async function bulkImportStudents(payload: BulkImportPayload): Promise<BulkImportResult> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized || !auth.user) {
      return {
        success: false,
        error: "عذراً، هذه الميزة مخصصة لمدير المركز فقط",
        insertedCount: 0,
        failedCount: 0,
        insertedStudents: [],
      };
    }

    if (!payload.circle_id || !Array.isArray(payload.students) || payload.students.length === 0) {
      return {
        success: false,
        error: "يرجى تحديد الحلقة وقائمة الطلاب المراد استيرادهم",
        insertedCount: 0,
        failedCount: 0,
        insertedStudents: [],
      };
    }

    const supabase = createClient();

    const normalizedStudents = payload.students.map((s) => {
      let phone = (s.parent_phone || "").trim();
      if (phone) {
        const phoneCheck = validateAndFormatJordanianPhone(phone);
        if (phoneCheck.isValid && phoneCheck.local) {
          phone = phoneCheck.local;
        } else {
          phone = phone.replace(/[^\d+]/g, "") || phone;
        }
      }
      return {
        name: (s.name || "").trim(),
        parent_phone: phone || "0700000000",
        notes: s.notes ? s.notes.trim() : null,
      };
    });

    // PRIMARY: SECURITY DEFINER RPC bypasses RLS and FK constraints
    const { data: rpcRaw, error: rpcError } = await supabase.rpc(
      "bulk_import_students_safe",
      {
        p_circle_id: payload.circle_id,
        p_students: normalizedStudents as any,
        p_requesting_user_id: auth.user.id,
      }
    );
    const rpcResult = rpcRaw as any;

    if (!rpcError && rpcResult && rpcResult.success) {
      revalidatePath("/admin");
      revalidatePath("/students");
      revalidatePath("/dashboard");

      const inserted: Array<{
        id: string;
        name: string;
        parent_phone: string | null;
        parent_token: string;
        track_url: string;
        group_id: string;
        teacher_id?: string;
      }> = (rpcResult.inserted_students || []).map((s: any) => ({
        id: s.id,
        name: s.name || "طالب",
        parent_phone: s.parent_phone || null,
        parent_token: s.parent_token,
        track_url: s.track_url || `/parent/${s.parent_token}`,
        group_id: s.group_id || payload.circle_id,
        teacher_id: s.teacher_id,
      }));

      return {
        success: true,
        insertedCount: rpcResult.inserted_count || inserted.length,
        failedCount: rpcResult.failed_count || 0,
        insertedStudents: inserted,
        errors: rpcResult.errors && rpcResult.errors.length > 0 ? rpcResult.errors : undefined,
      };
    }

    if (rpcError) {
      console.warn("bulk_import_students_safe RPC failed, falling back:", rpcError.message);
    } else if (rpcResult && !rpcResult.success) {
      return {
        success: false,
        error: rpcResult.error || "فشل الاستيراد عبر قاعدة البيانات",
        insertedCount: 0,
        failedCount: payload.students.length,
        insertedStudents: [],
      };
    }


    // FALLBACK: Direct insert after syncing groups table
    const targetGroupId: string = payload.circle_id;
    try { await supabase.rpc("ensure_group_from_circle", { p_circle_id: targetGroupId }); } catch { /* ignore */ }


    let assignedTeacherId: string = auth.user.id;
    const { data: circleData } = await supabase
      .from("circles")
      .select("teacher_id")
      .eq("id", targetGroupId)
      .maybeSingle();
    if (circleData?.teacher_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", circleData.teacher_id)
        .maybeSingle();
      if (prof) assignedTeacherId = circleData.teacher_id;
    }

    const rowsToInsert = normalizedStudents
      .filter((s) => s.name && s.name.length >= 2)
      .map((s) => ({
        name: s.name,
        parent_phone: s.parent_phone,
        group_id: targetGroupId,
        teacher_id: assignedTeacherId,
        parent_token: crypto.randomUUID(),
        notes: s.notes || null,
      }));

    if (rowsToInsert.length === 0) {
      return {
        success: false,
        error: "لم يتم العثور على أي صفوف صالحة للاستيراد",
        insertedCount: 0,
        failedCount: payload.students.length,
        insertedStudents: [],
      };
    }

    const errors: string[] = [];
    const insertedStudents: Array<{
      id: string;
      name: string;
      parent_phone: string | null;
      parent_token: string;
      track_url: string;
      group_id: string;
      teacher_id?: string;
    }> = [];

    const CHUNK_SIZE = 50;
    for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
      const { data: insertedRows, error: insertError } = await supabase
        .from("students")
        .insert(chunk)
        .select("id, name, parent_phone, parent_token, group_id, teacher_id");

      if (!insertError && insertedRows) {
        insertedRows.forEach((row: any) => {
          insertedStudents.push({
            id: row.id,
            name: row.name || "طالب",
            parent_phone: row.parent_phone,
            parent_token: row.parent_token,
            track_url: `/parent/${row.parent_token}`,
            group_id: targetGroupId,
            teacher_id: row.teacher_id,
          });
        });
      } else if (insertError) {
        for (let rIdx = 0; rIdx < chunk.length; rIdx++) {
          const single = chunk[rIdx];
          const globalIdx = i + rIdx + 1;
          const { data: singleData, error: singleErr } = await supabase
            .from("students")
            .insert({ ...single, teacher_id: auth.user.id })
            .select("id, name, parent_phone, parent_token, group_id, teacher_id")
            .maybeSingle();
          if (!singleErr && singleData) {
            insertedStudents.push({
              id: singleData.id,
              name: singleData.name || "طالب",
              parent_phone: singleData.parent_phone,
              parent_token: singleData.parent_token,
              track_url: `/parent/${singleData.parent_token}`,
              group_id: targetGroupId,
              teacher_id: singleData.teacher_id,
            });
          } else {
            errors.push(
              `الطالب ${single.name} (الصف ${globalIdx}): ${singleErr?.message || "فشل الإدراج"}`
            );
          }
        }
      }
    }

    revalidatePath("/admin");
    revalidatePath("/students");
    revalidatePath("/dashboard");

    if (insertedStudents.length === 0) {
      return {
        success: false,
        error: errors.length > 0 ? errors.join("\n") : "فشل إدراج الطلاب في قاعدة البيانات",
        insertedCount: 0,
        failedCount: payload.students.length,
        insertedStudents: [],
        errors,
      };
    }

    return {
      success: true,
      insertedCount: insertedStudents.length,
      failedCount: payload.students.length - insertedStudents.length,
      insertedStudents,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err) {
    console.error("Unexpected error in bulkImportStudents:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الاستيراد الجماعي",
      insertedCount: 0,
      failedCount: payload.students?.length || 0,
      insertedStudents: [],
    };
  }
}

/**
 * Permanently deletes a single student and all their associated records
 * (attendance, logs, activity responses, avatars) from the database completely.
 * STRICTLY restricted to Center Admins.
 */
export async function permanentlyDeleteStudentByAdmin(
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: "غير مصرح، هذه العملية تتطلب صلاحية مدير المركز" };
    }

    if (!studentId) {
      return { success: false, error: "معرف الطالب مطلوب" };
    }

    const supabase = createClient();

    // 1. Fetch student info for avatar cleanup
    const { data: student, error: fetchErr } = await supabase
      .from("students")
      .select("id, name, avatar_url")
      .eq("id", studentId)
      .maybeSingle();

    if (fetchErr || !student) {
      return { success: false, error: "لم يتم العثور على بيانات الطالب المحدد" };
    }

    // Determine client to use: service role (if available) or standard authenticated client
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let clientToUse: any = supabase;

    if (serviceKey && supabaseUrl) {
      try {
        clientToUse = createSupabaseJsClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      } catch {
        clientToUse = supabase;
      }
    }

    // 2. Cascade delete activity responses
    try {
      await clientToUse
        .from("activity_responses")
        .delete()
        .eq("student_id", studentId);
    } catch (e) {
      console.warn("Could not delete activity_responses for student:", e);
    }

    // 3. Cascade delete attendance records
    try {
      await clientToUse
        .from("attendance_records")
        .delete()
        .eq("student_id", studentId);

      await clientToUse
        .from("attendance")
        .delete()
        .eq("student_id", studentId);
    } catch (e) {
      console.warn("Could not delete attendance records for student:", e);
    }

    // 4. Cascade delete memorization logs
    try {
      await clientToUse
        .from("memorization_logs")
        .delete()
        .eq("student_id", studentId);
    } catch (e) {
      console.warn("Could not delete memorization logs for student:", e);
    }

    // 5. Permanently delete student record
    const { error: delError } = await clientToUse
      .from("students")
      .delete()
      .eq("id", studentId);

    if (delError) {
      return {
        success: false,
        error: "فشل حذف الطالب نهائياً من قاعدة البيانات: " + delError.message,
      };
    }

    // 6. Non-blocking avatar cleanup
    if (student.avatar_url && student.avatar_url.includes("/avatars/")) {
      try {
        const path = student.avatar_url.split("/avatars/")[1];
        if (path) {
          await supabase.storage.from("avatars").remove([path]);
        }
      } catch {
        // ignore
      }
    }

    revalidatePath("/admin");
    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/trash");

    return { success: true };
  } catch (err) {
    console.error("Unexpected error in permanentlyDeleteStudentByAdmin:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء حذف الطالب",
    };
  }
}

/**
 * Permanently deletes ALL students and their cascading records from the center.
 * STRICTLY restricted to Center Admins.
 */
export async function deleteAllStudentsPermanentlyByAdmin(): Promise<{
  success: boolean;
  error?: string;
  deletedCount?: number;
}> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: "غير مصرح، هذه العملية تتطلب صلاحية مدير المركز" };
    }

    const supabase = createClient();

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let clientToUse: any = supabase;

    if (serviceKey && supabaseUrl) {
      try {
        clientToUse = createSupabaseJsClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      } catch {
        clientToUse = supabase;
      }
    }

    // 1. Cascade delete activity responses
    try {
      await clientToUse.from("activity_responses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {
      console.warn("Could not delete activity_responses:", e);
    }

    // 2. Cascade delete attendance records
    try {
      await clientToUse.from("attendance_records").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await clientToUse.from("attendance").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {
      console.warn("Could not delete attendance_records:", e);
    }

    // 3. Cascade delete memorization logs
    try {
      await clientToUse.from("memorization_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } catch (e) {
      console.warn("Could not delete memorization_logs:", e);
    }

    // 4. Delete all students
    const { data: deletedRows, error: delError } = await clientToUse
      .from("students")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");

    if (delError) {
      return {
        success: false,
        error: "فشل حذف بيانات الطلاب: " + delError.message,
      };
    }

    revalidatePath("/admin");
    revalidatePath("/students");
    revalidatePath("/dashboard");
    revalidatePath("/trash");

    return {
      success: true,
      deletedCount: deletedRows?.length || 0,
    };
  } catch (err) {
    console.error("Unexpected error in deleteAllStudentsPermanentlyByAdmin:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تصفير بيانات الطلاب",
    };
  }
}

/**
 * Assign all unassigned students (group_id IS NULL) to a specified Halaqa
 */
export async function assignUnassignedStudentsToHalaqa(halaqaId: string): Promise<{
  success: boolean;
  updatedCount: number;
  error?: string;
}> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized || !auth.user) {
      return { success: false, updatedCount: 0, error: "هذه العملية مخصصة لمدير المركز فقط" };
    }

    if (!halaqaId) {
      return { success: false, updatedCount: 0, error: "يرجى تحديد الحلقة المستهدفة" };
    }

    const supabase = createClient();

    // 1. Ensure target halaqa exists in groups & circles
    const { data: circleData } = await supabase
      .from("circles")
      .select("id, name, teacher_id")
      .eq("id", halaqaId)
      .maybeSingle();

    const circleName = circleData?.name || "حلقة القرآن الكريم";
    let assignedTeacherId = circleData?.teacher_id || auth.user.id;

    // Check teacher in profiles
    const { data: prof } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", assignedTeacherId)
      .maybeSingle();
    if (!prof) {
      assignedTeacherId = auth.user.id;
    }

    // Ensure groups table has this id
    try {
      await supabase.from("groups").upsert({
        id: halaqaId,
        name: circleName,
      }, { onConflict: "id" });
    } catch {}

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let adminServiceClient: any = null;
    if (serviceKey && supabaseUrl) {
      try {
        adminServiceClient = createSupabaseJsClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await adminServiceClient.from("groups").upsert({
          id: halaqaId,
          name: circleName,
        }, { onConflict: "id" });
      } catch {}
    }

    // 2. Query all unassigned students
    const clientToQuery = adminServiceClient || supabase;
    const { data: unassignedStudents, error: fetchErr } = await clientToQuery
      .from("students")
      .select("id")
      .is("group_id", null);

    if (fetchErr) {
      return { success: false, updatedCount: 0, error: "فشل استعلام الطلاب: " + fetchErr.message };
    }

    if (!unassignedStudents || unassignedStudents.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    const unassignedIds = unassignedStudents.map((s: any) => s.id);

    // 3. Batch update
    let updatedCount = 0;
    const updateRes = await clientToQuery
      .from("students")
      .update({
        group_id: halaqaId,
        teacher_id: assignedTeacherId,
      })
      .in("id", unassignedIds)
      .select("id");

    if (!updateRes.error && updateRes.data) {
      updatedCount = updateRes.data.length;
    } else {
      // Fallback: one-by-one via transfer_student_safe RPC
      for (const stId of unassignedIds) {
        try {
          const { data: rpcRes } = await (supabase.rpc as any)("transfer_student_safe", {
            p_student_id: stId,
            p_new_group_id: halaqaId,
            p_new_teacher_id: assignedTeacherId,
          });
          if ((rpcRes as any)?.success) updatedCount++;
        } catch {}
      }
    }

    revalidatePath("/admin");
    revalidatePath("/students");
    revalidatePath("/dashboard");

    return {
      success: true,
      updatedCount,
    };
  } catch (err) {
    console.error("Error in assignUnassignedStudentsToHalaqa:", err);
    return {
      success: false,
      updatedCount: 0,
      error: err instanceof Error ? err.message : "حدث خطأ أثناء تسكين الطلاب في الحلقة",
    };
  }
}



