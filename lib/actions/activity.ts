"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "./auth";
import { revalidatePath } from "next/cache";
import {
  ActivityRow,
  ActivityResponseRow,
  ActivityWithStats,
  ActivityWithResponse,
} from "@/types";

/**
 * Check if the user is authorized admin
 */
async function checkAdminAuth() {
  const { user, profile, isAdmin } = await getCurrentUserProfile();
  if (!user || (!isAdmin && profile?.role !== "admin")) {
    return { authorized: false, user: null, error: "ADMIN_REQUIRED" };
  }
  return { authorized: true, user, profile };
}

/**
 * Fetch all activities for center admin dashboard with response counts
 */
export async function getActivitiesForAdmin(): Promise<{
  success: boolean;
  data: ActivityWithStats[];
  error?: string;
  isMissingTables?: boolean;
}> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, data: [], error: "غير مصرح لك بالوصول، يرجى تسجيل الدخول كمدير" };
    }

    const supabase = createClient();

    // 1. Query Supabase activities table
    const { data: dbActivities, error: actError } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false });

    if (actError) {
      const isMissingTable =
        actError.code === "PGRST205" ||
        actError.message?.toLowerCase().includes("activities") ||
        actError.hint?.toLowerCase().includes("activities");

      if (isMissingTable) {
        console.warn("[getActivitiesForAdmin] Supabase activities table does not exist yet.");
        return {
          success: true,
          data: [],
          isMissingTables: true,
        };
      }

      console.error("[getActivitiesForAdmin] Supabase query error:", actError);
      return { success: false, data: [], error: actError.message };
    }

    const activitiesList: ActivityRow[] = (dbActivities as any) || [];
    if (activitiesList.length === 0) {
      return { success: true, data: [], isMissingTables: false };
    }

    // 2. Fetch all responses to aggregate stats
    let responsesList: ActivityResponseRow[] = [];
    const { data: dbResponses, error: respError } = await supabase
      .from("activity_responses")
      .select("*");

    if (!respError && Array.isArray(dbResponses)) {
      responsesList = dbResponses as any;
    }

    // 3. Fetch students to map names (using 'name' which exists in schema)
    let studentMap = new Map<string, string>();
    try {
      const { data: dbStudents } = await supabase
        .from("students")
        .select("id, name, group_id")
        .is("deleted_at", null);

      if (dbStudents) {
        studentMap = new Map(
          dbStudents.map((s: any) => [s.id, s.name || "طالب"])
        );
      }
    } catch (stErr) {
      console.warn("[getActivitiesForAdmin] Error fetching students map:", stErr);
    }

    // 4. Map activities with detailed counts & populated responses
    const activitiesWithStats: ActivityWithStats[] = activitiesList.map((act) => {
      const matchingResponses = responsesList.filter((r) => r.activity_id === act.id);
      const approvedCount = matchingResponses.filter((r) => r.status === "approved").length;
      const rejectedCount = matchingResponses.filter((r) => r.status === "rejected").length;
      const pendingCount = matchingResponses.filter((r) => r.status === "pending").length;

      const populatedResponses = matchingResponses.map((r) => ({
        ...r,
        student_name: studentMap.get(r.student_id) || "طالب",
      }));

      return {
        ...act,
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        pending_count: pendingCount,
        responses: populatedResponses,
      };
    });

    return { success: true, data: activitiesWithStats, isMissingTables: false };
  } catch (err: any) {
    console.error("[getActivitiesForAdmin] Exception:", err);
    return { success: false, data: [], error: "تعذر تحميل بيانات النشاطات" };
  }
}

/**
 * Create a new trip or activity
 */
export async function createActivity(payload: {
  title: string;
  activity_type: string;
  cost: string;
  activity_date: string;
  location?: string;
  description?: string;
  target_type: "all" | "halaqa";
  target_group_id?: string | null;
  target_group_name?: string | null;
}): Promise<{
  success: boolean;
  data?: ActivityRow;
  error?: string;
  errorCode?: "TABLES_NOT_FOUND" | "UNAUTHORIZED" | "VALIDATION_ERROR" | "DATABASE_ERROR";
}> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: "غير مصرح لك بإضافة نشاط", errorCode: "UNAUTHORIZED" };
    }

    if (!payload.title || !payload.title.trim()) {
      return { success: false, error: "يرجى كتابة عنوان أو نوع الرحلة", errorCode: "VALIDATION_ERROR" };
    }

    const supabase = createClient();
    const newActivity: Partial<ActivityRow> = {
      title: payload.title.trim(),
      activity_type: payload.activity_type || "رحلة ترفيهية",
      cost: payload.cost?.trim() || "مجاناً",
      activity_date: payload.activity_date || new Date().toISOString(),
      location: payload.location?.trim() || null,
      description: payload.description?.trim() || null,
      target_type: payload.target_type || "all",
      target_group_id: payload.target_type === "halaqa" ? payload.target_group_id || null : null,
      target_group_name: payload.target_type === "halaqa" ? payload.target_group_name || null : null,
      is_active: true,
      created_by: auth.user?.id || null,
    };

    // Insert directly into Supabase activities table
    const { data: inserted, error: insertError } = await supabase
      .from("activities")
      .insert(newActivity as any)
      .select("*")
      .maybeSingle();

    if (insertError) {
      console.error("[createActivity] Supabase insert error:", insertError);
      const isMissingTable =
        insertError.code === "PGRST205" ||
        insertError.message?.toLowerCase().includes("activities") ||
        insertError.hint?.toLowerCase().includes("activities");

      if (isMissingTable) {
        return {
          success: false,
          errorCode: "TABLES_NOT_FOUND",
          error:
            "جداول النشاطات لم تُنشأ بعد في قاعدة بيانات Supabase. يرجى نسخ كود الـ SQL وتشغيله لمرة واحدة في لوحة Supabase لتفعيل الميزة.",
        };
      }

      return {
        success: false,
        errorCode: "DATABASE_ERROR",
        error: "حدث خطأ أثناء حفظ النشاط في قاعدة البيانات: " + insertError.message,
      };
    }

    if (!inserted) {
      return {
        success: false,
        errorCode: "DATABASE_ERROR",
        error: "لم يتم استلام تأكيد الحفظ من قاعدة البيانات",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/parent");
    return { success: true, data: inserted as ActivityRow };
  } catch (err: any) {
    console.error("[createActivity] Exception:", err);
    return {
      success: false,
      errorCode: "DATABASE_ERROR",
      error: err.message || "حدث خطأ أثناء حفظ النشاط",
    };
  }
}

/**
 * Delete an activity
 */
export async function deleteActivity(activityId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: "غير مصرح لك بحذف النشاط" };
    }

    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("activities")
      .delete()
      .eq("id", activityId);

    if (dbError) {
      console.error("[deleteActivity] DB Error:", dbError);
      return { success: false, error: "تعذر حذف النشاط من قاعدة البيانات: " + dbError.message };
    }

    revalidatePath("/admin");
    revalidatePath("/parent");
    return { success: true };
  } catch (err: any) {
    console.error("[deleteActivity] Exception:", err);
    return { success: false, error: "تعذر حذف النشاط" };
  }
}

/**
 * Fetch relevant activities for a parent with their student's response
 */
export async function getActivitiesForParent(
  studentId: string,
  groupId?: string | null
): Promise<ActivityWithResponse[]> {
  if (!studentId) return [];

  try {
    const supabase = createClient();

    // 1. Fetch active activities
    const { data: dbActivities, error } = await supabase
      .from("activities")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error || !Array.isArray(dbActivities) || dbActivities.length === 0) {
      return [];
    }

    const activeList = dbActivities as ActivityRow[];

    // 2. Filter activities targeted to 'all' or this student's specific group
    const targetedActivities = activeList.filter((act) => {
      if (act.target_type === "all") return true;
      if (act.target_type === "halaqa" && act.target_group_id && groupId) {
        return String(act.target_group_id) === String(groupId);
      }
      return true; // if no specific match, show to prevent missing announcements
    });

    if (targetedActivities.length === 0) return [];

    // 3. Fetch this student's responses
    let studentResponses: ActivityResponseRow[] = [];
    const { data: dbResponses, error: respErr } = await supabase
      .from("activity_responses")
      .select("*")
      .eq("student_id", studentId);

    if (!respErr && Array.isArray(dbResponses) && dbResponses.length > 0) {
      studentResponses = dbResponses as ActivityResponseRow[];
    }

    const responseMap = new Map(studentResponses.map((r) => [r.activity_id, r]));

    return targetedActivities.map((act) => {
      const userResp = responseMap.get(act.id);
      return {
        ...act,
        parent_response: userResp?.status === "approved" || userResp?.status === "rejected" ? userResp.status : null,
        parent_response_notes: userResp?.notes || null,
        parent_response_date: userResp?.created_at || null,
      };
    });
  } catch (err) {
    console.error("[getActivitiesForParent] Exception:", err);
    return [];
  }
}

/**
 * Submit parent approval or rejection for an activity
 */
export async function submitActivityResponse(payload: {
  activityId: string;
  studentId: string;
  status: "approved" | "rejected";
  notes?: string;
  parentToken: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { activityId, studentId, status, notes, parentToken } = payload;
    if (!activityId || !studentId || !status || !parentToken) {
      return { success: false, error: "بيانات غير مكتملة" };
    }

    const supabase = createClient();

    // Verify parentToken matches studentId to prevent unauthorized voting
    const { data: studentRecord, error: stErr } = await supabase
      .from("students")
      .select("id, parent_phone")
      .eq("parent_token", parentToken.trim())
      .maybeSingle();

    if (stErr || !studentRecord || studentRecord.id !== studentId) {
      return { success: false, error: "رابط المتابعة غير مطابق لبيانات الطالب" };
    }

    const now = new Date().toISOString();
    const responsePayload = {
      activity_id: activityId,
      student_id: studentId,
      status,
      notes: notes?.trim() || null,
      parent_phone: studentRecord.parent_phone || null,
      updated_at: now,
    };

    // Upsert into Supabase activity_responses table
    const { error: upsertErr } = await supabase
      .from("activity_responses")
      .upsert(responsePayload as any, {
        onConflict: "activity_id,student_id",
      });

    if (upsertErr) {
      console.error("[submitActivityResponse] upsert error:", upsertErr);
      return { success: false, error: "تعذر تسجيل ردكم في قاعدة البيانات: " + upsertErr.message };
    }

    revalidatePath(`/parent/${parentToken}`);
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    console.error("[submitActivityResponse] Exception:", err);
    return { success: false, error: "حدث خطأ أثناء تسجيل ردكم، يرجى المحاولة ثانية" };
  }
}
