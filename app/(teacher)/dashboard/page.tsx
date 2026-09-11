import { getTeacherReportDataCached } from "@/lib/actions/student";
import { getCurrentUserProfile } from "@/lib/actions/auth";
import { TeacherDashboardView } from "@/components/teacher/TeacherDashboardView";

export const revalidate = 0;

export default async function TeacherDashboardPage() {
  const [reportRes, authRes] = await Promise.all([
    getTeacherReportDataCached({ timeframe: "all" }),
    getCurrentUserProfile(),
  ]);

  const students = reportRes.success && reportRes.students ? reportRes.students : [];
  const logs = reportRes.success && reportRes.logs ? reportRes.logs : [];
  const attendance = reportRes.success && reportRes.attendance ? reportRes.attendance : [];
  const stats = reportRes.success ? reportRes.stats : undefined;
  const seasons = reportRes.success ? reportRes.seasons : undefined;
  const circles = reportRes.success ? reportRes.circles : undefined;
  const isUserAdmin = Boolean(authRes.isAdmin && authRes.profile?.role === "admin");

  return (
    <TeacherDashboardView
      students={students}
      logs={logs}
      attendance={attendance}
      stats={stats}
      seasons={seasons}
      circles={circles}
      isAdmin={isUserAdmin}
    />
  );
}

