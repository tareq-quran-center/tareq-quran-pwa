"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AdminCenterOverview,
  HalaqaWithDetails,
  TeacherWithHalaqat,
  StudentRow,
} from "@/types";
import {
  createHalaqa,
  updateHalaqa,
  deleteHalaqa,
  updateTeacher,
  toggleTeacherActive,
  transferStudentHalaqa,
  claimAdminRole,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  GraduationCap,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Share2,
  ExternalLink,
  Printer,
  CheckCircle2,
  XCircle,
  Search,
  ArrowUpDown,
  Phone,
  ShieldCheck,
  Award,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface AdminDashboardClientProps {
  initialData: {
    overview?: AdminCenterOverview;
    halaqat?: HalaqaWithDetails[];
    teachers?: TeacherWithHalaqat[];
    students?: Array<
      StudentRow & {
        halaqa_name?: string;
        teacher_name?: string;
      }
    >;
    currentUserIsAdmin?: boolean;
  };
}

export function AdminDashboardClient({ initialData }: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "halaqat" | "teachers" | "students" | "reports"
  >("overview");

  const [overview] = useState<AdminCenterOverview>(
    initialData.overview || {
      totalStudents: 0,
      totalHalaqat: 0,
      totalTeachers: 0,
      attendanceRate: 100,
      totalPagesMemorized: 0,
      totalRecitations: 0,
      todayAttendanceCount: 0,
    }
  );

  const [halaqat, setHalaqat] = useState<HalaqaWithDetails[]>(initialData.halaqat || []);
  const [teachers, setTeachers] = useState<TeacherWithHalaqat[]>(initialData.teachers || []);
  const [students, setStudents] = useState<
    Array<
      StudentRow & {
        halaqa_name?: string;
        teacher_name?: string;
      }
    >
  >(initialData.students || []);

  // Filter & Search states
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedHalaqaFilter, setSelectedHalaqaFilter] = useState("all");

  // Halaqa Modal States
  const [isHalaqaModalOpen, setIsHalaqaModalOpen] = useState(false);
  const [editingHalaqa, setEditingHalaqa] = useState<HalaqaWithDetails | null>(null);
  const [halaqaNameInput, setHalaqaNameInput] = useState("");
  const [halaqaTeacherInput, setHalaqaTeacherInput] = useState("");
  const [isSubmittingHalaqa, setIsSubmittingHalaqa] = useState(false);

  // Transfer Student Modal States
  const [transferModalStudent, setTransferModalStudent] = useState<any | null>(null);
  const [transferTargetHalaqa, setTransferTargetHalaqa] = useState("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  // Reports Tab States
  const [reportType, setReportType] = useState<"center" | "halaqa" | "student">("center");
  const [selectedReportHalaqa, setSelectedReportHalaqa] = useState<string>(halaqat[0]?.id || "");
  const [selectedReportStudent, setSelectedReportStudent] = useState<string>(students[0]?.id || "");

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ==========================================
  // Handlers: Halaqat
  // ==========================================
  const handleOpenCreateHalaqa = () => {
    setEditingHalaqa(null);
    setHalaqaNameInput("");
    setHalaqaTeacherInput("");
    setIsHalaqaModalOpen(true);
  };

  const handleOpenEditHalaqa = (h: HalaqaWithDetails) => {
    setEditingHalaqa(h);
    setHalaqaNameInput(h.name);
    setHalaqaTeacherInput(h.teacher_id || "");
    setIsHalaqaModalOpen(true);
  };

  const handleSaveHalaqa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!halaqaNameInput.trim()) return;

    setIsSubmittingHalaqa(true);
    try {
      if (editingHalaqa) {
        const res = await updateHalaqa({
          id: editingHalaqa.id,
          name: halaqaNameInput.trim(),
          teacher_id: halaqaTeacherInput || undefined,
        });
        if (res.success) {
          showToast("تم تحديث الحلقة بنجاح");
          setHalaqat((prev) =>
            prev.map((item) =>
              item.id === editingHalaqa.id
                ? {
                    ...item,
                    name: halaqaNameInput.trim(),
                    teacher_id: halaqaTeacherInput || null,
                    teacher_name:
                      teachers.find((t) => t.id === halaqaTeacherInput)?.full_name || "غير معين",
                  }
                : item
            )
          );
          setIsHalaqaModalOpen(false);
        } else {
          showToast(res.error || "فشل التحديث");
        }
      } else {
        const res = await createHalaqa({
          name: halaqaNameInput.trim(),
          teacher_id: halaqaTeacherInput || undefined,
        });
        if (res.success && res.data) {
          showToast("تم إنشاء الحلقة بنجاح");
          setHalaqat((prev) => [
            ...prev,
            {
              id: res.data.id,
              name: res.data.name,
              created_by: res.data.created_by,
              created_at: res.data.created_at,
              teacher_id: halaqaTeacherInput || null,
              teacher_name:
                teachers.find((t) => t.id === halaqaTeacherInput)?.full_name || "غير معين",
              teacher_phone: null,
              students_count: 0,
              attendance_rate: 100,
              total_pages: 0,
            },
          ]);
          setIsHalaqaModalOpen(false);
        } else {
          showToast(res.error || "فشل الإنشاء");
        }
      }
    } catch {
      showToast("حدث خطأ غير متوقع");
    } finally {
      setIsSubmittingHalaqa(false);
    }
  };

  const handleDeleteHalaqa = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الحلقة؟ سيتم فك ارتباط طلابها فقط دون حذفهم.")) return;
    const res = await deleteHalaqa(id);
    if (res.success) {
      showToast("تم حذف الحلقة");
      setHalaqat((prev) => prev.filter((h) => h.id !== id));
    } else {
      showToast(res.error || "فشل الحذف");
    }
  };

  // ==========================================
  // Handlers: Teachers
  // ==========================================
  const handleToggleTeacherActive = async (id: string, currentActive: boolean) => {
    const nextState = !currentActive;
    const res = await toggleTeacherActive(id, nextState);
    if (res.success) {
      showToast(nextState ? "تم تفعيل المعلم" : "تم تعطيل حساب المعلم");
      setTeachers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, is_active: nextState } : t))
      );
    } else {
      showToast(res.error || "فشل تغيير حالة المعلم");
    }
  };

  const handleToggleAdminRole = async (id: string, currentRole: string) => {
    const nextRole = currentRole === "admin" ? "teacher" : "admin";
    if (!confirm(`هل أنت متأكد من تغيير صلاحية المستخدم إلى ${nextRole === "admin" ? "مدير" : "معلم"}؟`)) return;
    const res = await updateTeacher(id, { role: nextRole });
    if (res.success) {
      showToast("تم تعديل الصلاحية بنجاح");
      setTeachers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, role: nextRole } : t))
      );
    } else {
      showToast(res.error || "فشل تعديل الصلاحية");
    }
  };

  // ==========================================
  // Handlers: Student Transfer
  // ==========================================
  const handleExecuteTransfer = async () => {
    if (!transferModalStudent || !transferTargetHalaqa) return;
    setIsSubmittingTransfer(true);
    try {
      const targetGroup = halaqat.find((h) => h.id === transferTargetHalaqa);
      const res = await transferStudentHalaqa(
        transferModalStudent.id,
        transferTargetHalaqa,
        targetGroup?.teacher_id || undefined
      );

      if (res.success) {
        showToast("تم نقل الطالب إلى الحلقة الجديدة بنجاح");
        setStudents((prev) =>
          prev.map((s) =>
            s.id === transferModalStudent.id
              ? {
                  ...s,
                  group_id: transferTargetHalaqa,
                  halaqa_name: targetGroup?.name || "بدون حلقة",
                  teacher_name: targetGroup?.teacher_name || "غير محدد",
                }
              : s
          )
        );
        setTransferModalStudent(null);
      } else {
        showToast(res.error || "فشل نقل الطالب");
      }
    } catch {
      showToast("حدث خطأ أثناء نقل الطالب");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Claim Admin Role State & Handler
  const [isAdminConfirmed, setIsAdminConfirmed] = useState(
    initialData.currentUserIsAdmin ?? false
  );
  const [isClaimingAdmin, setIsClaimingAdmin] = useState(false);

  const handleClaimAdmin = async () => {
    setIsClaimingAdmin(true);
    try {
      const res = await claimAdminRole();
      if (res.success) {
        setIsAdminConfirmed(true);
        showToast("تم تثبيت وتفعيل صلاحية مدير المركز بنجاح 👑");
      } else {
        showToast(res.error || "فشل تعيين الصلاحية");
      }
    } catch {
      showToast("حدث خطأ غير متوقع");
    } finally {
      setIsClaimingAdmin(false);
    }
  };

  // Filtered students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.parent_phone && s.parent_phone.includes(studentSearch));
    const matchesHalaqa =
      selectedHalaqaFilter === "all" || s.group_id === selectedHalaqaFilter;
    return matchesSearch && matchesHalaqa;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-burgundy-950 text-white rounded-2xl shadow-2xl border border-islamicGold-400 text-sm font-bold animate-in fade-in slide-in-from-top-4">
          {toastMsg}
        </div>
      )}

      {/* Admin Hero Banner */}
      <div className="no-print relative overflow-hidden bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white p-6 sm:p-7 rounded-3xl shadow-xl border-2 border-islamicGold-500/40">
        <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-burgundy-800/80 border border-islamicGold-400/50 text-islamicGold-300 text-xs font-black">
              <ShieldCheck className="w-4 h-4 text-islamicGold-400" />
              <span>لوحة الإدارة العليا • مركز طارق القرآني</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              لوحة تحكم مدير المركز 👑
            </h1>
            <p className="text-xs sm:text-sm text-burgundy-100 font-medium">
              إدارة شاملة للحلقات القرآنية، المعلمين، شؤون الطلاب، وتقارير الإنجاز العام
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 border-white/30 text-white rounded-xl text-xs font-bold gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-islamicGold-300" />
                <span>لوحة المعلم</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* If current user has not yet claimed admin role */}
      {!isAdminConfirmed && (
        <div className="no-print p-4 sm:p-5 bg-gradient-to-r from-amber-50 via-white to-amber-50 dark:from-amber-950/60 dark:via-slate-900 dark:to-amber-950/60 border-2 border-amber-300 dark:border-amber-700 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-amber-900 dark:text-amber-200 shadow-md">
          <div className="flex items-center gap-3 text-right">
            <span className="text-2xl p-2 rounded-2xl bg-amber-100 dark:bg-amber-900/60">👑</span>
            <div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">
                تأكيد هوية مدير مركز طارق القرآني
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                حسابك الحالي مسجل كـ "معلم". اضغط على الزر لتثبيت وتفعيل صلاحية "مدير المركز" رسمياً لحسابك.
              </p>
            </div>
          </div>

          <Button
            onClick={handleClaimAdmin}
            disabled={isClaimingAdmin}
            className="w-full sm:w-auto bg-gradient-to-r from-burgundy-900 to-burgundy-800 hover:from-burgundy-800 hover:to-burgundy-700 text-white font-black text-xs px-5 py-2.5 rounded-2xl border border-islamicGold-400 shadow-md whitespace-nowrap"
          >
            {isClaimingAdmin ? "جارٍ التفعيل..." : "تأكيد صفتي كمدير المركز 👑"}
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="no-print flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
            activeTab === "overview"
              ? "bg-burgundy-900 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>نظرة عامة</span>
        </button>

        <button
          onClick={() => setActiveTab("halaqat")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
            activeTab === "halaqat"
              ? "bg-burgundy-900 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>الحلقات ({halaqat.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("teachers")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
            activeTab === "teachers"
              ? "bg-burgundy-900 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>المعلمون ({teachers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("students")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
            activeTab === "students"
              ? "bg-burgundy-900 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>الطلاب ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
            activeTab === "reports"
              ? "bg-burgundy-900 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>التقارير</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 5 Core Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* 1. Students */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي الطلاب</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {overview.totalStudents}
                </span>
                <GraduationCap className="w-5 h-5 text-burgundy-800" />
              </div>
              <span className="text-[11px] text-islamicGold-700 dark:text-islamicGold-400 mt-1 block">
                طالب مسجل في المركز
              </span>
            </div>

            {/* 2. Halaqat */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">عدد الحلقات</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {overview.totalHalaqat}
                </span>
                <BookOpen className="w-5 h-5 text-islamicGold-600" />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">حلقة قرآنية نشطة</span>
            </div>

            {/* 3. Teachers */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">عدد المعلمين</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {overview.totalTeachers}
                </span>
                <Users className="w-5 h-5 text-burgundy-700" />
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">معلم ومشرف</span>
            </div>

            {/* 4. Attendance Rate */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">نسبة الحضور</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {overview.attendanceRate}٪
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                معدل التزام المركز
              </span>
            </div>

            {/* 5. Total Pages */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs col-span-2 lg:col-span-1">
              <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي الإنجاز</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {overview.totalPagesMemorized}
                </span>
                <Award className="w-5 h-5 text-islamicGold-500" />
              </div>
              <span className="text-[11px] text-islamicGold-700 dark:text-islamicGold-400 font-bold mt-1 block">
                صفحة تم حفظها وتسميعها
              </span>
            </div>
          </div>

          {/* Halaqat Quick Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  ملخص أداء الحلقات القرآنية
                </h3>
                <p className="text-xs text-slate-500">نظرة سريعة على جميع حلقات مركز طارق</p>
              </div>
              <Button
                onClick={handleOpenCreateHalaqa}
                size="sm"
                className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حلقة</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-black">
                    <th className="py-2.5 px-3">اسم الحلقة</th>
                    <th className="py-2.5 px-3">المعلم المشرف</th>
                    <th className="py-2.5 px-3 text-center">الطلاب</th>
                    <th className="py-2.5 px-3 text-center">نسبة الحضور</th>
                    <th className="py-2.5 px-3 text-center">الصفحات المنجزة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                  {halaqat.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-slate-100">
                        {h.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {h.teacher_name}
                      </td>
                      <td className="py-3 px-3 text-center">{h.students_count} طالب</td>
                      <td className="py-3 px-3 text-center text-emerald-600">{h.attendance_rate}٪</td>
                      <td className="py-3 px-3 text-center text-islamicGold-700 dark:text-islamicGold-400">
                        {h.total_pages} ص
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: HALAQAT */}
      {/* ========================================================================= */}
      {activeTab === "halaqat" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                إدارة الحلقات القرآنية
              </h2>
              <p className="text-xs text-slate-500">
                إنشاء وتعديل الحلقات وتعيين المعلمين المشرفين
              </p>
            </div>
            <Button
              onClick={handleOpenCreateHalaqa}
              className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء حلقة جديدة</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {halaqat.map((h) => (
              <div
                key={h.id}
                className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4 hover:border-burgundy-700/50 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-burgundy-50 dark:bg-burgundy-950 text-burgundy-800 dark:text-burgundy-300">
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => handleOpenEditHalaqa(h)}
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-slate-500 hover:text-burgundy-800 rounded-lg"
                        title="تعديل الحلقة"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteHalaqa(h.id)}
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-slate-500 hover:text-rose-600 rounded-lg"
                        title="حذف الحلقة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {h.name}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-islamicGold-600" />
                    <span>المعلم: </span>
                    <span className="font-bold text-slate-900 dark:text-slate-200">
                      {h.teacher_name}
                    </span>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">الطلاب</span>
                    <span className="font-black text-slate-900 dark:text-white">
                      {h.students_count}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">الحضور</span>
                    <span className="font-black text-emerald-600">{h.attendance_rate}٪</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                    <span className="text-[10px] text-slate-400 block">الإنجاز</span>
                    <span className="font-black text-islamicGold-600">{h.total_pages} ص</span>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setSelectedHalaqaFilter(h.id);
                    setActiveTab("students");
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold rounded-xl border-slate-200 dark:border-slate-700"
                >
                  <span>عرض طلاب الحلقة</span>
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TEACHERS */}
      {/* ========================================================================= */}
      {activeTab === "teachers" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                إدارة المعلمين والمشرفين
              </h2>
              <p className="text-xs text-slate-500">
                تفعيل الحسابات، تعيين الصلاحيات، واستعراض الحلقات المسندة
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-black">
                  <th className="py-2.5 px-3">المعلم</th>
                  <th className="py-2.5 px-3">رقم الهاتف</th>
                  <th className="py-2.5 px-3 text-center">الصلاحية</th>
                  <th className="py-2.5 px-3">الحلقات المسندة</th>
                  <th className="py-2.5 px-3 text-center">الطلاب</th>
                  <th className="py-2.5 px-3 text-center">الحالة</th>
                  <th className="py-2.5 px-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3 font-black text-slate-900 dark:text-slate-100">
                      {t.full_name}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {t.phone || "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleAdminRole(t.id, t.role)}
                        title="انقر لتغيير الصلاحية"
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black border transition-colors ${
                          t.role === "admin"
                            ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {t.role === "admin" ? "مدير مركز 👑" : "معلم حلقة 📖"}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      {t.halaqat && t.halaqat.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.halaqat.map((h) => (
                            <span
                              key={h.id}
                              className="px-2 py-0.5 rounded-lg bg-burgundy-50 dark:bg-burgundy-950/60 text-burgundy-900 dark:text-burgundy-300 text-[10px] font-bold border border-burgundy-200/50"
                            >
                              {h.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">بدون حلقات</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">{t.students_count} طالب</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                          t.is_active
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {t.is_active ? "نشط" : "معطل"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Button
                        onClick={() => handleToggleTeacherActive(t.id, t.is_active)}
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2 text-[11px] font-bold rounded-lg ${
                          t.is_active
                            ? "text-rose-600 hover:bg-rose-50"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {t.is_active ? "تعطيل" : "تفعيل"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STUDENTS */}
      {/* ========================================================================= */}
      {activeTab === "students" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                شؤون طلاب المركز
              </h2>
              <p className="text-xs text-slate-500">
                قائمة جميع الطلاب، نقل الطلاب بين الحلقات، وروابط متابعة أولياء الأمور
              </p>
            </div>
            <Link href="/students">
              <Button className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl gap-1.5">
                <Plus className="w-4 h-4" />
                <span>إضافة طالب جديد</span>
              </Button>
            </Link>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder="البحث باسم الطالب أو رقم هاتف ولي الأمر..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pr-9 h-11 rounded-xl text-xs"
              />
            </div>

            <select
              value={selectedHalaqaFilter}
              onChange={(e) => setSelectedHalaqaFilter(e.target.value)}
              className="h-11 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold w-full sm:w-56"
            >
              <option value="all">جميع الحلقات ({students.length})</option>
              {halaqat.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          {/* Students Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-black">
                  <th className="py-2.5 px-3">اسم الطالب</th>
                  <th className="py-2.5 px-3">الحلقة</th>
                  <th className="py-2.5 px-3">المعلم</th>
                  <th className="py-2.5 px-3 text-center">إجمالي الإنجاز</th>
                  <th className="py-2.5 px-3 text-center">رابط المتابعة</th>
                  <th className="py-2.5 px-3 text-center">نقل الحلقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3">
                      <Link
                        href={`/students/${s.id}`}
                        className="font-black text-slate-900 dark:text-slate-100 hover:text-burgundy-800"
                      >
                        {s.full_name}
                      </Link>
                      {s.parent_phone && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          هاتف: {s.parent_phone}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {s.halaqa_name}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {s.teacher_name}
                    </td>
                    <td className="py-3 px-3 text-center text-islamicGold-700 dark:text-islamicGold-400 font-black">
                      {s.total_pages_memorized || 0} ص
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Link
                        href={`/track/${s.parent_token}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-burgundy-50 hover:bg-burgundy-100 dark:bg-burgundy-950 dark:hover:bg-burgundy-900 text-burgundy-900 dark:text-burgundy-200 text-[11px] font-bold border border-burgundy-200/60 transition-colors"
                      >
                        <span>عرض البطاقة</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Button
                        onClick={() => {
                          setTransferModalStudent(s);
                          setTransferTargetHalaqa(s.group_id || "");
                        }}
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs font-bold text-slate-600 hover:text-burgundy-800 rounded-lg gap-1"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>نقل</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REPORTS */}
      {/* ========================================================================= */}
      {activeTab === "reports" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                تقارير مركز طارق القرآني
              </h2>
              <p className="text-xs text-slate-500">
                تقارير شاملة قابلة للطباعة والتصدير بجودة عالية
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => window.print()}
                className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير</span>
              </Button>
            </div>
          </div>

          {/* Sub-selector */}
          <div className="no-print flex items-center gap-2">
            <button
              onClick={() => setReportType("center")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                reportType === "center"
                  ? "bg-burgundy-900 text-white border-burgundy-900"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300"
              }`}
            >
              تقرير المركز الشامل
            </button>

            <button
              onClick={() => setReportType("halaqa")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                reportType === "halaqa"
                  ? "bg-burgundy-900 text-white border-burgundy-900"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300"
              }`}
            >
              تقرير حلقة معينة
            </button>
          </div>

          {/* Report Type: Center General Report */}
          {reportType === "center" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 print:p-0 print:border-none">
              <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  مركز طارق القرآني — التقرير العام الشامل
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  تاريخ استخراج التقرير: {new Date().toLocaleDateString("ar-JO")}
                </p>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-xs text-slate-400 block">إجمالي الطلاب</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {overview.totalStudents}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-xs text-slate-400 block">عدد الحلقات</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {overview.totalHalaqat}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-xs text-slate-400 block">نسبة الحضور</span>
                  <span className="text-xl font-black text-emerald-600">
                    {overview.attendanceRate}٪
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-xs text-slate-400 block">الصفحات المنجزة</span>
                  <span className="text-xl font-black text-islamicGold-600">
                    {overview.totalPagesMemorized} ص
                  </span>
                </div>
              </div>

              {/* Halaqat breakdown */}
              <div className="space-y-3">
                <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
                  تفصيل إنجاز الحلقات القرآنية:
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border border-slate-200 dark:border-slate-800">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
                        <th className="p-2.5 border">الحلقة</th>
                        <th className="p-2.5 border">المعلم المشرف</th>
                        <th className="p-2.5 border text-center">عدد الطلاب</th>
                        <th className="p-2.5 border text-center">نسبة الحضور</th>
                        <th className="p-2.5 border text-center">الصفحات المنجزة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {halaqat.map((h) => (
                        <tr key={h.id} className="border-t font-bold">
                          <td className="p-2.5 border font-black">{h.name}</td>
                          <td className="p-2.5 border">{h.teacher_name}</td>
                          <td className="p-2.5 border text-center">{h.students_count}</td>
                          <td className="p-2.5 border text-center text-emerald-600">{h.attendance_rate}٪</td>
                          <td className="p-2.5 border text-center text-islamicGold-700">{h.total_pages}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Report Type: Halaqa Specific Report */}
          {reportType === "halaqa" && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="no-print flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">اختر الحلقة:</span>
                <select
                  value={selectedReportHalaqa}
                  onChange={(e) => setSelectedReportHalaqa(e.target.value)}
                  className="h-10 px-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-bold"
                >
                  {halaqat.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const curHalaqa = halaqat.find((h) => h.id === selectedReportHalaqa);
                const hStudents = students.filter((s) => s.group_id === selectedReportHalaqa);

                return (
                  <div className="space-y-4">
                    <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        تقرير {curHalaqa?.name || "الحلقة"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        معلم الحلقة: {curHalaqa?.teacher_name || "غير محدد"} • عدد الطلاب: {hStudents.length}
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs border">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800 font-black">
                            <th className="p-2.5 border">اسم الطالب</th>
                            <th className="p-2.5 border">رقم الهاتف</th>
                            <th className="p-2.5 border text-center">إجمالي الصفحات الحفظ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hStudents.map((s) => (
                            <tr key={s.id} className="border-t font-bold">
                              <td className="p-2.5 border font-black">{s.full_name}</td>
                              <td className="p-2.5 border">{s.parent_phone || "—"}</td>
                              <td className="p-2.5 border text-center text-islamicGold-700">
                                {s.total_pages_memorized || 0} ص
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT HALAQA */}
      {/* ========================================================================= */}
      {isHalaqaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {editingHalaqa ? "تعديل الحلقة القرآنية" : "إنشاء حلقة قرآنية جديدة"}
            </h3>

            <form onSubmit={handleSaveHalaqa} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  اسم الحلقة
                </label>
                <Input
                  type="text"
                  placeholder="مثال: حلقة عثمان بن عفان"
                  value={halaqaNameInput}
                  onChange={(e) => setHalaqaNameInput(e.target.value)}
                  required
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  تعيين المعلم المشرف
                </label>
                <select
                  value={halaqaTeacherInput}
                  onChange={(e) => setHalaqaTeacherInput(e.target.value)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="">بدون تعيين معلم حالياً</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.phone || "بدون هاتف"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setIsHalaqaModalOpen(false)}
                  variant="ghost"
                  className="rounded-xl text-xs font-bold"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingHalaqa}
                  className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl text-xs font-bold"
                >
                  {isSubmittingHalaqa ? "جارٍ الحفظ..." : "حفظ"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRANSFER STUDENT */}
      {/* ========================================================================= */}
      {transferModalStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in zoom-in-95">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              نقل الطالب بين الحلقات
            </h3>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              نقل الطالب <span className="font-bold text-burgundy-900 dark:text-burgundy-300">"{transferModalStudent.full_name}"</span> إلى حلقة جديدة في المركز:
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  الحلقة المستهدفة
                </label>
                <select
                  value={transferTargetHalaqa}
                  onChange={(e) => setTransferTargetHalaqa(e.target.value)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="">بدون حلقة</option>
                  {halaqat.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} (المعلم: {h.teacher_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  onClick={() => setTransferModalStudent(null)}
                  variant="ghost"
                  className="rounded-xl text-xs font-bold"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  onClick={handleExecuteTransfer}
                  disabled={isSubmittingTransfer}
                  className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl text-xs font-bold"
                >
                  {isSubmittingTransfer ? "جارٍ النقل..." : "تأكيد النقل"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
