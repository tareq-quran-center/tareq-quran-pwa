"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { attendanceSchema, AttendanceInput } from "@/lib/validations/log";
import { AttendanceRecordRow, AttendanceRecordInsert } from "@/types";
import { revalidatePath } from "next/cache";
import {
  STATUS_ARABIC_TO_ENGLISH,
  STATUS_ENGLISH_TO_ARABIC,
  normalizeAttendanceStatus,
  normalizeAttendanceRecord,
} from "@/lib/attendanceUtils";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Records or updates attendance for a student on a specific date.
 * - Preserves `teacher_id: user.id` for backward compatibility.
 * - Authorization is enforced via Supabase RLS:
 *   authenticated user -> attendance.student_id -> students.group_id -> group_members -> RLS
 */
export async function recordAttendance(data: AttendanceInput): Promise<ActionResult<AttendanceRecordRow>> {
  const validation = attendanceSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "بيانات الحضور غير صحيحة",
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
        error: "غير مصرح لك بتسجيل الحضور، يرجى تسجيل الدخول",
      };
    }

    const basePayload: Record<string, any> = {
      student_id: validation.data.student_id,
      teacher_id: user.id,
      date: validation.data.date,
      status: validation.data.status,
    };

    if (validation.data.notes && validation.data.notes.trim() !== "") {
      basePayload.notes = validation.data.notes.trim();
    }

    // Upsert using student_id and date unique constraint, governed by RLS with schema cache auto-recovery
    let currentPayload = { ...basePayload };
    let record: any = null;
    let lastError: any = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: upserted, error } = await supabase
        .from("attendance_records")
        .upsert(currentPayload as any, { onConflict: "student_id,date" })
        .select()
        .single();

      if (!error && upserted) {
        record = upserted;
        break;
      }

      lastError = error;

      // 1. Column not found in PostgREST schema cache
      const missingMatch = error?.message?.match(/Could not find the '([^']+)' column of 'attendance_records'/i);
      if (missingMatch && missingMatch[1]) {
        const missingCol = missingMatch[1];
        console.warn(`[recordAttendance] Column '${missingCol}' not found in DB schema cache. Stripping and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }

      // 2. Column does not exist on table relation
      const colNotFoundMatch = error?.message?.match(/column "([^"]+)" of relation "attendance_records" does not exist/i);
      if (colNotFoundMatch && colNotFoundMatch[1]) {
        const missingCol = colNotFoundMatch[1];
        console.warn(`[recordAttendance] Column '${missingCol}' does not exist on table. Stripping and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }

      // 3. Status check constraint mismatch (Arabic vs English enum in database)
      if (
        error?.message?.includes("attendance_records_status_check") ||
        error?.message?.includes("status_check") ||
        error?.message?.includes("violates check constraint")
      ) {
        const currStatus = currentPayload.status;
        if (currStatus && STATUS_ARABIC_TO_ENGLISH[currStatus]) {
          const enStatus = STATUS_ARABIC_TO_ENGLISH[currStatus];
          console.warn(`[recordAttendance] Status check constraint failed for '${currStatus}'. Switching to English '${enStatus}' and retrying...`);
          currentPayload.status = enStatus;
          continue;
        } else if (currStatus && STATUS_ENGLISH_TO_ARABIC[currStatus]) {
          const arStatus = STATUS_ENGLISH_TO_ARABIC[currStatus];
          console.warn(`[recordAttendance] Status check constraint failed for '${currStatus}'. Switching to Arabic '${arStatus}' and retrying...`);
          currentPayload.status = arStatus;
          continue;
        }
      }

      break;
    }

    if (!record) {
      return {
        success: false,
        error: "فشل تسجيل الحضور: " + (lastError?.message || "خطأ غير متوقع"),
      };
    }

    const safeRecord = normalizeAttendanceRecord(record);

    revalidatePath(`/students/${validation.data.student_id}`);
    revalidatePath("/dashboard");
    revalidatePath("/students");
    return {
      success: true,
      data: safeRecord,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تسجيل الحضور",
    };
  }
}

/**
 * Deletes an attendance record for a student by date.
 * - Authorization is governed by Supabase RLS based on group membership.
 */
export async function deleteAttendance(
  studentId: string,
  date: string
): Promise<ActionResult> {
  if (!studentId || !date) {
    return { success: false, error: "معرف الطالب والتاريخ مطلوبان" };
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
        error: "غير مصرح لك بتعديل الحضور، يرجى تسجيل الدخول",
      };
    }

    const { error } = await supabase
      .from("attendance_records")
      .delete()
      .eq("student_id", studentId)
      .eq("date", date);

    if (error) {
      return {
        success: false,
        error: "فشل إلغاء تسجيل الحضور: " + error.message,
      };
    }

    revalidatePath(`/students/${studentId}`);
    revalidatePath("/dashboard");
    revalidatePath("/students");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إلغاء تسجيل الحضور",
    };
  }
}

/**
 * Deletes an attendance record by ID.
 * - Authorization is governed by Supabase RLS based on group membership.
 */
export async function deleteAttendanceById(
  recordId: string,
  studentId?: string
): Promise<ActionResult> {
  if (!recordId) {
    return { success: false, error: "معرف سجل الحضور مطلوب" };
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
        error: "غير مصرح لك بتعديل الحضور، يرجى تسجيل الدخول",
      };
    }

    const { error } = await supabase
      .from("attendance_records")
      .delete()
      .eq("id", recordId);

    if (error) {
      return {
        success: false,
        error: "فشل حذف سجل الحضور: " + error.message,
      };
    }

    if (studentId) {
      revalidatePath(`/students/${studentId}`);
    }
    revalidatePath("/dashboard");
    revalidatePath("/students");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء حذف سجل الحضور",
    };
  }
}

/**
 * Bulk updates/inserts attendance for multiple students on a given date.
 * - Preserves `teacher_id: user.id` for backward compatibility.
 * - Enforces group-level authorization via Supabase RLS.
 */
export async function recordBulkAttendance(records: AttendanceInput[]): Promise<ActionResult> {
  if (!records || records.length === 0) {
    return { success: false, error: "لا توجد سجلات لتحديثها" };
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
        error: "غير مصرح لك بتسجيل الحضور الجماعي",
      };
    }

    const hasAnyNotes = records.some((r) => r.notes && r.notes.trim() !== "");

    const basePayload: Record<string, any>[] = records.map((r) => {
      const item: Record<string, any> = {
        student_id: r.student_id,
        teacher_id: user.id,
        date: r.date,
        status: r.status,
      };
      if (hasAnyNotes) {
        item.notes = r.notes?.trim() || null;
      }
      return item;
    });

    let currentPayload = basePayload.map((item) => ({ ...item }));
    let lastError: any = null;
    let bulkSuccess = false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await supabase
        .from("attendance_records")
        .upsert(currentPayload as any, { onConflict: "student_id,date" });

      if (!error) {
        bulkSuccess = true;
        break;
      }

      lastError = error;

      // 1. Match missing column in PostgREST schema cache or table relation
      const missingMatch =
        error?.message?.match(/Could not find the '([^']+)' column of 'attendance_records'/i) ||
        error?.message?.match(/column "([^"]+)" of relation "attendance_records" does not exist/i);

      if (missingMatch && missingMatch[1]) {
        const missingCol = missingMatch[1];
        console.warn(`[recordBulkAttendance] Column '${missingCol}' not found in DB schema cache. Stripping and retrying...`);
        currentPayload = currentPayload.map((item) => {
          const copy = { ...item };
          delete copy[missingCol];
          return copy;
        });
        continue;
      }

      // 2. Status check constraint mismatch (Arabic vs English)
      if (
        error?.message?.includes("attendance_records_status_check") ||
        error?.message?.includes("status_check") ||
        error?.message?.includes("violates check constraint")
      ) {
        console.warn(`[recordBulkAttendance] Status check constraint failed. Translating statuses and retrying...`);
        currentPayload = currentPayload.map((item) => {
          const s = item.status;
          const translated = STATUS_ARABIC_TO_ENGLISH[s] || STATUS_ENGLISH_TO_ARABIC[s] || s;
          return { ...item, status: translated };
        });
        continue;
      }

      break;
    }

    if (!bulkSuccess) {
      return {
        success: false,
        error: "فشل تحديث الحضور الجماعي: " + (lastError?.message || "خطأ غير متوقع"),
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/students");
    revalidatePath("/");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
    };
  }
}

/**
 * Fetches attendance history for a single student.
 * - Relies on Supabase RLS to verify group membership.
 */
export async function getStudentAttendance(
  studentId: string,
  limit: number = 30
): Promise<ActionResult<AttendanceRecordRow[]>> {
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

    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: "فشل جلب سجلات الحضور: " + error.message,
      };
    }

    return {
      success: true,
      data: (records || []).map(normalizeAttendanceRecord),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
    };
  }
}

/**
 * Fetches daily attendance records across all students in the user's accessible groups for a target date.
 * - Authorization is enforced via Supabase RLS (only returns records for students in user's groups).
 */
export async function getDailyAttendanceOverview(
  date?: string
): Promise<ActionResult<AttendanceRecordRow[]>> {
  const targetDate = date || new Date().toISOString().split("T")[0];

  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "غير مصرح لك للوصول إلى بيانات الحضور اليومي",
      };
    }

    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("date", targetDate);

    if (error) {
      return {
        success: false,
        error: "فشل جلب الحضور اليومي: " + error.message,
      };
    }

    return {
      success: true,
      data: (records || []).map(normalizeAttendanceRecord),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
    };
  }
}

export const getStudentAttendanceCached = cache(getStudentAttendance);
export const getDailyAttendanceOverviewCached = cache(getDailyAttendanceOverview);
