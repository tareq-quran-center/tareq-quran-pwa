"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { memorizationLogSchema, MemorizationLogInput } from "@/lib/validations/log";
import { MemorizationLogRow } from "@/types";
import { revalidatePath } from "next/cache";
import { SURAHS } from "@/lib/constants/quran";
import { normalizeMemorizationLogRow } from "@/lib/logUtils";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Creates a new memorization log for a student.
 * - Handles optional fields resiliently (never sends undefined).
 * - Implements dual-column compatibility (log_type/type, surah_start/surah_number, aya_start/from_verse).
 * - Automatically handles schema cache discrepancies by retrying without missing optional columns.
 */
export async function createMemorizationLog(data: MemorizationLogInput): Promise<ActionResult<MemorizationLogRow>> {
  const validation = memorizationLogSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "بيانات التسميع غير صحيحة",
    };
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
        error: "غير مصرح لك بإضافة تسميع، يرجى تسجيل الدخول",
      };
    }

    const surahObj = SURAHS.find((s) => s.name === validation.data.surah_start);
    const surahNum = surahObj ? surahObj.number : 1;

    // Build base payload with dual naming compatibility
    const basePayload: Record<string, any> = {
      student_id: validation.data.student_id,
      teacher_id: user.id,
      log_type: validation.data.log_type,
      type: validation.data.log_type,
      surah_start: validation.data.surah_start,
      surah_end: validation.data.surah_end,
      surah_number: surahNum,
      aya_start: validation.data.aya_start,
      aya_end: validation.data.aya_end,
      from_verse: validation.data.aya_start,
      to_verse: validation.data.aya_end,
      grade: validation.data.grade,
      rating: validation.data.grade,
      date: new Date().toISOString().substring(0, 10),
    };

    // Safely add optional fields only when they contain valid non-empty values
    if (validation.data.notes && validation.data.notes.trim() !== "") {
      basePayload.notes = validation.data.notes.trim();
    }
    if (validation.data.assistant_name && validation.data.assistant_name.trim() !== "") {
      basePayload.assistant_name = validation.data.assistant_name.trim();
    }
    if (typeof validation.data.page_count === "number" && !isNaN(validation.data.page_count)) {
      basePayload.page_count = validation.data.page_count;
    }
    if (Array.isArray(validation.data.surahs) && validation.data.surahs.length > 0) {
      basePayload.surahs = validation.data.surahs;
    }
    if (validation.data.audio_url && validation.data.audio_url.trim() !== "") {
      basePayload.audio_url = validation.data.audio_url.trim();
    }

    // Resilient insert with auto-retry on schema cache mismatch
    let currentPayload = { ...basePayload };
    let newLog: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const { data: inserted, error } = await supabase
        .from("memorization_logs")
        .insert(currentPayload as any)
        .select()
        .single();

      if (!error && inserted) {
        newLog = inserted;
        break;
      }

      lastError = error;
      // Match missing column from PostgREST error message
      const missingMatch = error?.message?.match(/Could not find the '([^']+)' column of 'memorization_logs'/i);
      if (missingMatch && missingMatch[1]) {
        const missingCol = missingMatch[1];
        console.warn(`[createMemorizationLog] Column '${missingCol}' not found in DB schema cache. Stripping and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }

      // Break on any non-column error
      break;
    }

    if (!newLog) {
      return {
        success: false,
        error: "فشل حفظ التسميع: " + (lastError?.message || "خطأ غير متوقع"),
      };
    }

    const safeLog = normalizeMemorizationLogRow(newLog);

    revalidatePath(`/students/${validation.data.student_id}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");
    return {
      success: true,
      data: safeLog,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إضافة التسميع",
    };
  }
}

/**
 * Updates an existing memorization log by ID.
 * - Handles optional fields resiliently (never sends undefined).
 * - Implements dual-column compatibility.
 * - Automatically handles schema cache discrepancies.
 */
export async function updateMemorizationLog(
  id: string,
  data: MemorizationLogInput
): Promise<ActionResult<MemorizationLogRow>> {
  if (!id) {
    return { success: false, error: "معرف السجل مطلوب للتعديل" };
  }

  const validation = memorizationLogSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "بيانات التسميع غير صحيحة",
    };
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
        error: "غير مصرح لك بتعديل السجل، يرجى تسجيل الدخول",
      };
    }

    const surahObj = SURAHS.find((s) => s.name === validation.data.surah_start);
    const surahNum = surahObj ? surahObj.number : 1;

    const basePayload: Record<string, any> = {
      log_type: validation.data.log_type,
      type: validation.data.log_type,
      surah_start: validation.data.surah_start,
      surah_end: validation.data.surah_end,
      surah_number: surahNum,
      aya_start: validation.data.aya_start,
      aya_end: validation.data.aya_end,
      from_verse: validation.data.aya_start,
      to_verse: validation.data.aya_end,
      grade: validation.data.grade,
      rating: validation.data.grade,
    };

    if (validation.data.notes !== undefined) {
      basePayload.notes = validation.data.notes && validation.data.notes.trim() !== "" ? validation.data.notes.trim() : null;
    }
    if (validation.data.assistant_name !== undefined) {
      basePayload.assistant_name =
        validation.data.assistant_name && validation.data.assistant_name.trim() !== ""
          ? validation.data.assistant_name.trim()
          : null;
    }
    if (validation.data.page_count !== undefined) {
      basePayload.page_count = validation.data.page_count ?? null;
    }
    if (validation.data.surahs !== undefined) {
      basePayload.surahs = validation.data.surahs ?? null;
    }
    if (validation.data.audio_url !== undefined) {
      basePayload.audio_url =
        validation.data.audio_url && validation.data.audio_url.trim() !== ""
          ? validation.data.audio_url.trim()
          : null;
    }

    let currentPayload = { ...basePayload };
    let updatedLog: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 10; attempt++) {
      const { data: updated, error } = await supabase
        .from("memorization_logs")
        .update(currentPayload as any)
        .eq("id", id)
        .select()
        .single();

      if (!error && updated) {
        updatedLog = updated;
        break;
      }

      lastError = error;
      const missingMatch = error?.message?.match(/Could not find the '([^']+)' column of 'memorization_logs'/i);
      if (missingMatch && missingMatch[1]) {
        const missingCol = missingMatch[1];
        console.warn(`[updateMemorizationLog] Column '${missingCol}' not found in DB schema cache. Stripping and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }

      break;
    }

    if (!updatedLog) {
      return {
        success: false,
        error: "فشل تحديث التسميع: " + (lastError?.message || "خطأ غير متوقع"),
      };
    }

    const safeLog = normalizeMemorizationLogRow(updatedLog);

    revalidatePath(`/students/${validation.data.student_id}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");
    return {
      success: true,
      data: safeLog,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تحديث التسميع",
    };
  }
}

/**
 * Fetches recent memorization logs for a given student.
 * - Queries by student_id and relies on Supabase RLS.
 * - Automatically normalizes rows to standard MemorizationLogRow.
 */
export async function getStudentLogs(
  studentId: string,
  limit: number = 50
): Promise<ActionResult<MemorizationLogRow[]>> {
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
        error: "غير مصرح لك للوصول إلى السجلات",
      };
    }

    const { data: logs, error } = await supabase
      .from("memorization_logs")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: "فشل جلب سجلات التسميع: " + error.message,
      };
    }

    const safeLogs = (logs || []).map(normalizeMemorizationLogRow);

    return {
      success: true,
      data: safeLogs,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء جلب السجلات",
    };
  }
}

/**
 * Deletes a memorization log by ID.
 * - Authorization is enforced via Supabase RLS based on group membership.
 */
export async function deleteMemorizationLog(id: string, studentId: string): Promise<ActionResult> {
  if (!id) {
    return { success: false, error: "معرف السجل مطلوب" };
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
        error: "غير مصرح لك بحذف السجل",
      };
    }

    const { error } = await supabase
      .from("memorization_logs")
      .delete()
      .eq("id", id);

    if (error) {
      return {
        success: false,
        error: "فشل حذف السجل: " + error.message,
      };
    }

    revalidatePath(`/students/${studentId}`);
    revalidatePath("/students");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء حذف السجل",
    };
  }
}

export const getStudentLogsCached = cache(getStudentLogs);
