import { StudentRow, MemorizationLogRow, AttendanceRecordRow } from "@/types";
import { StudentReportItem } from "@/components/dashboard/PrintReportView";

export type PeriodType = "daily" | "weekly" | "monthly";

export interface TimeframeDateBounds {
  startOfDay: Date;
  startOfWeek: Date;
  startOfMonth: Date;
  now: Date;
  todayStr: string;
  startOfWeekStr: string;
  startOfMonthStr: string;
}

/**
 * Returns exact start and end boundaries for Daily, Weekly (Sunday 00:00:00), and Monthly (1st of month 00:00:00).
 */
export function getTimeframeDateBounds(referenceDate = new Date()): TimeframeDateBounds {
  const now = new Date(referenceDate);

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  // Start of today: 00:00:00
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  // Start of week: Sunday (الأحد 00:00:00)
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0);
  const wYear = startOfWeek.getFullYear();
  const wMonth = String(startOfWeek.getMonth() + 1).padStart(2, "0");
  const wDay = String(startOfWeek.getDate()).padStart(2, "0");
  const startOfWeekStr = `${wYear}-${wMonth}-${wDay}`;

  // Start of month: 1st of current calendar month at 00:00:00
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const startOfMonthStr = `${year}-${month}-01`;

  return {
    startOfDay,
    startOfWeek,
    startOfMonth,
    now,
    todayStr,
    startOfWeekStr,
    startOfMonthStr,
  };
}

/**
 * Cleanly formats page numbers without floating point noise.
 * Rounds to nearest quarter-page (e.g. 3.25, 3.5, 3.75, 4).
 */
export function formatCleanPageCount(totalPages: number): number {
  if (!totalPages || isNaN(totalPages) || totalPages <= 0) return 0;
  const rounded = Math.round(totalPages * 4) / 4;
  return Number(rounded.toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1"));
}

/**
 * Single source of truth calculation for student summary reports
 * across any custom date range (e.g. from 2026-07-01 to 2026-08-15).
 */
export function calculateStudentReportItems(
  students: StudentRow[],
  logs: MemorizationLogRow[],
  attendance: AttendanceRecordRow[],
  startDate: string,
  endDate: string
): StudentReportItem[] {
  // Ensure valid date range order
  const actualStart = startDate <= endDate ? startDate : endDate;
  const actualEnd = startDate <= endDate ? endDate : startDate;

  // Calculate unique session dates held across the halaqah for the selected period
  const sessionDates = new Set<string>();
  attendance.forEach((a) => {
    if (!a.date) return;
    if (a.date >= actualStart && a.date <= actualEnd) {
      sessionDates.add(a.date);
    }
  });
  const allHalaqahDates = Array.from(sessionDates);

  const items: StudentReportItem[] = students.map((student) => {
    // 1. Filter student logs within exact date boundaries
    const studentLogs = logs.filter((l) => {
      if (l.student_id !== student.id) return false;
      const logDate = l.date || (l.created_at ? l.created_at.substring(0, 10) : "");
      if (!logDate) return false;
      return logDate >= actualStart && logDate <= actualEnd;
    });

    const rawTotalPages = studentLogs.reduce((sum, l) => {
      const p = Number(l.page_count ?? 1);
      return sum + (isNaN(p) ? 0 : p);
    }, 0);

    const cleanPages = formatCleanPageCount(rawTotalPages);

    // 2. Filter student attendance within exact date boundaries (All recorded attendance in this period is valid and preserved)
    const studentAttendance = attendance.filter((a) => {
      if (!a.date || a.student_id !== student.id) return false;
      return a.date >= actualStart && a.date <= actualEnd;
    });

    // Deduplicate student attendance by date
    const uniqueAttendanceMap = new Map<string, AttendanceRecordRow>();
    studentAttendance.forEach((rec) => {
      uniqueAttendanceMap.set(rec.date, rec);
    });
    const uniqueList = Array.from(uniqueAttendanceMap.values());

    const presentDays = uniqueList.filter(
      (a) =>
        a.status === "حاضر" ||
        a.status === "متأخر" ||
        (a.status as string) === "present" ||
        (a.status as string) === "late"
    ).length;

    // 3. Determine effective student join date:
    // Uses student.join_date, with created_at as fallback.
    // If student has recorded attendance in this period prior to join_date, automatically expand effective join date to include their earliest attendance so no past records are zeroed out.
    const rawJoinDate = student.join_date || (student.created_at ? student.created_at.substring(0, 10) : "");
    let effectiveJoinDate = rawJoinDate;
    if (uniqueList.length > 0) {
      const earliestAttDate = uniqueList.reduce((min, cur) => (cur.date < min ? cur.date : min), uniqueList[0].date);
      if (earliestAttDate && (!effectiveJoinDate || earliestAttDate < effectiveJoinDate)) {
        effectiveJoinDate = earliestAttDate;
      }
    }

    // 4. Calculate halaqah sessions held on or after the student's join date within the selected period
    const eligibleSessionDates = allHalaqahDates.filter((date) => {
      if (!effectiveJoinDate) return true;
      return date >= effectiveJoinDate;
    });

    let attendanceText = "لم يرصد";
    let badgeStyle =
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
    let attendancePercentage = 0;

    const isSingleDay = actualStart === actualEnd;

    if (isSingleDay) {
      if (uniqueList.length > 0) {
        const status = uniqueList[0].status;
        if (status === "حاضر" || (status as string) === "present") {
          attendancePercentage = 100;
          attendanceText = "حاضر";
          badgeStyle =
            "bg-burgundy-100 text-burgundy-900 dark:bg-burgundy-950/80 dark:text-islamicGold-300 border border-burgundy-300 dark:border-burgundy-800";
        } else if (status === "متأخر" || (status as string) === "late") {
          attendancePercentage = 100;
          attendanceText = "متأخر";
          badgeStyle =
            "bg-orange-100 text-orange-800 dark:bg-orange-950/80 dark:text-orange-300 border border-orange-300 dark:border-orange-800";
        } else if (status === "غائب" || (status as string) === "absent") {
          attendancePercentage = 0;
          attendanceText = "غائب";
          badgeStyle =
            "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800";
        } else if (status === "مستأذن" || (status as string) === "excused") {
          attendancePercentage = 0;
          attendanceText = "مستأذن";
          badgeStyle =
            "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800";
        } else {
          attendancePercentage = 0;
          attendanceText = String(status);
          badgeStyle =
            "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700";
        }
      } else if (effectiveJoinDate && actualStart < effectiveJoinDate) {
        attendancePercentage = 0;
        attendanceText = "لم ينضم بعد";
        badgeStyle =
          "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700";
      } else {
        attendancePercentage = 0;
        attendanceText = "لم يرصد";
        badgeStyle =
          "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
      }
    } else {
      const totalSessions = Math.max(eligibleSessionDates.length, uniqueList.length);
      if (totalSessions > 0) {
        const percentage = Math.round((presentDays / totalSessions) * 100);
        attendancePercentage = percentage;
        attendanceText = `${presentDays} / ${totalSessions} (${percentage}%)`;
        if (percentage >= 85) {
          badgeStyle =
            "bg-burgundy-100 text-burgundy-900 dark:bg-burgundy-950/80 dark:text-islamicGold-300 border border-burgundy-300 dark:border-burgundy-800";
        } else if (percentage >= 60) {
          badgeStyle =
            "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800";
        } else {
          badgeStyle =
            "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800";
        }
      } else {
        attendancePercentage = 0;
        if (effectiveJoinDate && actualEnd < effectiveJoinDate) {
          attendanceText = "لم ينضم بعد";
        } else {
          attendanceText = "0 / 0 (0%)";
        }
        badgeStyle =
          "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
      }
    }

    return {
      student,
      attendanceText,
      badgeStyle,
      pagesCount: cleanPages,
      totalPresentCount: presentDays,
      attendancePercentage,
    };
  });

  // 1. Initial base sort using existing logic (descending by total recitation pages, then Arabic name).
  const baseSortedItems = [...items].sort((a, b) => {
    if (b.pagesCount !== a.pagesCount) {
      return b.pagesCount - a.pagesCount;
    }
    return (a.student.full_name || "").localeCompare(b.student.full_name || "", "ar");
  });

  // 2. Separate students into two groups based on attendance rate:
  // Group 1: Attendance rate >= 50% (keep existing order as is, no re-sorting).
  const highAttendance = baseSortedItems.filter(
    (item) => (item.attendancePercentage ?? 0) >= 50
  );

  // Group 2: Attendance rate < 50% (moved to the end of the list).
  const lowAttendance = baseSortedItems.filter(
    (item) => (item.attendancePercentage ?? 0) < 50
  );

  // 3. Sort students in the < 50% group:
  // a) Attendance rate descending (highest to lowest)
  // b) In case of equal attendance rate: executed pages count descending (highest to lowest)
  // c) In case of continued equality: maintain existing original order (alphabetical by Arabic name)
  lowAttendance.sort((a, b) => {
    const rateA = a.attendancePercentage ?? 0;
    const rateB = b.attendancePercentage ?? 0;
    if (rateB !== rateA) {
      return rateB - rateA;
    }
    if (b.pagesCount !== a.pagesCount) {
      return b.pagesCount - a.pagesCount;
    }
    return (a.student.full_name || "").localeCompare(b.student.full_name || "", "ar");
  });

  // 4. Return combined list: >= 50% first (order intact), followed by < 50% (sorted as specified).
  return [...highAttendance, ...lowAttendance];
}
