import assert from "assert";

function formatCleanPageCount(totalPages) {
  if (!totalPages || isNaN(totalPages) || totalPages <= 0) return 0;
  const rounded = Math.round(totalPages * 4) / 4;
  return Number(rounded.toFixed(2).replace(/\.00$/, "").replace(/(\.[1-9])0$/, "$1"));
}

function calculateStudentReportItems(
  students,
  logs,
  attendance,
  startDate,
  endDate
) {
  const actualStart = startDate <= endDate ? startDate : endDate;
  const actualEnd = startDate <= endDate ? endDate : startDate;

  const sessionDates = new Set();
  attendance.forEach((a) => {
    if (!a.date) return;
    if (a.date >= actualStart && a.date <= actualEnd) {
      sessionDates.add(a.date);
    }
  });
  const allHalaqahDates = Array.from(sessionDates);

  const items = students.map((student) => {
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
    const uniqueAttendanceMap = new Map();
    studentAttendance.forEach((rec) => {
      uniqueAttendanceMap.set(rec.date, rec);
    });
    const uniqueList = Array.from(uniqueAttendanceMap.values());

    const presentDays = uniqueList.filter(
      (a) =>
        a.status === "حاضر" ||
        a.status === "متأخر" ||
        a.status === "present" ||
        a.status === "late"
    ).length;

    // 3. Determine effective student join date:
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
    let badgeStyle = "default";

    const isSingleDay = actualStart === actualEnd;

    if (isSingleDay) {
      if (uniqueList.length > 0) {
        const status = uniqueList[0].status;
        attendanceText = status;
      } else if (effectiveJoinDate && actualStart < effectiveJoinDate) {
        attendanceText = "لم ينضم بعد";
      } else {
        attendanceText = "لم يرصد";
      }
    } else {
      const totalSessions = Math.max(eligibleSessionDates.length, uniqueList.length);
      if (totalSessions > 0) {
        const percentage = Math.round((presentDays / totalSessions) * 100);
        attendanceText = `${presentDays} / ${totalSessions} (${percentage}%)`;
      } else {
        if (effectiveJoinDate && actualEnd < effectiveJoinDate) {
          attendanceText = "لم ينضم بعد";
        } else {
          attendanceText = "0 / 0 (0%)";
        }
      }
    }

    return {
      student,
      attendanceText,
      badgeStyle,
      pagesCount: cleanPages,
      totalPresentCount: presentDays,
    };
  });

  return items.sort((a, b) => {
    if (b.pagesCount !== a.pagesCount) {
      return b.pagesCount - a.pagesCount;
    }
    return (a.student.full_name || "").localeCompare(b.student.full_name || "", "ar");
  });
}

// Reproduction of User's bug case:
// Date range: 2026-08-01 to 2026-08-23 (23 days)
// Students in DB have join_date = "2026-08-23" or created_at = "2026-08-23"
// But halaqah had 15 sessions between Aug 1 and Aug 22
const studentA = {
  id: "s1",
  full_name: "محمد عبد الله",
  join_date: "2026-08-23", // Set today
  created_at: "2026-08-23T10:00:00Z",
};

const studentB = {
  id: "s2",
  full_name: "عمر الفاروق",
  join_date: null,
  created_at: "2026-08-23T10:00:00Z",
};

const students = [studentA, studentB];

const attendance = [
  { student_id: "s1", date: "2026-08-02", status: "حاضر" },
  { student_id: "s1", date: "2026-08-05", status: "حاضر" },
  { student_id: "s1", date: "2026-08-10", status: "حاضر" },
  { student_id: "s1", date: "2026-08-15", status: "حاضر" },
  { student_id: "s1", date: "2026-08-20", status: "حاضر" },

  { student_id: "s2", date: "2026-08-02", status: "حاضر" },
  { student_id: "s2", date: "2026-08-05", status: "حاضر" },
  { student_id: "s2", date: "2026-08-10", status: "غائب" },
  { student_id: "s2", date: "2026-08-15", status: "حاضر" },
  { student_id: "s2", date: "2026-08-20", status: "حاضر" },
];

const logs = [
  { student_id: "s1", date: "2026-08-02", page_count: 5 },
  { student_id: "s2", date: "2026-08-05", page_count: 8 },
];

const report = calculateStudentReportItems(students, logs, attendance, "2026-08-01", "2026-08-23");

console.log("=================================================");
console.log("VERIFYING FIX FOR 01/08/2026 to 23/08/2026 BUG");
console.log("=================================================\n");

const r1 = report.find((r) => r.student.id === "s1");
console.log(`Student 1: Attendance -> Got: '${r1.attendanceText}', Pages: ${r1.pagesCount}`);
assert.strictEqual(r1.attendanceText, "5 / 5 (100%)");

const r2 = report.find((r) => r.student.id === "s2");
console.log(`Student 2: Attendance -> Got: '${r2.attendanceText}', Pages: ${r2.pagesCount}`);
assert.strictEqual(r2.attendanceText, "4 / 5 (80%)");

console.log("\n=================================================");
console.log("TEST PASSED: 0/0 BUG RESOLVED AND PREVENTED! ✅");
console.log("=================================================");
