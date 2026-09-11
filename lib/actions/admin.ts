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
} from "@/types";
import { getSeasons } from "./season";
import { FALLBACK_SEASONS } from "@/lib/constants/seasons";

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

