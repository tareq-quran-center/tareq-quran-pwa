"use server";

import { createClient } from "@/lib/supabase/server";
import { StudentTrackData } from "@/types";
import { validateAndFormatJordanianPhone } from "@/lib/phoneUtils";
import { normalizeMemorizationLogRow } from "@/lib/logUtils";

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
    let siblings: Array<{ id: string; full_name: string; parent_token: string; avatar_url?: string | null }> = [];

    if (uuidRegex.test(cleanCode)) {
      // Lookup by parent_token or student id (only active students)
      const { data: byToken } = await supabase
        .from("students")
        .select("*")
        .eq("parent_token", cleanCode)
        .is("deleted_at", null)
        .maybeSingle();

      if (byToken) {
        student = byToken;
      } else {
        const { data: byId } = await supabase
          .from("students")
          .select("*")
          .eq("id", cleanCode)
          .is("deleted_at", null)
          .maybeSingle();
        student = byId;
      }

      // Discover siblings sharing same parent_phone if available
      if (student && student.parent_phone) {
        const { data: siblingList } = await supabase
          .from("students")
          .select("id, name, full_name, parent_token, avatar_url")
          .eq("parent_phone", student.parent_phone)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (siblingList && siblingList.length > 1) {
          siblings = siblingList.map((st: any) => ({
            id: st.id,
            full_name: st.name || st.full_name || "طالب",
            parent_token: st.parent_token,
            avatar_url: st.avatar_url,
          }));
        }
      }
    } else {
      // Lookup by phone number
      const phoneValidation = validateAndFormatJordanianPhone(cleanCode);
      const searchVariations: string[] = phoneValidation.isValid
        ? [...phoneValidation.variations]
        : [cleanCode];

      // Generate robust digit-based variations
      const digitsOnly = cleanCode.replace(/\D/g, "");
      if (digitsOnly) {
        if (!searchVariations.includes(digitsOnly)) searchVariations.push(digitsOnly);
        if (!digitsOnly.startsWith("0") && !searchVariations.includes(`0${digitsOnly}`)) {
          searchVariations.push(`0${digitsOnly}`);
        }
        if (digitsOnly.startsWith("0") && !searchVariations.includes(digitsOnly.slice(1))) {
          searchVariations.push(digitsOnly.slice(1));
        }
        const coreNum = digitsOnly.replace(/^(?:962|00962|0)/, "");
        if (coreNum && !searchVariations.includes(`+962${coreNum}`)) {
          searchVariations.push(`+962${coreNum}`);
        }
      }

      // 1. Search in parent_phone (strictly filter out deleted students)
      const { data: byParentPhone } = await supabase
        .from("students")
        .select("*")
        .in("parent_phone", searchVariations)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (byParentPhone && byParentPhone.length > 0) {
        student = byParentPhone[0];
        siblings = byParentPhone.map((st: any) => ({
          id: st.id,
          full_name: st.name || st.full_name || "طالب",
          parent_token: st.parent_token,
          avatar_url: st.avatar_url,
        }));
      } else {
        // 2. Fallback: Search in student phone column
        const { data: byPhoneCol } = await supabase
          .from("students")
          .select("*")
          .in("phone", searchVariations)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (byPhoneCol && byPhoneCol.length > 0) {
          student = byPhoneCol[0];
          siblings = byPhoneCol.map((st: any) => ({
            id: st.id,
            full_name: st.name || st.full_name || "طالب",
            parent_token: st.parent_token,
            avatar_url: st.avatar_url,
          }));
        }
      }
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

    // 1. Fetch Halaqa & Season details
    let halaqa: { id: string; name: string } | null = null;
    let season: { id: string; name: string } | null = null;

    if (student.group_id) {
      const { data: circleData } = await supabase
        .from("circles")
        .select("id, name, season_id")
        .eq("id", student.group_id)
        .maybeSingle();

      if (circleData) {
        halaqa = { id: circleData.id, name: circleData.name };
        if (circleData.season_id) {
          const { data: seasonData } = await supabase
            .from("seasons")
            .select("id, name")
            .eq("id", circleData.season_id)
            .maybeSingle();
          if (seasonData) {
            season = seasonData;
          }
        }
      } else {
        const { data: groupData } = await supabase
          .from("groups")
          .select("id, name")
          .eq("id", student.group_id)
          .maybeSingle();
        if (groupData) {
          halaqa = groupData;
        }
      }
    }

    // If season was not resolved from circle, fallback to active season
    if (!season) {
      const { data: activeSeasonData } = await supabase
        .from("seasons")
        .select("id, name")
        .eq("is_active", true)
        .maybeSingle();
      if (activeSeasonData) {
        season = activeSeasonData;
      } else {
        season = { id: "1cf3bae5-b259-4f96-babe-4dcd80598ed8", name: "النادي الدائم" };
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

    const safeLogs = (logsData || [])
      .filter((l) => !l.deleted_at)
      .map(normalizeMemorizationLogRow);

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
    const presentDays = safeAtt.filter((a) => a.status === "حاضر" || (a.status as string) === "present").length;
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
          audio_url: latestHifzLog.audio_url || null,
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
          audio_url: latestRevLog.audio_url || null,
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
          audio_url: todayLog.audio_url || null,
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
        full_name: student.name || student.full_name || "طالب",
        parent_token: student.parent_token,
        parent_phone: student.parent_phone,
        academic_grade: student.academic_grade,
        school_name: student.school_name,
        join_date: student.join_date,
        avatar_url: student.avatar_url,
      },
      siblings: siblings.length > 1 ? siblings : undefined,
      halaqa,
      season,
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
