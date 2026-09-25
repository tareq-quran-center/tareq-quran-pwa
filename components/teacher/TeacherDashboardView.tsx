"use client";

import React, { useState, useMemo } from "react";
import { StudentRow, MemorizationLogRow, AttendanceRecordRow, SeasonRow, CircleRow } from "@/types";
import { TeacherReportStats } from "@/lib/actions/student";
import { SeasonSelector } from "@/components/common/SeasonSelector";
import { TeacherDashboardClient } from "@/components/teacher/TeacherDashboardClient";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { SummaryReportTable } from "@/components/dashboard/SummaryReportTable";
import dynamic from "next/dynamic";
import { FALLBACK_SEASONS } from "@/lib/constants/seasons";
import { AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const LiveRecitationModal = dynamic(
  () => import("./LiveRecitationModal").then((mod) => mod.LiveRecitationModal),
  { ssr: false }
);

interface TeacherDashboardViewProps {
  students: Array<
    StudentRow & {
      season_id?: string;
      season_name?: string;
      halaqa_name?: string;
    }
  >;
  logs: MemorizationLogRow[];
  attendance: AttendanceRecordRow[];
  stats?: TeacherReportStats;
  seasons?: SeasonRow[];
  circles?: CircleRow[];
  isAdmin?: boolean;
}

export function TeacherDashboardView({
  students,
  logs,
  attendance,
  stats: initialStats,
  seasons = FALLBACK_SEASONS,
  circles = [],
  isAdmin = false,
}: TeacherDashboardViewProps) {
  // 1. Determine teacher's distinct seasons based on their circles and students
  const teacherSeasonIds = useMemo(() => {
    const ids = new Set<string>();
    students.forEach((s) => {
      if (s.season_id) ids.add(s.season_id);
    });
    circles.forEach((c) => {
      if (c.season_id) ids.add(c.season_id);
    });
    return Array.from(ids);
  }, [students, circles]);

  // If the teacher exclusively belongs to one season, default directly to that season
  const defaultSeasonId = useMemo(() => {
    if (teacherSeasonIds.length === 1) {
      return teacherSeasonIds[0];
    }
    const active = seasons.find((s) => s.is_active);
    return active ? active.id : seasons[0]?.id || "all";
  }, [teacherSeasonIds, seasons]);

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(defaultSeasonId);
  const [isLiveRecitationOpen, setIsLiveRecitationOpen] = useState(false);

  // 2. Filter students according to selected season
  const filteredStudents = useMemo(() => {
    if (selectedSeasonId === "all") {
      return students;
    }
    return students.filter((s) => s.season_id === selectedSeasonId);
  }, [students, selectedSeasonId]);

  const filteredStudentIds = useMemo(() => {
    return new Set(filteredStudents.map((s) => s.id));
  }, [filteredStudents]);

  // 3. Filter logs and attendance for the selected season's students
  const filteredLogs = useMemo(() => {
    if (selectedSeasonId === "all") {
      return logs;
    }
    return logs.filter((l) => l.student_id && filteredStudentIds.has(l.student_id));
  }, [logs, filteredStudentIds, selectedSeasonId]);

  const filteredAttendance = useMemo(() => {
    if (selectedSeasonId === "all") {
      return attendance;
    }
    return attendance.filter((a) => a.student_id && filteredStudentIds.has(a.student_id));
  }, [attendance, filteredStudentIds, selectedSeasonId]);

  // 4. Recalculate KPIs for the selected season
  const computedStats = useMemo<TeacherReportStats>(() => {
    if (selectedSeasonId === "all" && initialStats) {
      return initialStats;
    }

    let totalMemorizedPages = 0;
    const activeStudentIds = new Set<string>();

    filteredLogs.forEach((l) => {
      if (l.student_id) activeStudentIds.add(l.student_id);
      totalMemorizedPages += Number(l.page_count) || 1;
    });
    totalMemorizedPages = Number(totalMemorizedPages.toFixed(2));

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;

    filteredAttendance.forEach((a) => {
      const s = a.status as string;
      if (s === "حاضر" || s === "present") totalPresent++;
      else if (s === "غائب" || s === "absent") totalAbsent++;
      else if (s === "متأخر" || s === "late") totalLate++;
      else if (s === "مستأذن" || s === "excused") totalExcused++;
    });

    const totalRecorded = totalPresent + totalAbsent + totalLate + totalExcused;
    const overallAttendanceRate =
      totalRecorded > 0
        ? Math.round(((totalPresent + totalLate) / totalRecorded) * 100)
        : 100;

    return {
      totalStudents: filteredStudents.length,
      activeStudents: activeStudentIds.size,
      totalMemorizedPages,
      overallAttendanceRate,
      totalPresent,
      totalAbsent,
      totalLate,
      totalExcused,
    };
  }, [selectedSeasonId, initialStats, filteredStudents, filteredLogs, filteredAttendance]);

  const currentSeasonName = useMemo(() => {
    if (selectedSeasonId === "all") return "جميع الأندية";
    return seasons.find((s) => s.id === selectedSeasonId)?.name || "النادي المحدد";
  }, [seasons, selectedSeasonId]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Teacher Hero Banner */}
      <TeacherDashboardClient
        isAdmin={isAdmin}
        onOpenLiveRecitation={() => setIsLiveRecitationOpen(true)}
      />

      {/* Season Selector with persistence & teacher auto-selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <SeasonSelector
          seasons={seasons}
          selectedSeasonId={selectedSeasonId}
          onSeasonChange={setSelectedSeasonId}
          showAllOption={true}
          defaultSeasonId={teacherSeasonIds.length === 1 ? teacherSeasonIds[0] : undefined}
          className="w-full sm:w-auto"
        />

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <Button
            onClick={() => setIsLiveRecitationOpen(true)}
            className="bg-gradient-to-r from-islamicGold-600 to-amber-500 hover:from-islamicGold-700 hover:to-amber-600 text-burgundy-950 font-black text-xs px-3.5 py-1.5 h-9 rounded-xl shadow-xs gap-1.5 active:scale-95 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>التسميع السريع ⚡</span>
          </Button>

          {/* Informative indicator badge */}
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1.5">
            <span>عرض بيانات:</span>
            <span className="text-burgundy-900 dark:text-burgundy-300 bg-burgundy-50 dark:bg-burgundy-950/60 px-2.5 py-0.5 rounded-full border border-burgundy-200 dark:border-burgundy-800">
              {currentSeasonName}
            </span>
            <span className="text-slate-400">({filteredStudents.length} طالب)</span>
          </div>
        </div>
      </div>

      {/* When the selected club has no students for this teacher */}
      {filteredStudents.length === 0 && students.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-black">
                لا توجد حلقات أو طلاب مسجلين لك في {currentSeasonName}.
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                لديك طلاب مسجلون في نادٍ آخر. يمكنك التبديل إليه مباشرة أو عرض جميع الأندية.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {teacherSeasonIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSeasonId(teacherSeasonIds[0])}
                className="bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-xs font-bold hover:bg-amber-100 dark:hover:bg-amber-900"
              >
                <span>الانتقال لناديك ({seasons.find((s) => s.id === teacherSeasonIds[0])?.name || "النادي"})</span>
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => setSelectedSeasonId("all")}
              className="bg-burgundy-900 hover:bg-burgundy-950 text-white text-xs font-bold"
            >
              <span>عرض جميع الأندية</span>
            </Button>
          </div>
        </div>
      )}

      {/* Unified Single-Row 3-Column KPI Stats Cards */}
      <StatsCards
        students={filteredStudents}
        logs={filteredLogs}
        attendance={filteredAttendance}
        stats={computedStats}
      />

      {/* Summary Report Table with Daily/Weekly/Monthly Filter and A4 Print Export */}
      <SummaryReportTable
        students={filteredStudents}
        logs={filteredLogs}
        attendance={filteredAttendance}
      />

      {/* Live Recitation Session Modal */}
      <LiveRecitationModal
        isOpen={isLiveRecitationOpen}
        onClose={() => setIsLiveRecitationOpen(false)}
        students={filteredStudents}
        logs={filteredLogs}
      />
    </div>
  );
}
