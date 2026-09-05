"use server";

import { createClient } from "@/lib/supabase/server";
import { StudentTrackData } from "@/types";
import { validateAndFormatJordanianPhone } from "@/lib/phoneUtils";

/**
 * Public resolver for student tracking card (No auth required)
 * Resolves by parent_token (UUID), student id (UUID), or phone number
 */
export async function getStudentTrackData(code: string): Promise<StudentTrackData> {
  if (!code || typeof code !== "string" || code.trim() === "" || code === "undefined" || code === "null") {
    return {
      success: false,
      error: "يرجى إدخال رمز متابعة صالح أو رقم هاتف صحيح",
      attendanceRate: 0,
      totalDays: 0,
      presentDays: 0,
    };
  }

  const cleanCode = decodeURIComponent(code).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  try {
    const supabase = createClient();
    let student: any = null;

    if (uuidRegex.test(cleanCode)) {
      // Lookup by parent_token or student id
      const { data: byToken } = await supabase
        .from("students")
        .select("*")
        .eq("parent_token", cleanCode)
        .maybeSingle();

      if (byToken) {
        student = byToken;
      } else {
        const { data: byId } = await supabase
          .from("students")
          .select("*")
          .eq("id", cleanCode)
          .maybeSingle();
        student = byId;
      }
    } else {
      // Lookup by phone number
      const phoneValidation = validateAndFormatJordanianPhone(cleanCode);
      if (phoneValidation.isValid) {
        const { data: byPhone } = await supabase
          .from("students")
          .select("*")
          .in("parent_phone", phoneValidation.variations)
          .limit(1);

        if (byPhone && byPhone.length > 0) {
          student = byPhone[0];
        }
      }
    }

    if (student && (student as any).deleted_at) {
      student = null;
    }

    if (!student) {
      return {
        success: false,
        error: "لم يتم العثور على طالب مرتبط بهذا الرمز أو رقم الهاتف، يرجى مراجعة إدارة المركز أو المعلم.",
        attendanceRate: 0,
        totalDays: 0,
        presentDays: 0,
      };
    }

    // 1. Fetch Halaqa details
    let halaqa: { id: string; name: string } | null = null;
    if (student.group_id) {
      const { data: groupData } = await supabase
        .from("groups")
        .select("id, name")
        .eq("id", student.group_id)
        .maybeSingle();
      if (groupData) {
        halaqa = groupData;
      }
    }

    // 2. Fetch Teacher details
    let teacher: { id: string; full_name: string; phone?: string | null } | null = null;
    if (student.teacher_id) {
      const { data: teacherProfile } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .eq("id", student.teacher_id)
        .maybeSingle();
      if (teacherProfile) {
        teacher = teacherProfile;
      }
    }

    // 3. Fetch Memorization Logs
    const { data: logsData } = await supabase
      .from("memorization_logs")
      .select("*")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const safeLogs = (logsData || []).filter((l) => !l.deleted_at);

    // 4. Fetch Attendance Records
    const { data: attData } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("student_id", student.id)
      .order("date", { ascending: false })
      .limit(30);

    const safeAtt = attData || [];

    // Calculate Attendance Rate
    const totalDays = safeAtt.length;
    const presentDays = safeAtt.filter((a) => a.status === "حاضر").length;
    const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    // Find latest Hifz (جديد)
    const latestHifzLog = safeLogs.find((l) => l.log_type === "جديد");
    const latestHifz = latestHifzLog
      ? {
          surah_start: latestHifzLog.surah_start,
          aya_start: latestHifzLog.aya_start,
          surah_end: latestHifzLog.surah_end,
          aya_end: latestHifzLog.aya_end,
          grade: latestHifzLog.grade,
          date: latestHifzLog.date || latestHifzLog.created_at,
          page_count: latestHifzLog.page_count,
        }
      : null;

    // Find latest Revision (مراجعة)
    const latestRevLog = safeLogs.find(
      (l) => l.log_type === "مراجعة_صغرى" || l.log_type === "مراجعة_كبرى"
    );
    const latestRevision = latestRevLog
      ? {
          surah_start: latestRevLog.surah_start,
          aya_start: latestRevLog.aya_start,
          surah_end: latestRevLog.surah_end,
          aya_end: latestRevLog.aya_end,
          grade: latestRevLog.grade,
          date: latestRevLog.date || latestRevLog.created_at,
          page_count: latestRevLog.page_count,
        }
      : null;

    // Today's evaluation
    const todayStr = new Date().toISOString().split("T")[0];
    const todayLog = safeLogs.find((l) => {
      const d = (l.date || l.created_at || "").split("T")[0];
      return d === todayStr;
    });

    const todayEvaluation = todayLog
      ? {
          log_type: todayLog.log_type,
          grade: todayLog.grade,
          notes: todayLog.notes,
          date: todayLog.date || todayLog.created_at,
        }
      : null;

    // Teacher's latest notes
    const latestNoteLog = safeLogs.find((l) => l.notes && l.notes.trim() !== "");
    const latestNoteAtt = safeAtt.find((a) => a.notes && a.notes.trim() !== "");
    const teacherNotes = latestNoteLog?.notes || latestNoteAtt?.notes || null;

    return {
      success: true,
      student: {
        id: student.id,
        full_name: student.full_name,
        parent_token: student.parent_token,
        parent_phone: student.parent_phone,
        academic_grade: student.academic_grade,
        school_name: student.school_name,
        join_date: student.join_date,
        avatar_url: student.avatar_url,
      },
      halaqa,
      teacher,
      attendanceRate,
      totalDays,
      presentDays,
      latestHifz,
      latestRevision,
      todayEvaluation,
      teacherNotes,
      recentLogs: safeLogs.slice(0, 15),
      recentAttendance: safeAtt.slice(0, 15),
    };
  } catch (err) {
    return {
      success: false,
      error: "حدث خطأ أثناء تحميل بيانات متابعة الطالب",
      attendanceRate: 0,
      totalDays: 0,
      presentDays: 0,
    };
  }
}
