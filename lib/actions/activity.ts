"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "./auth";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import {
  ActivityRow,
  ActivityResponseRow,
  ActivityWithStats,
  ActivityWithResponse,
} from "@/types";

// Local fallback store path when Supabase migration hasn't been applied yet
const FALLBACK_STORE_DIR = path.join(process.cwd(), "data");
const FALLBACK_STORE_FILE = path.join(FALLBACK_STORE_DIR, "activities_fallback.json");

interface FallbackStoreData {
  activities: ActivityRow[];
  responses: ActivityResponseRow[];
}

function readFallbackStore(): FallbackStoreData {
  try {
    if (!fs.existsSync(FALLBACK_STORE_DIR)) {
      fs.mkdirSync(FALLBACK_STORE_DIR, { recursive: true });
    }
    if (!fs.existsSync(FALLBACK_STORE_FILE)) {
      const initial: FallbackStoreData = { activities: [], responses: [] };
      fs.writeFileSync(FALLBACK_STORE_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const content = fs.readFileSync(FALLBACK_STORE_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.warn("[Activities Fallback Store] Read error:", err);
    return { activities: [], responses: [] };
  }
}

function writeFallbackStore(data: FallbackStoreData) {
  try {
    if (!fs.existsSync(FALLBACK_STORE_DIR)) {
      fs.mkdirSync(FALLBACK_STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Activities Fallback Store] Write error:", err);
  }
}

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
  isUsingFallback?: boolean;
}> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, data: [], error: "غير مصرح لك بالوصول، يرجى تسجيل الدخول كمدير" };
    }

    const supabase = createClient();

    // 1. Try querying Supabase activities table
    const { data: dbActivities, error: actError } = await supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false });

    // If Supabase table exists and succeeded
    if (!actError && Array.isArray(dbActivities)) {
      // Fetch all responses to aggregate stats
      const { data: dbResponses } = await supabase
        .from("activity_responses")
        .select("*");

      const responsesList: ActivityResponseRow[] = (dbResponses as any) || [];

      // Fetch all students for names
      const { data: dbStudents } = await supabase
        .from("students")
        .select("id, name, full_name, group_id")
        .is("deleted_at", null);

      const studentMap = new Map((dbStudents || []).map((s: any) => [s.id, s.name || s.full_name || "طالب"]));

      const activitiesWithStats: ActivityWithStats[] = dbActivities.map((act: any) => {
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

      return { success: true, data: activitiesWithStats, isUsingFallback: false };
    }

    // 2. Fallback to resilient store if Supabase table is not yet created
    console.info("[getActivitiesForAdmin] Supabase table not found or errored, using resilient fallback store.");
    const fallback = readFallbackStore();

    // Fetch students to populate names
    let studentMap = new Map<string, string>();
    try {
      const { data: dbStudents } = await supabase
        .from("students")
        .select("id, name, full_name")
        .is("deleted_at", null);
      if (dbStudents) {
        studentMap = new Map(dbStudents.map((s: any) => [s.id, s.name || s.full_name || "طالب"]));
      }
    } catch {}

    const result: ActivityWithStats[] = fallback.activities.map((act) => {
      const matching = fallback.responses.filter((r) => r.activity_id === act.id);
      return {
        ...act,
        approved_count: matching.filter((r) => r.status === "approved").length,
        rejected_count: matching.filter((r) => r.status === "rejected").length,
        pending_count: matching.filter((r) => r.status === "pending").length,
        responses: matching.map((r) => ({
          ...r,
          student_name: studentMap.get(r.student_id) || "طالب",
        })),
      };
    });

    return { success: true, data: result, isUsingFallback: true };
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
}): Promise<{ success: boolean; data?: ActivityRow; error?: string }> {
  try {
    const auth = await checkAdminAuth();
    if (!auth.authorized) {
      return { success: false, error: "غير مصرح لك بإضافة نشاط" };
    }

    if (!payload.title || !payload.title.trim()) {
      return { success: false, error: "يرجى كتابة عنوان أو نوع الرحلة" };
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

    // 1. Try Supabase insert
    const { data: inserted, error: insertError } = await supabase
      .from("activities")
      .insert(newActivity as any)
      .select("*")
      .maybeSingle();

    if (!insertError && inserted) {
      revalidatePath("/admin");
      revalidatePath("/parent");
      return { success: true, data: inserted as ActivityRow };
    }

    // 2. Resilient fallback insert
    console.info("[createActivity] Supabase insert failed/table not found, saving to fallback store.");
    const fallback = readFallbackStore();
    const createdItem: ActivityRow = {
      id: crypto.randomUUID(),
      title: newActivity.title!,
      activity_type: newActivity.activity_type!,
      cost: newActivity.cost!,
      activity_date: newActivity.activity_date!,
      location: newActivity.location,
      description: newActivity.description,
      target_type: newActivity.target_type!,
      target_group_id: newActivity.target_group_id,
      target_group_name: newActivity.target_group_name,
      is_active: true,
      created_at: new Date().toISOString(),
      created_by: auth.user?.id || null,
    };

    fallback.activities.unshift(createdItem);
    writeFallbackStore(fallback);

    revalidatePath("/admin");
    revalidatePath("/parent");
    return { success: true, data: createdItem };
  } catch (err: any) {
    console.error("[createActivity] Exception:", err);
    return { success: false, error: err.message || "حدث خطأ أثناء حفظ النشاط" };
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

    // Also remove from fallback store if exists
    const fallback = readFallbackStore();
    fallback.activities = fallback.activities.filter((a) => a.id !== activityId);
    fallback.responses = fallback.responses.filter((r) => r.activity_id !== activityId);
    writeFallbackStore(fallback);

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

    // 1. Try Supabase
    let { data: dbActivities, error } = await supabase
      .from("activities")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    let activeList: ActivityRow[] = [];

    if (!error && Array.isArray(dbActivities)) {
      activeList = dbActivities as ActivityRow[];
    } else {
      // Fallback store
      const fallback = readFallbackStore();
      activeList = fallback.activities.filter((a) => a.is_active);
    }

    // Filter activities targeted to 'all' or this student's specific group
    const targetedActivities = activeList.filter((act) => {
      if (act.target_type === "all") return true;
      if (act.target_type === "halaqa" && act.target_group_id && groupId) {
        return String(act.target_group_id) === String(groupId);
      }
      return true; // if no specific match, show to prevent missing announcements
    });

    if (targetedActivities.length === 0) return [];

    // Fetch this student's responses
    let studentResponses: ActivityResponseRow[] = [];
    const { data: dbResponses } = await supabase
      .from("activity_responses")
      .select("*")
      .eq("student_id", studentId);

    if (Array.isArray(dbResponses) && dbResponses.length > 0) {
      studentResponses = dbResponses as ActivityResponseRow[];
    } else {
      const fallback = readFallbackStore();
      studentResponses = fallback.responses.filter((r) => r.student_id === studentId);
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

    // 1. Try Supabase upsert
    const { error: upsertErr } = await supabase
      .from("activity_responses")
      .upsert(responsePayload as any, {
        onConflict: "activity_id,student_id",
      });

    // 2. Also keep fallback store in sync
    const fallback = readFallbackStore();
    const existingIdx = fallback.responses.findIndex(
      (r) => r.activity_id === activityId && r.student_id === studentId
    );

    if (existingIdx >= 0) {
      fallback.responses[existingIdx] = {
        ...fallback.responses[existingIdx],
        status,
        notes: notes?.trim() || null,
        updated_at: now,
      };
    } else {
      fallback.responses.push({
        id: crypto.randomUUID(),
        activity_id: activityId,
        student_id: studentId,
        status,
        notes: notes?.trim() || null,
        parent_phone: studentRecord.parent_phone || null,
        created_at: now,
        updated_at: now,
      });
    }
    writeFallbackStore(fallback);

    revalidatePath(`/parent/${parentToken}`);
    revalidatePath("/admin");
    return { success: true };
  } catch (err: any) {
    console.error("[submitActivityResponse] Exception:", err);
    return { success: false, error: "حدث خطأ أثناء تسجيل ردكم، يرجى المحاولة ثانية" };
  }
}
