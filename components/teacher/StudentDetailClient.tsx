"use client";

import React, { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Phone,
  BookOpen,
  Calendar,
  Plus,
  ArrowRight,
  Trash2,
  ExternalLink,
  Award,
  BookCheck,
  Sparkles,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Pencil,
  Copy,
  Check,
  RotateCcw,
  MoreVertical,
  X,
} from "lucide-react";
import { StudentRow, MemorizationLogRow, AttendanceRecordRow } from "@/types";
import { GRADE_LABELS, ATTENDANCE_LABELS, LOG_TYPE_LABELS, formatArabicDate, formatPageCount } from "@/lib/utils";
import { deleteMemorizationLog } from "@/lib/actions/log";
import { deleteAttendanceById } from "@/lib/actions/attendance";
import { regenerateParentToken } from "@/lib/actions/student";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRealtimeSync, RealtimePayload } from "@/lib/hooks/useRealtimeSync";
import { lightHaptic, successHaptic } from "@/lib/haptics";
import { AudioPlayer } from "@/components/common/AudioPlayer";
import { RecitationLogCard } from "./RecitationLogCard";
import {
  getStudentSurahProgressMap,
  getStudentJuzProgressMap,
  SurahProgressRecord,
  JuzProgressRecord,
} from "@/lib/quranMetadata";

const ShareAchievementModal = dynamic(() => import("./ShareAchievementModal").then((mod) => mod.ShareAchievementModal), { ssr: false });
const LogEntryDialog = dynamic(() => import("./LogEntryDialog").then((mod) => mod.LogEntryDialog), { ssr: false });
const AttendanceDialog = dynamic(() => import("./AttendanceDialog").then((mod) => mod.AttendanceDialog), { ssr: false });

interface StudentDetailClientProps {
  student: StudentRow;
  initialLogs: MemorizationLogRow[];
  initialAttendance: AttendanceRecordRow[];
}

export function StudentDetailClient({
  student,
  initialLogs,
  initialAttendance,
}: StudentDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"logs" | "attendance" | "progress">("logs");
  const [viewMode, setViewMode] = useState<"juz" | "surah">("juz");
  const [expandedJuzId, setExpandedJuzId] = useState<number | null>(null);
  const [showAllProgress, setShowAllProgress] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "completed">("all");
  const [editingLog, setEditingLog] = useState<MemorizationLogRow | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3000);
  };

  const toggleJuzExpand = (juzNumber: number) => {
    setExpandedJuzId((prev) => (prev === juzNumber ? null : juzNumber));
  };
  const [logs, setLogs] = useState<MemorizationLogRow[]>(initialLogs);
  const [attendance, setAttendance] = useState<AttendanceRecordRow[]>(initialAttendance);
  const [parentToken, setParentToken] = useState<string | null | undefined>(student.parent_token);
  const [isCopiedToken, setIsCopiedToken] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopyParentLink = async () => {
    if (!parentToken) return;
    lightHaptic();
    const portalUrl = `${window.location.origin}/parent/${parentToken}`;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setIsCopiedToken(true);
      successHaptic();
      showToast("تم نسخ رابط متابعة ولي الأمر للحافظة 📋✅");
      setTimeout(() => setIsCopiedToken(false), 2500);
    } catch {
      const input = document.createElement("input");
      input.value = portalUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setIsCopiedToken(true);
      successHaptic();
      showToast("تم نسخ رابط متابعة ولي الأمر للحافظة 📋✅");
      setTimeout(() => setIsCopiedToken(false), 2500);
    }
  };

  const handleRegenerateParentToken = async () => {
    lightHaptic();
    const confirmed = window.confirm(
      "هل أنت متأكد؟ سيتوقف الرابط القديم لولي الأمر فوراً عن العمل وسيتم إنشاء رمز وصول جديد."
    );
    if (!confirmed) return;

    setIsRegeneratingToken(true);
    try {
      const res = await regenerateParentToken(student.id);
      if (res.success && res.data?.parent_token) {
        const newToken = res.data.parent_token;
        setParentToken(newToken);
        const newUrl = `${window.location.origin}/parent/${newToken}`;
        try {
          await navigator.clipboard.writeText(newUrl);
        } catch {
          // ignore clipboard error
        }
        successHaptic();
        showToast("تم تجديد رمز ورابط المتابعة بنجاح ونسخه للحافظة 🔑✅");
      } else {
        alert(res.error || "فشل تجديد رابط المتابعة");
      }
    } catch {
      alert("حدث خطأ أثناء تجديد رابط المتابعة");
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  const surahProgressList = useMemo(() => {
    const map = getStudentSurahProgressMap(logs, student.id);
    return Array.from(map.values()).sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return new Date(b.lastLogDate || 0).getTime() - new Date(a.lastLogDate || 0).getTime();
    });
  }, [logs, student.id]);

  const juzProgressList = useMemo(() => {
    const map = getStudentJuzProgressMap(logs, student.id);
    return Array.from(map.values());
  }, [logs, student.id]);

  const filteredSurahList = useMemo(() => {
    if (statusFilter === "in_progress") {
      return surahProgressList.filter((s) => !s.isCompleted && s.rawRecitedPages > 0);
    }
    if (statusFilter === "completed") {
      return surahProgressList.filter((s) => s.isCompleted);
    }
    return surahProgressList;
  }, [surahProgressList, statusFilter]);

  const filteredJuzList = useMemo(() => {
    if (statusFilter === "in_progress") {
      return juzProgressList.filter((j) => j.status === "in_progress");
    }
    if (statusFilter === "completed") {
      return juzProgressList.filter((j) => j.isCompleted);
    }
    return juzProgressList;
  }, [juzProgressList, statusFilter]);

  const activeAllCount = viewMode === "juz" ? juzProgressList.length : surahProgressList.length;
  const activeInProgressCount = viewMode === "juz"
    ? juzProgressList.filter((j) => j.status === "in_progress").length
    : surahProgressList.filter((s) => !s.isCompleted && s.rawRecitedPages > 0).length;
  const activeCompletedCount = viewMode === "juz"
    ? juzProgressList.filter((j) => j.isCompleted).length
    : surahProgressList.filter((s) => s.isCompleted).length;

  // Realtime Payload Handler for Instant Client State Update
  const handleRealtimePayload = useCallback(
    (payload: RealtimePayload<MemorizationLogRow & AttendanceRecordRow>) => {
      const { table, eventType, new: newRecord, old: oldRecord } = payload;

      if (table === "memorization_logs") {
        const logRec = newRecord as MemorizationLogRow;
        if (eventType === "INSERT" && logRec && logRec.student_id === student.id) {
          setLogs((prev) => [logRec, ...prev.filter((l) => l.id !== logRec.id)]);
        } else if (eventType === "DELETE" && oldRecord && oldRecord.id) {
          setLogs((prev) => prev.filter((l) => l.id !== oldRecord.id));
        } else if (eventType === "UPDATE" && logRec && logRec.student_id === student.id) {
          setLogs((prev) =>
            prev.map((l) => (l.id === logRec.id ? logRec : l))
          );
        }
      }

      if (table === "attendance_records") {
        const attRec = newRecord as AttendanceRecordRow;
        if ((eventType === "INSERT" || eventType === "UPDATE") && attRec && attRec.student_id === student.id) {
          setAttendance((prev) => {
            const exists = prev.some((a) => a.id === attRec.id || a.date === attRec.date);
            if (exists) {
              return prev.map((a) =>
                a.id === attRec.id || a.date === attRec.date ? attRec : a
              );
            }
            return [attRec, ...prev];
          });
        } else if (eventType === "DELETE" && oldRecord && oldRecord.id) {
          setAttendance((prev) => prev.filter((a) => a.id !== oldRecord.id));
        }
      }
    },
    [student.id]
  );

  const { notification } = useRealtimeSync({
    tables: ["memorization_logs", "attendance_records"],
    onPayload: handleRealtimePayload,
  });

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("هل أنت تأكد من رغبتك في حذف هذا التسميع؟")) return;
    const res = await deleteMemorizationLog(logId, student.id);
    if (res.success) {
      setLogs((prev) => prev.filter((l) => l.id !== logId));
    }
  };

  const handleDeleteAttendance = async (recordId: string) => {
    if (!confirm("هل أنت تأكد من رغبتك في حذف سجل الحضور هذا؟")) return;
    setAttendance((prev) => prev.filter((a) => a.id !== recordId));
    const res = await deleteAttendanceById(recordId, student.id);
    if (!res.success) {
      alert(res.error || "فشل حذف سجل الحضور");
      router.refresh();
    }
  };

  // Calculate stats
  const totalLogsCount = logs.length;
  const presentCount = attendance.filter((a) => a.status === "حاضر" || a.status === "متأخر").length;
  const attendancePercentage =
    attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 100;

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {notification && (
        <div className="p-3 bg-burgundy-800 text-white font-bold text-xs rounded-xl shadow-lg animate-in slide-in-from-top duration-300 flex items-center justify-center gap-2 border border-islamicGold-500/30">
          <span>{notification}</span>
        </div>
      )}

      {/* Top Back Navigation */}
      <div>
        <Link
          href="/students"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-burgundy-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة إلى قائمة الطلاب</span>
        </Link>
      </div>

      {/* Redesigned Compact Student Profile Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-slate-950 text-white p-4 sm:p-5 rounded-3xl shadow-xl border border-islamicGold-500/40 space-y-3">
        {/* Decorative Pattern Background Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#c5a059_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

        {/* Radial Glow Overlay */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-islamicGold-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Profile Row (Avatar + Info + Action Button) */}
        <div className="relative z-10 flex items-center justify-between gap-2.5 sm:gap-3 w-full">
          {/* Left: Avatar + Details in horizontal flex */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            {/* Strict Fixed 56px Avatar */}
            <div
              className="w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl bg-white/10 backdrop-blur-md text-amber-300 flex items-center justify-center font-black text-xl shadow-md shrink-0 overflow-hidden border border-white/20 aspect-square"
              style={{ width: "56px", height: "56px", minWidth: "56px", minHeight: "56px", maxWidth: "56px", maxHeight: "56px" }}
            >
              {student.avatar_url && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.avatar_url}
                  alt={student.full_name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover block rounded-2xl"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span className="select-none">{student.full_name.charAt(0)}</span>
              )}
            </div>

            {/* Student Info */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-lg font-black tracking-tight leading-snug truncate text-white">
                  {student.full_name}
                </h2>
                {student.academic_grade && (
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-islamicGold-300 border border-white/10 shrink-0">
                    {student.academic_grade}
                  </span>
                )}
              </div>

              {/* Compact Badges Row */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] text-amber-200/90 font-medium">
                {student.academic_grade && (
                  <span className="sm:hidden bg-white/10 px-1.5 py-0.5 rounded-lg text-[10px] font-bold border border-white/10 shrink-0">
                    🎓 {student.academic_grade}
                  </span>
                )}
                {student.parent_phone && (
                  <span className="inline-flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-lg border border-white/10 text-[10.5px] shrink-0">
                    <Phone className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                    <strong dir="ltr" className="font-mono text-white">
                      {student.parent_phone}
                    </strong>
                  </span>
                )}
                {(student.join_date || student.created_at) && (
                  <span className="hidden md:inline-flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-lg border border-white/10 text-[10px] shrink-0">
                    <Calendar className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                    <span>انضم: {student.join_date || student.created_at.substring(0, 10)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions Button */}
          {parentToken && (
            <div className="shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  lightHaptic();
                  setIsActionMenuOpen(true);
                }}
                className="gap-1 rounded-2xl bg-white/10 hover:bg-white/20 border-white/20 text-white hover:text-white font-bold text-xs shadow-sm backdrop-blur-sm transition-all px-2.5 py-1.5 h-8 sm:h-9 shrink-0"
              >
                <MoreVertical className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="hidden sm:inline">إجراءات ومشاركة</span>
                <span className="sm:hidden text-[11px]">إجراءات</span>
              </Button>
            </div>
          )}
        </div>

        {/* Primary Hero CTA: Record New Recitation */}
        <div className="relative z-10 pt-1">
          <Button
            size="lg"
            onClick={() => {
              lightHaptic();
              setIsLogDialogOpen(true);
            }}
            className="w-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-slate-950 font-black rounded-2xl gap-2 shadow-lg shadow-amber-500/25 transition-all py-3 sm:py-3.5 text-sm sm:text-base border border-amber-300/40 min-h-[46px]"
          >
            <Plus className="w-5 h-5 text-slate-950 stroke-[3] shrink-0" />
            <span>تسجيل تسميع جديد 📖</span>
          </Button>
        </div>
      </div>

      {/* Unified Single-Row 3-Column KPI Stats Grid */}
      <div className="stats-grid no-print print:hidden grid grid-cols-3 gap-2 sm:gap-4">
        {/* Metric 1: Total Recitations */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-3 sm:p-4 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
              إجمالي التسميعات
            </CardTitle>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-burgundy-100 dark:bg-burgundy-950 text-burgundy-800 dark:text-islamicGold-300 flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              {totalLogsCount}
            </div>
            <CardDescription className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              عملية موثقة
            </CardDescription>
          </CardContent>
        </Card>

        {/* Metric 2: Attendance Rate */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-3 sm:p-4 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
              نسبة الحضور
            </CardTitle>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              {attendancePercentage}%
            </div>
            <CardDescription className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
              انضباط بالحضور
            </CardDescription>
          </CardContent>
        </Card>

        {/* Metric 3: Latest Recitation */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="p-3 sm:p-4 pb-1 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
              آخر تسميع
            </CardTitle>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            {logs.length > 0 ? (
              <div className="truncate">
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {logs[0].surah_start} ({logs[0].aya_start})
                </div>
                <CardDescription className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                  {formatArabicDate(logs[0].created_at)}
                </CardDescription>
              </div>
            ) : (
              <div className="text-xs text-slate-400 font-bold mt-1">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs Header */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => {
            lightHaptic();
            React.startTransition(() => setActiveTab("logs"));
          }}
          className={`py-3 px-4 sm:px-5 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "logs"
              ? "border-burgundy-700 text-burgundy-900 dark:text-burgundy-300"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4 text-burgundy-700 dark:text-burgundy-400" />
          <span>سجل الحفظ والمراجعة ({totalLogsCount})</span>
        </button>

        <button
          onClick={() => {
            lightHaptic();
            React.startTransition(() => setActiveTab("progress"));
          }}
          className={`py-3 px-4 sm:px-5 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "progress"
              ? "border-burgundy-700 text-burgundy-900 dark:text-burgundy-300"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookCheck className="w-4 h-4 text-burgundy-700 dark:text-burgundy-400" />
          <span>تقدم حفظ السور ({surahProgressList.length})</span>
        </button>

        <button
          onClick={() => {
            lightHaptic();
            React.startTransition(() => setActiveTab("attendance"));
          }}
          className={`py-3 px-4 sm:px-5 text-xs sm:text-sm font-extrabold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "attendance"
              ? "border-burgundy-700 text-burgundy-900 dark:text-burgundy-300"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4 text-burgundy-700 dark:text-burgundy-400" />
          <span>سجل الحضور والغياب ({attendance.length})</span>
        </button>
      </div>

      {/* Tab 1: Memorization Logs List / Timeline */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-50">
              سجل التسميعات اليومية 📜
            </h3>
            <Button
              onClick={() => {
                setEditingLog(null);
                setIsLogDialogOpen(true);
              }}
              size="sm"
              className="gap-2 bg-burgundy-800 hover:bg-burgundy-900 text-white font-bold rounded-xl border border-islamicGold-500/30"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تسميع</span>
            </Button>
          </div>

          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <RecitationLogCard
                  key={log.id}
                  log={log}
                  onDelete={handleDeleteLog}
                  onEdit={(logToEdit) => {
                    setEditingLog(logToEdit);
                    setIsLogDialogOpen(true);
                  }}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed rounded-3xl">
              <CardContent className="space-y-3">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-600 font-bold text-sm">لا يوجد تسميع مسجل لهذا الطالب بعد</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingLog(null);
                    setIsLogDialogOpen(true);
                  }}
                  className="gap-2 rounded-xl"
                >
                  <Plus className="w-4 h-4 text-burgundy-700 dark:text-burgundy-400" />
                  <span>سجل أول تسميع الآن</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Surahs & Juz Memorization Progress Bars */}
      {activeTab === "progress" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Row 1: Title & View Switcher */}
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-50">
                {viewMode === "juz" ? "متابعة تقدم حفظ الأجزاء القرآنية 📑" : "متابعة تقدم حفظ السور القرآنية 📊"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {viewMode === "juz"
                  ? "متابعة دقيقة لنسبة إنجاز صفحات الأجزاء الثلاثين"
                  : "متابعة دقيقة لنسبة إنجاز صفحات كل سورة"}
              </p>
            </div>

            {/* View Switcher: ["📖 عرض الأجزاء" | "📜 عرض السور"] */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("juz")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  viewMode === "juz"
                    ? "bg-white dark:bg-slate-900 text-burgundy-900 dark:text-burgundy-200 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                📖 عرض الأجزاء
              </button>
              <button
                type="button"
                onClick={() => setViewMode("surah")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  viewMode === "surah"
                    ? "bg-white dark:bg-slate-900 text-burgundy-900 dark:text-burgundy-200 shadow-xs"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                📜 عرض السور
              </button>
            </div>
          </div>

          {/* Row 2: Status Filters (Retained & Dynamic) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === "all"
                  ? "bg-burgundy-100 dark:bg-burgundy-950 text-burgundy-900 dark:text-islamicGold-300 border border-burgundy-300 dark:border-burgundy-800"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              الكل ({activeAllCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("in_progress")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === "in_progress"
                  ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              قيد الحفظ ({activeInProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === "completed"
                  ? "bg-burgundy-100 dark:bg-burgundy-950 text-burgundy-900 dark:text-islamicGold-300 border border-burgundy-300 dark:border-burgundy-800"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              مكتملة ({activeCompletedCount})
            </button>
          </div>

          {viewMode === "surah" ? (
            /* Surah Progress Grid */
            filteredSurahList.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(showAllProgress ? filteredSurahList : filteredSurahList.slice(0, 5)).map((surah) => (
                    <Card
                      key={surah.surahId}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shadow-xs hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-burgundy-100 dark:bg-burgundy-950 text-burgundy-900 dark:text-islamicGold-300 font-black text-xs flex items-center justify-center border border-burgundy-200 dark:border-burgundy-800">
                            {surah.surahId}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                              سورة {surah.surahName}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              إجمالي صفحات السورة: {surah.totalPages} صفحة
                            </span>
                          </div>
                        </div>

                        {surah.isCompleted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-burgundy-100 dark:bg-burgundy-950 text-burgundy-900 dark:text-islamicGold-300 border border-burgundy-300 dark:border-burgundy-800">
                            مكتمل 100% ✅
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            قيد الحفظ ({surah.percentage}%) ⏳
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            surah.isCompleted
                              ? "bg-gradient-to-r from-burgundy-700 via-islamicGold-500 to-islamicGold-400"
                              : "bg-gradient-to-r from-amber-500 to-burgundy-700"
                          }`}
                          style={{ width: `${surah.percentage}%` }}
                        />
                      </div>

                      {/* Progress Detail Text */}
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 pt-0.5">
                        <span>
                          {surah.isCompleted
                            ? `تم إتمام حفظ السورة كاملاً (${surah.totalPages} صفحة) ✅`
                            : `تم حفظ ${surah.memorizedPages} من ${surah.totalPages} صفحات`}
                        </span>
                        <span className="font-mono">{surah.percentage}%</span>
                      </div>
                    </Card>
                  ))}
                </div>

                {filteredSurahList.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllProgress(!showAllProgress)}
                    className="w-full py-2.5 px-4 text-xs font-bold text-burgundy-800 dark:text-burgundy-300 bg-burgundy-50 hover:bg-burgundy-100 dark:bg-burgundy-950/50 dark:hover:bg-burgundy-900/50 rounded-2xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <span>
                      {showAllProgress ? "طي القائمة ⌃" : `عرض كافة السور (${filteredSurahList.length} سورة) ⌄`}
                    </span>
                    {showAllProgress ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </>
            ) : (
              <Card className="p-8 text-center border-dashed rounded-3xl">
                <CardContent className="space-y-3">
                  <BookCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-slate-600 font-bold text-sm">لا توجد سور مطابقة للفلتر المحدد</p>
                  <Button variant="outline" onClick={() => setIsLogDialogOpen(true)} className="gap-2 rounded-xl">
                    <Plus className="w-4 h-4 text-burgundy-700 dark:text-burgundy-400" />
                    <span>سجل حفظ جديد الآن</span>
                  </Button>
                </CardContent>
              </Card>
            )
          ) : (
            /* Juz Progress Grid (Collapsible Accordion) */
            filteredJuzList.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(showAllProgress ? filteredJuzList : filteredJuzList.slice(0, 5)).map((juz) => {
                    const isExpanded = expandedJuzId === juz.juzNumber;
                    return (
                      <div
                        key={juz.juzNumber}
                        className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:shadow-sm transition-all"
                      >
                        {/* Compact Single-Row Header */}
                        <button
                          type="button"
                          onClick={() => toggleJuzExpand(juz.juzNumber)}
                          className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-2.5 text-right hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        >
                          {/* Right: Circle Number + Juz Name */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-xl bg-burgundy-100 dark:bg-burgundy-950 text-burgundy-900 dark:text-islamicGold-300 font-black text-xs flex items-center justify-center border border-burgundy-200/80 dark:border-burgundy-800 shrink-0">
                              {juz.juzNumber}
                            </span>
                            <div className="min-w-0">
                              <h4 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                                {juz.name}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-medium sm:hidden">
                                (ص {juz.startPage} - {juz.endPage})
                              </span>
                            </div>
                          </div>

                          {/* Middle: Badge & Left: Interactive Arrow */}
                          <div className="flex items-center gap-2 shrink-0">
                            {juz.isCompleted ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-burgundy-100 dark:bg-burgundy-950 text-burgundy-900 dark:text-islamicGold-300 border border-burgundy-300 dark:border-burgundy-800">
                                مكتمل 100% ✅
                              </span>
                            ) : juz.status === "in_progress" ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                {juz.percentage}% ⏳
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                لم يبدأ
                              </span>
                            )}

                            <ChevronDown
                              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-burgundy-700 dark:text-burgundy-400" : ""
                              }`}
                            />
                          </div>
                        </button>

                        {/* Expandable Details (Opened View) */}
                        {isExpanded && (
                          <div className="px-3.5 pb-3.5 pt-1 space-y-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                              <span>نطاق الصفحات: (الصفحات {juz.startPage} - {juz.endPage})</span>
                              <span className="font-mono">{juz.percentage}%</span>
                            </div>

                            {/* Full Progress Bar */}
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 rounded-full ${
                                  juz.isCompleted
                                    ? "bg-gradient-to-r from-burgundy-700 via-islamicGold-500 to-islamicGold-400"
                                    : juz.status === "in_progress"
                                    ? "bg-gradient-to-r from-amber-500 to-burgundy-700"
                                    : "bg-slate-300 dark:bg-slate-600"
                                }`}
                                style={{ width: `${juz.percentage}%` }}
                              />
                            </div>

                            {/* Exact Page Count Text */}
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 pt-0.5">
                              <span>
                                {juz.isCompleted
                                  ? `تم إتمام حفظ الجزء كاملاً (${juz.totalPages} صفحة) ✅`
                                  : juz.status === "in_progress"
                                  ? `تم حفظ ${juz.memorizedPages} من ${juz.totalPages} صفحة ⏳`
                                  : `لم يبدأ بعد (0 من ${juz.totalPages} صفحة)`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredJuzList.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllProgress(!showAllProgress)}
                    className="w-full py-2.5 px-4 text-xs font-bold text-burgundy-800 dark:text-burgundy-300 bg-burgundy-50 hover:bg-burgundy-100 dark:bg-burgundy-950/50 dark:hover:bg-burgundy-900/50 rounded-2xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <span>
                      {showAllProgress ? "طي القائمة ⌃" : `عرض كافة الأجزاء (${filteredJuzList.length} جزء) ⌄`}
                    </span>
                    {showAllProgress ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
              </>
            ) : (
              <Card className="p-8 text-center border-dashed rounded-3xl">
                <CardContent className="space-y-3">
                  <BookCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-slate-600 font-bold text-sm">لا توجد أجزاء مطابقة للفلتر المحدد</p>
                  <Button variant="outline" onClick={() => setIsLogDialogOpen(true)} className="gap-2 rounded-xl">
                    <Plus className="w-4 h-4 text-burgundy-700 dark:text-burgundy-400" />
                    <span>سجل حفظ جديد الآن</span>
                  </Button>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}

      {/* Tab 3: Attendance History List */}
      {activeTab === "attendance" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-50">
              سجل الحضور والغياب 📅
            </h3>
            <Button
              onClick={() => setIsAttendanceDialogOpen(true)}
              size="sm"
              className="gap-2 bg-burgundy-800 hover:bg-burgundy-900 text-white font-bold rounded-xl border border-islamicGold-500/30"
            >
              <Calendar className="w-4 h-4" />
              <span>تسجيل حضور</span>
            </Button>
          </div>

          {attendance.length > 0 ? (
            <div className="space-y-3">
              {attendance.map((att) => {
                const statusInfo = ATTENDANCE_LABELS[att.status] || { label: att.status, color: "" };

                return (
                  <Card key={att.id} className="hover:shadow-sm transition-all border-slate-200 dark:border-slate-800 rounded-2xl">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-black border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                            {formatArabicDate(att.date)}
                          </span>
                        </div>
                        {att.notes && (
                          <p className="text-xs text-slate-500 mt-1">ملاحظات: {att.notes}</p>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAttendance(att.id)}
                        className="text-slate-400 hover:text-rose-600 p-2 rounded-xl transition-colors shrink-0"
                        title="حذف سجل الحضور"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center border-dashed rounded-3xl">
              <CardContent className="space-y-3">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-slate-600 font-bold text-sm">لا يوجد سجل حضور مسجل بعد</p>
                <Button variant="outline" onClick={() => setIsAttendanceDialogOpen(true)} className="gap-2 rounded-xl">
                  <Calendar className="w-4 h-4 text-burgundy-700 dark:text-burgundy-400" />
                  <span>سجل حضور اليوم</span>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialog Modals */}
      <LogEntryDialog
        isOpen={isLogDialogOpen}
        onClose={() => {
          setIsLogDialogOpen(false);
          setEditingLog(null);
        }}
        studentId={student.id}
        studentName={student.full_name}
        existingLogs={logs}
        editingLog={editingLog}
        onSuccess={(savedLog) => {
          const isEdit = Boolean(editingLog);
          setLogs((prev) => {
            const exists = prev.some((l) => l.id === savedLog.id);
            if (exists) {
              return prev.map((l) => (l.id === savedLog.id ? savedLog : l));
            }
            return [savedLog, ...prev];
          });
          setIsLogDialogOpen(false);
          setEditingLog(null);
          showToast(isEdit ? "تم تحديث التسميع بنجاح ✅" : "تم حفظ التسميع بنجاح ✅");
        }}
      />

      <AttendanceDialog
        isOpen={isAttendanceDialogOpen}
        onClose={() => setIsAttendanceDialogOpen(false)}
        studentId={student.id}
        studentName={student.full_name}
        onSuccess={(newRecord) => {
          setAttendance((prev) => {
            const exists = prev.some((a) => a.id === newRecord.id || a.date === newRecord.date);
            if (exists) {
              return prev.map((a) =>
                a.id === newRecord.id || a.date === newRecord.date ? newRecord : a
              );
            }
            return [newRecord, ...prev];
          });
        }}
      />

      <ShareAchievementModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        student={parentToken ? { ...student, parent_token: parentToken } : student}
        logs={logs}
        attendance={attendance}
      />

      {/* Student Secondary Actions Bottom Sheet / Modal */}
      {isActionMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsActionMenuOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-right animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 font-black text-slate-900 dark:text-slate-100 text-base">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>إجراءات الطالب والمشاركة</span>
              </div>
              <button
                type="button"
                onClick={() => setIsActionMenuOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Items List */}
            <div className="space-y-2 pt-1">
              {/* 1. Share Achievement */}
              <button
                type="button"
                onClick={() => {
                  lightHaptic();
                  setIsActionMenuOpen(false);
                  setIsShareModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-xs transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm">تهنئة ومشاركة الإنجاز 🌟</p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-normal">
                      توليد بطاقة إنجاز ومشاركتها مع الأهل عبر واتساب
                    </p>
                  </div>
                </div>
              </button>

              {/* 2. Copy Parent Link */}
              {parentToken && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleCopyParentLink();
                    setIsActionMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-burgundy-50 hover:bg-burgundy-100/80 dark:bg-burgundy-950/40 dark:hover:bg-burgundy-900/60 border border-burgundy-200/80 dark:border-burgundy-900/60 text-burgundy-900 dark:text-burgundy-200 font-bold text-xs transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-burgundy-100 dark:bg-burgundy-900/60 text-burgundy-700 dark:text-islamicGold-300 flex items-center justify-center font-bold shrink-0 shadow-xs">
                      {isCopiedToken ? <Check className="w-4 h-4 text-burgundy-700 dark:text-islamicGold-400" /> : <Copy className="w-4 h-4 text-burgundy-700 dark:text-islamicGold-400" />}
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">{isCopiedToken ? "تم نسخ الرابط!" : "نسخ رابط متابعة ولي الأمر 📋"}</p>
                      <p className="text-[11px] text-burgundy-800/80 dark:text-burgundy-300/80 font-normal">
                        نسخ الرابط المباشر للبوابة لإرساله لولي الأمر
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {/* 3. Preview Portal */}
              {parentToken && (
                <Link
                  href={`/parent/${parentToken}`}
                  target="_blank"
                  prefetch={false}
                  onClick={() => setIsActionMenuOpen(false)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">معاينة بوابة ولي الأمر 🌐</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                        فتح الصفحة كما يراها ولي الأمر في تبويب جديد
                      </p>
                    </div>
                  </div>
                </Link>
              )}

              {/* 4. Regenerate Parent Token */}
              {parentToken && (
                <button
                  type="button"
                  onClick={async () => {
                    await handleRegenerateParentToken();
                    setIsActionMenuOpen(false);
                  }}
                  disabled={isRegeneratingToken}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 border border-rose-200/80 dark:border-rose-900/50 text-rose-900 dark:text-rose-300 font-bold text-xs transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <RotateCcw className={`w-4 h-4 ${isRegeneratingToken ? "animate-spin" : ""}`} />
                    </div>
                    <div className="text-right">
                      <p className="font-black text-sm">{isRegeneratingToken ? "جاري التجديد..." : "تجديد رابط المتابعة 🔄"}</p>
                      <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 font-normal">
                        إلغاء الرابط القديم وإنشاء رمز وصول جديد لولي الأمر
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>

            {/* Close Button */}
            <Button
              variant="outline"
              onClick={() => setIsActionMenuOpen(false)}
              className="w-full rounded-2xl font-bold text-xs py-2.5 mt-2"
            >
              إغلاق
            </Button>
          </div>
        </div>
      )}

      {/* Floating Success Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[110] bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 text-xs sm:text-sm font-black px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-200 flex items-center gap-2 border border-slate-700/50 dark:border-slate-300/50 pointer-events-none">
          <CheckCircle2 className="w-4 h-4 text-islamicGold-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
