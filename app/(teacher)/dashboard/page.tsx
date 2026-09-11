import { getTeacherReportDataCached } from "@/lib/actions/student";
import { TeacherDashboardView } from "@/components/teacher/TeacherDashboardView";

export const revalidate = 0;

export default async function TeacherDashboardPage() {
  const reportRes = await getTeacherReportDataCached({ timeframe: "all" });

  const students = reportRes.success && reportRes.students ? reportRes.students : [];
  const logs = reportRes.success && reportRes.logs ? reportRes.logs : [];
  const attendance = reportRes.success && reportRes.attendance ? reportRes.attendance : [];
  const stats = reportRes.success ? reportRes.stats : undefined;
  const seasons = reportRes.success ? reportRes.seasons : undefined;
  const circles = reportRes.success ? reportRes.circles : undefined;

  return (
    <TeacherDashboardView
      students={students}
      logs={logs}
      attendance={attendance}
      stats={stats}
      seasons={seasons}
      circles={circles}
    />
  );
}

