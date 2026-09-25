"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AdminCenterOverview,
  HalaqaWithDetails,
  TeacherWithHalaqat,
  StudentRow,
  SeasonRow,
  ActivityWithStats,
} from "@/types";
import { ActivityDialog } from "./ActivityDialog";
import { ActivitiesManagerTab } from "./ActivitiesManagerTab";
import {
  getActivitiesForAdmin,
  createActivity,
  deleteActivity,
} from "@/lib/actions/activity";

const BulkStudentImportDialog = dynamic(
  () =>
    import("./BulkStudentImportDialog").then(
      (m) => m.BulkStudentImportDialog
    ),
  { ssr: false }
);
import {
  createHalaqa,
  updateHalaqa,
  deleteHalaqa,
  toggleTeacherActive,
  createTeacher,
  deleteTeacher,
  transferStudentHalaqa,
  permanentlyDeleteStudentByAdmin,
  deleteAllStudentsPermanentlyByAdmin,
} from "@/lib/actions/admin";
import {
  TRANSFER_RLS_MIGRATION_SQL,
  SUPABASE_SQL_EDITOR_URL,
} from "@/lib/constants/transferSql";
import { IslamicAdminBanner } from "./IslamicAdminBanner";
import { IslamicHalaqaCard } from "./IslamicHalaqaCard";
import { IslamicSidebarWidgets } from "./IslamicSidebarWidgets";
import { HalaqatHonorBoard } from "./HalaqatHonorBoard";
import { AdminAccountSettingsDialog } from "./AdminAccountSettingsDialog";
import { SeasonSelector } from "@/components/common/SeasonSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  UserPlus,
  GraduationCap,
  FileText,
  Compass,
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
  Sun,
  Snowflake,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Crown,
  Trophy,
  Copy,
  Check,
  Settings,
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
        season_id?: string;
        season_name?: string;
      }
    >;
    seasons?: SeasonRow[];
    currentUserIsAdmin?: boolean;
    currentUserId?: string;
    currentUserProfile?: {
      id: string;
      email: string;
      fullName: string;
      phone: string;
      role: string;
    };
  };
}

export function AdminDashboardClient({ initialData }: AdminDashboardClientProps) {
  const currentUserId = initialData.currentUserId;
  const [activeTab, setActiveTab] = useState<
    "overview" | "honor" | "halaqat" | "teachers" | "students" | "activities" | "reports"
  >("overview");

  const [currentUser, setCurrentUser] = useState(initialData.currentUserProfile);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityWithStats[]>([]);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isMissingActivityTables, setIsMissingActivityTables] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getActivitiesForAdmin().then((res) => {
      if (isMounted) {
        if (res.success && res.data) {
          setActivities(res.data);
        }
        if (res.isMissingTables) {
          setIsMissingActivityTables(true);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const [seasons] = useState<SeasonRow[]>(
    initialData.seasons && initialData.seasons.length > 0
      ? initialData.seasons
      : [
          {
            id: "1cf3bae5-b259-4f96-babe-4dcd80598ed8",
            name: "النادي الدائم",
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: "bc3c7462-3567-40ea-bb19-ebfd32b15c71",
            name: "النادي الصيفي",
            is_active: false,
            created_at: new Date().toISOString(),
          },
          {
            id: "0701bbdb-5a34-426f-afee-4f8dd296cc4e",
            name: "النادي الشتوي",
            is_active: false,
            created_at: new Date().toISOString(),
          },
        ]
  );

  const defaultActiveSeason = useMemo(
    () => seasons.find((s) => s.is_active) || seasons[0],
    [seasons]
  );

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(defaultActiveSeason.id);

  const [overview, setOverview] = useState<AdminCenterOverview>(
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
        season_id?: string;
        season_name?: string;
      }
    >
  >(initialData.students || []);

  // Filter & Search states
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedHalaqaFilter, setSelectedHalaqaFilter] = useState("all");
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  // Halaqa Modal States
  const [isHalaqaModalOpen, setIsHalaqaModalOpen] = useState(false);
  const [editingHalaqa, setEditingHalaqa] = useState<HalaqaWithDetails | null>(null);
  const [halaqaNameInput, setHalaqaNameInput] = useState("");
  const [halaqaTeacherInput, setHalaqaTeacherInput] = useState("");
  const [halaqaSeasonInput, setHalaqaSeasonInput] = useState<string>(defaultActiveSeason.id);
  const [isSubmittingHalaqa, setIsSubmittingHalaqa] = useState(false);

  // Transfer Student Modal States
  const [transferModalStudent, setTransferModalStudent] = useState<any | null>(null);
  const [transferTargetHalaqa, setTransferTargetHalaqa] = useState("");
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [transferRlsModalOpen, setTransferRlsModalOpen] = useState(false);
  const [copiedTransferSql, setCopiedTransferSql] = useState(false);

  // Permanent Delete Student Modal States (Admin Only)
  const [studentToDeletePermanently, setStudentToDeletePermanently] = useState<any | null>(null);
  const [isDeletingStudentPermanently, setIsDeletingStudentPermanently] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [isDeletingAllStudents, setIsDeletingAllStudents] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState("");

  // Reports Tab States
  const [reportType, setReportType] = useState<"center" | "halaqa" | "student">("center");
  const [selectedReportHalaqa, setSelectedReportHalaqa] = useState<string>(halaqat[0]?.id || "");
  const [selectedReportStudent, setSelectedReportStudent] = useState<string>(students[0]?.id || "");

  // Teacher Management Modal States
  const [isCreateTeacherModalOpen, setIsCreateTeacherModalOpen] = useState(false);
  const [teacherFullName, setTeacherFullName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherPhone, setTeacherPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);
  const [teacherFormError, setTeacherFormError] = useState<string | null>(null);

  // Delete Teacher Confirmation Dialog States
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherWithHalaqat | null>(null);
  const [isDeletingTeacher, setIsDeletingTeacher] = useState(false);

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateActivity = async (data: any) => {
    const res = await createActivity(data);
    if (res.success && res.data) {
      showToast("تم نشر النشاط بنجاح لأولياء الأمور 🎉");
      setIsMissingActivityTables(false);
      const refreshed = await getActivitiesForAdmin();
      if (refreshed.success) setActivities(refreshed.data);
      return { success: true };
    } else {
      if (res.errorCode === "TABLES_NOT_FOUND") {
        setIsMissingActivityTables(true);
      }
      showToast(res.error || "تعذر حفظ النشاط");
      return { success: false, error: res.error, errorCode: res.errorCode };
    }
  };

  const handleDeleteActivity = async (id: string) => {
    const res = await deleteActivity(id);
    if (res.success) {
      setActivities((prev) => prev.filter((a) => a.id !== id));
      showToast("تم حذف النشاط بنجاح");
      return true;
    } else {
      showToast(res.error || "تعذر حذف النشاط");
      return false;
    }
  };

  // Filtered halaqat by selected season
  const displayedHalaqat = useMemo(() => {
    if (!selectedSeasonId || selectedSeasonId === "all") return halaqat;
    return halaqat.filter((h) => h.season_id === selectedSeasonId);
  }, [halaqat, selectedSeasonId]);

  // Filtered students by selected season and search
  const displayedStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSeason =
        !selectedSeasonId || selectedSeasonId === "all" || s.season_id === selectedSeasonId;
      const matchesHalaqa =
        selectedHalaqaFilter === "all" || s.group_id === selectedHalaqaFilter;
      const matchesSearch =
        !studentSearch.trim() ||
        s.full_name?.toLowerCase().includes(studentSearch.toLowerCase().trim());
      return matchesSeason && matchesHalaqa && matchesSearch;
    });
  }, [students, selectedSeasonId, selectedHalaqaFilter, studentSearch]);

  // Overview KPIs recalculated for the selected season
  const displayedOverview = useMemo(() => {
    if (!selectedSeasonId || selectedSeasonId === "all") return overview;

    const seasonHalaqat = halaqat.filter((h) => h.season_id === selectedSeasonId);
    const seasonStudents = students.filter((s) => s.season_id === selectedSeasonId);
    const seasonPages = seasonHalaqat.reduce((acc, h) => acc + h.total_pages, 0);
    const totalAtt = seasonHalaqat.reduce(
      (acc, h) => acc + (h.students_count > 0 ? h.attendance_rate : 0),
      0
    );
    const avgAtt = seasonHalaqat.length > 0 ? Math.round(totalAtt / seasonHalaqat.length) : 100;
    const teacherIds = new Set(seasonHalaqat.map((h) => h.teacher_id).filter(Boolean));

    return {
      totalStudents: seasonStudents.length,
      totalHalaqat: seasonHalaqat.length,
      totalTeachers: teacherIds.size || 0,
      attendanceRate: avgAtt,
      totalPagesMemorized: Number(seasonPages.toFixed(1)),
      totalRecitations: overview.totalRecitations,
      todayAttendanceCount: overview.todayAttendanceCount,
    };
  }, [overview, halaqat, students, selectedSeasonId]);

  // Active season name helper
  const currentSeasonObj = useMemo(
    () => seasons.find((s) => s.id === selectedSeasonId),
    [seasons, selectedSeasonId]
  );

  // ==========================================
  // Handlers: Halaqat
  // ==========================================
  const handleOpenCreateHalaqa = () => {
    setEditingHalaqa(null);
    setHalaqaNameInput("");
    setHalaqaTeacherInput("");
    setHalaqaSeasonInput(selectedSeasonId !== "all" ? selectedSeasonId : defaultActiveSeason.id);
    setIsHalaqaModalOpen(true);
  };

  const handleOpenEditHalaqa = (h: HalaqaWithDetails) => {
    setEditingHalaqa(h);
    setHalaqaNameInput(h.name);
    setHalaqaTeacherInput(h.teacher_id || "");
    setHalaqaSeasonInput(h.season_id || defaultActiveSeason.id);
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
          season_id: halaqaSeasonInput,
        });
        if (res.success) {
          const seasonObj = seasons.find((s) => s.id === halaqaSeasonInput);
          showToast("تم تحديث الحلقة بنجاح");
          setHalaqat((prev) =>
            prev.map((item) =>
              item.id === editingHalaqa.id
                ? {
                    ...item,
                    name: halaqaNameInput.trim(),
                    teacher_id: halaqaTeacherInput || null,
                    season_id: halaqaSeasonInput,
                    season_name: seasonObj?.name || item.season_name,
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
          season_id: halaqaSeasonInput,
        });
        if (res.success && res.data) {
          const seasonObj = seasons.find((s) => s.id === halaqaSeasonInput);
          showToast("تم إنشاء وتفعيل الحلقة بنجاح ✅");
          setHalaqat((prev) => [
            ...prev,
            {
              id: res.data.id,
              name: res.data.name,
              created_by: res.data.created_by,
              created_at: res.data.created_at || new Date().toISOString(),
              teacher_id: halaqaTeacherInput || null,
              teacher_name:
                teachers.find((t) => t.id === halaqaTeacherInput)?.full_name || "غير معين",
              teacher_phone:
                teachers.find((t) => t.id === halaqaTeacherInput)?.phone || null,
              season_id: halaqaSeasonInput,
              season_name: seasonObj?.name || "النادي الدائم",
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
    if (currentUserId && id === currentUserId) {
      showToast("لا يمكنك تعطيل حسابك الإداري الحالي");
      return;
    }
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

  // ==========================================
  // Handlers: Teacher Creation & Deletion
  // ==========================================
  const handleOpenCreateTeacherModal = () => {
    setTeacherFullName("");
    setTeacherEmail("");
    setTeacherPassword("");
    setTeacherPhone("");
    setTeacherFormError(null);
    setShowPassword(false);
    setIsCreateTeacherModalOpen(true);
  };

  const handleExecuteCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeacherFormError(null);

    if (!teacherFullName.trim()) {
      setTeacherFormError("يرجى إدخال الاسم الرباعي للمعلم");
      return;
    }
    if (!teacherEmail.trim() || !teacherEmail.includes("@")) {
      setTeacherFormError("يرجى إدخال بريد إلكتروني صالح");
      return;
    }
    if (!teacherPassword || teacherPassword.length < 6) {
      setTeacherFormError("كلمة المرور يجب ألا تقل عن 6 خانات");
      return;
    }

    setIsSubmittingTeacher(true);
    try {
      const res = await createTeacher({
        full_name: teacherFullName.trim(),
        email: teacherEmail.trim(),
        password: teacherPassword,
        phone: teacherPhone.trim() || undefined,
      });

      if (res.success && res.teacher) {
        showToast("تم إنشاء حساب المعلم وإضافته بنجاح ✅");
        setTeachers((prev) => [...prev, res.teacher]);
        setIsCreateTeacherModalOpen(false);
      } else {
        setTeacherFormError(res.error || "فشل إضافة المعلم");
      }
    } catch {
      setTeacherFormError("حدث خطأ غير متوقع أثناء إضافة المعلم");
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  const handleConfirmDeleteTeacher = (teacher: TeacherWithHalaqat) => {
    if (currentUserId && teacher.id === currentUserId) {
      showToast("لا يمكنك حذف حسابك الإداري الحالي");
      return;
    }
    setTeacherToDelete(teacher);
  };

  const handleExecuteDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    setIsDeletingTeacher(true);
    try {
      const res = await deleteTeacher(teacherToDelete.id);
      if (res.success) {
        showToast(`تم حذف المعلم (${teacherToDelete.full_name}) وفك ارتباطه بالحلقات بنجاح`);
        setTeachers((prev) => prev.filter((t) => t.id !== teacherToDelete.id));
        setHalaqat((prev) =>
          prev.map((h) =>
            h.teacher_id === teacherToDelete.id
              ? { ...h, teacher_id: null, teacher_name: "غير معين", teacher_phone: null }
              : h
          )
        );
        setTeacherToDelete(null);
      } else {
        showToast(res.error || "فشل حذف المعلم");
      }
    } catch {
      showToast("حدث خطأ أثناء حذف المعلم");
    } finally {
      setIsDeletingTeacher(false);
    }
  };

  // ==========================================
  // Handlers: Student Transfer
  // ==========================================
  const handleExecuteTransfer = async () => {
    if (!transferModalStudent) return;

    const targetHalaqaId = transferTargetHalaqa && transferTargetHalaqa !== "none" ? transferTargetHalaqa : "";
    const prevGroupId = transferModalStudent.group_id || "";

    if (targetHalaqaId === prevGroupId) {
      showToast("الطالب مسجل بالفعل في هذه الحلقة");
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      const targetGroup = halaqat.find((h) => h.id === targetHalaqaId);
      const res = await transferStudentHalaqa(
        transferModalStudent.id,
        targetHalaqaId,
        targetGroup?.teacher_id || undefined
      );

      if (res.success) {
        if (res.warning) {
          showToast(res.warning);
        } else {
          showToast(
            targetHalaqaId
              ? "تم نقل الطالب إلى الحلقة الجديدة بنجاح"
              : "تم إلغاء تعيين الطالب من الحلقة بنجاح"
          );
        }

        const newHalaqaName = targetGroup?.name || "بدون حلقة";
        const newTeacherName = targetGroup?.teacher_name || "غير محدد";

        setStudents((prev) =>
          prev.map((s) =>
            s.id === transferModalStudent.id
              ? {
                  ...s,
                  group_id: targetHalaqaId || null,
                  halaqa_name: newHalaqaName,
                  teacher_name: newTeacherName,
                }
              : s
          )
        );

        // Update halaqat student counts immediately
        if (prevGroupId) {
          setHalaqat((prev) =>
            prev.map((h) =>
              h.id === prevGroupId
                ? { ...h, students_count: Math.max(0, (h.students_count || 1) - 1) }
                : h
            )
          );
        }
        if (targetHalaqaId) {
          setHalaqat((prev) =>
            prev.map((h) =>
              h.id === targetHalaqaId
                ? { ...h, students_count: (h.students_count || 0) + 1 }
                : h
            )
          );
        }

        setTransferModalStudent(null);
      } else {
        if (res.isRlsError) {
          setTransferRlsModalOpen(true);
        }
        showToast(res.error || "فشل نقل الطالب");
      }
    } catch {
      showToast("حدث خطأ غير متوقع أثناء نقل الطالب");
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // ==========================================
  // Handlers: Student Permanent Delete (Admin Only)
  // ==========================================
  const handleExecutePermanentDeleteStudent = async () => {
    if (!studentToDeletePermanently) return;
    setIsDeletingStudentPermanently(true);
    try {
      const targetStudent = studentToDeletePermanently;
      const res = await permanentlyDeleteStudentByAdmin(targetStudent.id);
      if (res.success) {
        showToast(
          `تم حذف الطالب «${targetStudent.full_name || targetStudent.name}» وجميع سجلاته نهائياً بنجاح`
        );

        const deletedId = targetStudent.id;
        const deletedGroupId = targetStudent.group_id;

        // 1. Remove from students list
        setStudents((prev) => prev.filter((s) => s.id !== deletedId));

        // 2. Decrement overview totalStudents count
        setOverview((prev) => ({
          ...prev,
          totalStudents: Math.max(0, (prev.totalStudents || 1) - 1),
        }));

        // 3. Decrement halaqat student count
        if (deletedGroupId) {
          setHalaqat((prev) =>
            prev.map((h) =>
              h.id === deletedGroupId
                ? { ...h, students_count: Math.max(0, (h.students_count || 1) - 1) }
                : h
            )
          );
        }

        setStudentToDeletePermanently(null);
      } else {
        showToast(res.error || "فشل حذف الطالب نهائياً");
      }
    } catch {
      showToast("حدث خطأ غير متوقع أثناء حذف الطالب");
    } finally {
      setIsDeletingStudentPermanently(false);
    }
  };

  const handleExecuteDeleteAllStudents = async () => {
    setIsDeletingAllStudents(true);
    try {
      const res = await deleteAllStudentsPermanentlyByAdmin();
      if (res.success) {
        showToast("تم مسح وتصفير كافة بيانات الطلاب وسجلاتهم نهائياً بنجاح");
        setStudents([]);
        setOverview((prev) => ({
          ...prev,
          totalStudents: 0,
          totalPagesMemorized: 0,
          totalRecitations: 0,
          todayAttendanceCount: 0,
        }));
        setHalaqat((prev) =>
          prev.map((h) => ({
            ...h,
            students_count: 0,
            total_pages: 0,
          }))
        );
        setIsDeleteAllModalOpen(false);
        setConfirmDeleteText("");
      } else {
        showToast(res.error || "فشل مسح وتصفير بيانات الطلاب");
      }
    } catch {
      showToast("حدث خطأ غير متوقع أثناء مسح وتصفير الطلاب");
    } finally {
      setIsDeletingAllStudents(false);
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

      {/* Admin Islamic Hero Banner */}
      <IslamicAdminBanner
        onOpenCreateHalaqa={handleOpenCreateHalaqa}
        onOpenCreateTeacher={handleOpenCreateTeacherModal}
        onOpenActivities={() => {
          setActiveTab("activities");
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        totalStudents={displayedOverview.totalStudents}
        totalHalaqat={displayedOverview.totalHalaqat}
        totalTeachers={displayedOverview.totalTeachers}
      />

      {/* Elegant Season Selector Bar */}
      <div className="no-print">
        <SeasonSelector
          seasons={seasons}
          selectedSeasonId={selectedSeasonId}
          onSeasonChange={setSelectedSeasonId}
          showAllOption={true}
        />
      </div>

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
          onClick={() => setActiveTab("honor")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
            activeTab === "honor"
              ? "bg-gradient-to-r from-amber-500 to-islamicGold-600 text-burgundy-950 font-black shadow-md border border-islamicGold-300"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800"
          }`}
        >
          <Crown className="w-4 h-4 text-amber-500" />
          <span>لوحة الشرف 🏆</span>
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
          <span>الحلقات ({displayedHalaqat.length})</span>
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
          <span>الطلاب ({displayedStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("activities")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap ${
            activeTab === "activities"
              ? "bg-burgundy-900 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800"
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>النشاطات والرحلات 🚌 ({activities.length})</span>
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

        <div className="mr-auto pr-2">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-burgundy-900 hover:bg-white dark:hover:bg-slate-800 transition-all border border-slate-200/80 dark:border-slate-700 shadow-2xs whitespace-nowrap"
            title="تعديل كلمة المرور أو البريد أو بيانات الحساب"
          >
            <Settings className="w-3.5 h-3.5 text-islamicGold-600" />
            <span>إعدادات الحساب ⚙️</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & HALAQAT PORTAL (مستوحى من تصميم مجمع الحلقات بأسلوب إبداعي) */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Active Season Banner Indicator */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50/80 dark:bg-burgundy-950/40 rounded-2xl border border-amber-300/60 dark:border-burgundy-900/60 text-xs font-bold text-burgundy-950 dark:text-burgundy-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-islamicGold-500 animate-pulse" />
              <span>
                نطاق العرض الحالي:{" "}
                <span className="font-black text-burgundy-900 dark:text-islamicGold-300">
                  {selectedSeasonId === "all" ? "جميع الأندية والفصول" : currentSeasonObj?.name}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="font-bold">{displayedHalaqat.length} حلقة قرآنية</span>
              <span>•</span>
              <span className="font-bold">{displayedStudents.length} طالب</span>
            </div>
          </div>

          {/* 5 Core Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* 1. Students */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-amber-200/60 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي الطلاب</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {displayedOverview.totalStudents}
                </span>
                <GraduationCap className="w-5 h-5 text-burgundy-800 dark:text-islamicGold-400" />
              </div>
              <span className="text-[11px] text-islamicGold-700 dark:text-islamicGold-400 mt-1 block font-bold">
                طالب مسجل في المركز
              </span>
            </div>

            {/* 2. Halaqat */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-amber-200/60 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">عدد الحلقات</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {displayedOverview.totalHalaqat}
                </span>
                <BookOpen className="w-5 h-5 text-islamicGold-600" />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-bold">حلقة قرآنية تابعة</span>
            </div>

            {/* 3. Teachers */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-amber-200/60 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">عدد المعلمين</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {displayedOverview.totalTeachers}
                </span>
                <Users className="w-5 h-5 text-burgundy-700 dark:text-islamicGold-400" />
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-bold">معلم ومشرف</span>
            </div>

            {/* 4. Attendance Rate */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-amber-200/60 dark:border-slate-800 shadow-xs">
              <span className="text-xs text-slate-500 font-bold block mb-1">نسبة الحضور</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {displayedOverview.attendanceRate}٪
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-[11px] text-emerald-600 font-bold mt-1 block">
                معدل الالتزام
              </span>
            </div>

            {/* 5. Total Pages */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-amber-200/60 dark:border-slate-800 shadow-xs col-span-2 lg:col-span-1">
              <span className="text-xs text-slate-500 font-bold block mb-1">إجمالي الإنجاز</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {displayedOverview.totalPagesMemorized}
                </span>
                <Award className="w-5 h-5 text-islamicGold-500" />
              </div>
              <span className="text-[11px] text-islamicGold-700 dark:text-islamicGold-400 font-bold mt-1 block">
                صفحة تم حفظها وتسميعها
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ROYAL ISLAMIC HONOR BOARD (لوحة الشرف للطالب المتميز لكل حلقة) */}
          {/* ========================================================================= */}
          <HalaqatHonorBoard
            halaqat={displayedHalaqat}
            students={displayedStudents}
            onSelectStudent={(studentId) => {
              const st = students.find((s) => s.id === studentId);
              if (st) {
                setStudentSearch(st.name || st.full_name || "");
                setActiveTab("students");
              }
            }}
          />

          {/* ========================================================================= */}
          {/* THE CLASSICAL ISLAMIC PORTAL LAYOUT (مستوحى من تصميم مجمع حلقات الصديق) */}
          {/* Main Area: Halaqat Grid (Right/Center) + Sidebar Widgets (Left) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Right/Center Main Column: Halaqat Showcase */}
            <div className="lg:col-span-2 space-y-5">
              {/* Ornamental Classical Ribbon Banner (تماثل شريط "حلقات مجمع الصديق" في الصورة) */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-100 via-amber-200/80 to-amber-100 dark:from-burgundy-950 dark:via-burgundy-900 dark:to-burgundy-950 p-3 sm:p-3.5 border-2 border-islamicGold-400 shadow-xs flex items-center justify-between text-burgundy-950 dark:text-islamicGold-300">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-burgundy-950 dark:bg-islamicGold-400/20 text-islamicGold-300 flex items-center justify-center font-bold text-sm shadow-2xs">
                    📖
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-burgundy-950 dark:text-white">
                      حلقات مجمع مركز طارق بن زياد القرآني
                    </h2>
                    <p className="text-[11px] text-burgundy-900/80 dark:text-burgundy-200 font-medium">
                      بوابة المتابعة الشاملة للحلقات القرآنية المسندة للمعلمين
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleOpenCreateHalaqa}
                  size="sm"
                  className="bg-burgundy-950 hover:bg-burgundy-900 text-islamicGold-300 hover:text-white text-xs font-black rounded-xl border border-islamicGold-400/40 shadow-xs gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">إضافة حلقة جديدة</span>
                  <span className="sm:hidden">إضافة</span>
                </Button>
              </div>

              {/* Halaqat Cards Grid (عمودان من البطاقات المزخرفة كما في نموذج مجمع الحلقات) */}
              {displayedHalaqat.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-amber-300 dark:border-slate-800 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-burgundy-950 flex items-center justify-center text-burgundy-800 dark:text-burgundy-300 border border-amber-200 dark:border-burgundy-800">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-black text-slate-900 dark:text-white">
                    لا توجد حلقات قرآنية مسجلة في {currentSeasonObj?.name || "هذا النادي"}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    ابدأ بإنشاء أول حلقة وربطها بهذا النادي لتمكين المعلمين والطلاب من بدء التسميع والمتابعة.
                  </p>
                  <Button
                    onClick={handleOpenCreateHalaqa}
                    className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl gap-1.5 text-xs font-black"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إنشاء حلقة جديدة الآن</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {displayedHalaqat.map((h) => (
                    <IslamicHalaqaCard
                      key={h.id}
                      halaqa={h}
                      onViewStudents={(halaqaId) => {
                        setSelectedHalaqaFilter(halaqaId);
                        setActiveTab("students");
                      }}
                      onEdit={handleOpenEditHalaqa}
                      onDelete={handleDeleteHalaqa}
                    />
                  ))}
                </div>
              )}

              {/* Detailed Halaqat Performance Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border-2 border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Award className="w-4 h-4 text-islamicGold-600" />
                    <span>سجل أداء الحلقات التفصيلي</span>
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {displayedHalaqat.length} حلقة نشطة
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 font-black">
                        <th className="py-2.5 px-3">اسم الحلقة</th>
                        <th className="py-2.5 px-3">النادي</th>
                        <th className="py-2.5 px-3">المعلم المشرف</th>
                        <th className="py-2.5 px-3 text-center">الطلاب</th>
                        <th className="py-2.5 px-3 text-center">نسبة الحضور</th>
                        <th className="py-2.5 px-3 text-center">الصفحات المنجزة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                      {displayedHalaqat.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            لا توجد حلقات مسجلة في هذا النادي حالياً.
                          </td>
                        </tr>
                      ) : (
                        displayedHalaqat.map((h) => (
                          <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-3 px-3 font-black text-slate-900 dark:text-slate-100">
                              {h.name}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-burgundy-50 dark:bg-burgundy-950 text-burgundy-900 dark:text-burgundy-300 border border-islamicGold-400/30">
                                {h.season_name || "النادي الدائم"}
                              </span>
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Left Column: Sidebar Widgets (الطالب المثالي، المصحف، العدادات، والروابط) */}
            <div className="lg:col-span-1">
              <IslamicSidebarWidgets
                students={students}
                halaqat={displayedHalaqat}
                totalStudents={displayedOverview.totalStudents}
                totalHalaqat={displayedOverview.totalHalaqat}
                totalTeachers={displayedOverview.totalTeachers}
                attendanceRate={displayedOverview.attendanceRate}
                totalPages={displayedOverview.totalPagesMemorized}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: HONOR BOARD (لوحة الشرف المستقلة) */}
      {/* ========================================================================= */}
      {activeTab === "honor" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <HalaqatHonorBoard
            halaqat={displayedHalaqat}
            students={displayedStudents}
            onSelectStudent={(studentId) => {
              const st = students.find((s) => s.id === studentId);
              if (st) {
                setStudentSearch(st.name || st.full_name || "");
                setActiveTab("students");
              }
            }}
          />
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
                إدارة الحلقات القرآنية • {selectedSeasonId === "all" ? "جميع الأندية" : currentSeasonObj?.name}
              </h2>
              <p className="text-xs text-slate-500">
                إنشاء وتعديل الحلقات وتعيين المعلمين المشرفين وتصنيفها حسب الأندية
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
            {displayedHalaqat.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-burgundy-50 dark:bg-burgundy-950 flex items-center justify-center text-burgundy-800 dark:text-burgundy-300">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  لا توجد حلقات قرآنية مسجلة في {currentSeasonObj?.name || "هذا النادي"}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  ابدأ بإضافة أول حلقة وربطها بهذا النادي لتمكين المعلمين والطلاب من بدء التسميع والمتابعة.
                </p>
                <Button
                  onClick={handleOpenCreateHalaqa}
                  className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl gap-1.5 text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة حلقة الآن</span>
                </Button>
              </div>
            ) : (
              displayedHalaqat.map((h) => (
                <IslamicHalaqaCard
                  key={h.id}
                  halaqa={h}
                  onViewStudents={(halaqaId) => {
                    setSelectedHalaqaFilter(halaqaId);
                    setActiveTab("students");
                  }}
                  onEdit={handleOpenEditHalaqa}
                  onDelete={handleDeleteHalaqa}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TEACHERS */}
      {/* ========================================================================= */}
      {activeTab === "teachers" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                إدارة المعلمين والمشرفين
              </h2>
              <p className="text-xs text-slate-500">
                تفعيل الحسابات، تعيين الصلاحيات، وإضافة وحذف المعلمين
              </p>
            </div>
            <Button
              onClick={handleOpenCreateTeacherModal}
              className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl gap-1.5 text-xs font-bold self-start sm:self-auto shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة معلم جديد</span>
            </Button>
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
                {teachers.map((t) => {
                  const isCurrentAdmin = Boolean(currentUserId && t.id === currentUserId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-1.5">
                          <span>{t.full_name}</span>
                          {isCurrentAdmin && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 font-bold border border-amber-300/40">
                              (أنت)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {t.phone || "—"}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black border cursor-default select-none transition-colors ${
                            t.role === "admin"
                              ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-300 shadow-xs"
                              : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {t.role === "admin" ? "مدير مركز 👑" : "معلم حلقة 📖"}
                        </span>
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
                        {isCurrentAdmin ? (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold select-none">
                            الحساب الحالي
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => handleToggleTeacherActive(t.id, t.is_active)}
                              size="sm"
                              variant="ghost"
                              className={`h-7 px-2 text-[11px] font-bold rounded-lg ${
                                t.is_active
                                  ? "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                  : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              }`}
                            >
                              {t.is_active ? "تعطيل" : "تفعيل"}
                            </Button>
                            <Button
                              onClick={() => handleConfirmDeleteTeacher(t)}
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[11px] font-bold rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40"
                              title="حذف المعلم بالكامل"
                            >
                              <Trash2 className="w-3.5 h-3.5 ml-1 text-rose-500" />
                              <span>حذف</span>
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
            <div className="flex flex-wrap items-center gap-2">
              {students.length > 0 && (
                <Button
                  type="button"
                  onClick={() => {
                    setConfirmDeleteText("");
                    setIsDeleteAllModalOpen(true);
                  }}
                  variant="outline"
                  className="border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl gap-1.5 font-bold shadow-xs text-xs"
                  title="حذف ومسح جميع بيانات الطلاب وسجلاتهم نهائياً من المركز"
                >
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>تصفير وحذف جميع الطلاب</span>
                </Button>
              )}
              <Button
                type="button"
                onClick={() => setIsBulkImportOpen(true)}
                variant="outline"
                className="border-burgundy-300 dark:border-burgundy-800 text-burgundy-900 dark:text-burgundy-200 hover:bg-burgundy-50 dark:hover:bg-burgundy-950/60 rounded-xl gap-1.5 font-bold shadow-xs text-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-islamicGold-600" />
                <span>استيراد جماعي (Excel)</span>
              </Button>
              <Link href="/students">
                <Button className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl gap-1.5 text-xs font-bold">
                  <Plus className="w-4 h-4" />
                  <span>إضافة طالب جديد</span>
                </Button>
              </Link>
            </div>
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
              <option value="all">جميع حلقات النادي ({displayedStudents.length} طالب)</option>
              {displayedHalaqat.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.season_name})
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
                  <th className="py-2.5 px-3">الحلقة والنادي</th>
                  <th className="py-2.5 px-3">المعلم</th>
                  <th className="py-2.5 px-3 text-center">إجمالي الإنجاز</th>
                  <th className="py-2.5 px-3 text-center">رابط المتابعة</th>
                  <th className="py-2.5 px-3 text-center">نقل الحلقة</th>
                  <th className="py-2.5 px-3 text-center">حذف نهائي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                {displayedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      لا يوجد طلاب مسجلون في {currentSeasonObj?.name || "هذا النادي"} يطابقون شروط البحث.
                    </td>
                  </tr>
                ) : (
                  displayedStudents.map((s) => (
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
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">
                          {s.halaqa_name}
                        </span>
                        <span className="inline-block text-[10px] text-islamicGold-700 dark:text-islamicGold-400 font-bold mt-0.5">
                          {s.season_name || "النادي الدائم"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {s.teacher_name}
                      </td>
                      <td className="py-3 px-3 text-center text-islamicGold-700 dark:text-islamicGold-400 font-black">
                        {s.total_pages_memorized || 0} ص
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Link
                          href={`/parent/${s.parent_token}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-burgundy-50 hover:bg-burgundy-100 dark:bg-burgundy-950 dark:hover:bg-burgundy-900 text-burgundy-900 dark:text-burgundy-200 text-[11px] font-bold border border-burgundy-200/60 transition-colors"
                        >
                          <span>معاينة البوابة</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Button
                          onClick={() => {
                            setTransferModalStudent(s);
                            setTransferTargetHalaqa(s.group_id || "");
                          }}
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs font-bold text-burgundy-800 dark:text-burgundy-300 hover:bg-burgundy-50 dark:hover:bg-burgundy-950/40 rounded-xl"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 ml-1" />
                          <span>نقل</span>
                        </Button>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Button
                          onClick={() => setStudentToDeletePermanently(s)}
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                          title="حذف الطالب بشكل كامل ونهائي من قاعدة البيانات"
                        >
                          <Trash2 className="w-3.5 h-3.5 ml-1" />
                          <span>حذف</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB: ACTIVITIES & TRIPS (النشاطات والرحلات) */}
      {/* ========================================================================= */}
      {activeTab === "activities" && (
        <ActivitiesManagerTab
          activities={activities}
          halaqat={halaqat}
          onOpenCreate={() => setIsActivityDialogOpen(true)}
          onDelete={handleDeleteActivity}
          isMissingTables={isMissingActivityTables}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REPORTS */}
      {/* ========================================================================= */}
      {activeTab === "reports" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                تقارير المركز المجمعة والتفصيلية
              </h2>
              <p className="text-xs text-slate-500">
                طباعة كشوفات الإنجاز لـ {selectedSeasonId === "all" ? "جميع الأندية" : currentSeasonObj?.name}
              </p>
            </div>
            <Button
              onClick={() => window.print()}
              className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير الحالي</span>
            </Button>
          </div>

          {/* Sub-tabs for reports */}
          <div className="no-print flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <button
              onClick={() => setReportType("center")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                reportType === "center"
                  ? "bg-burgundy-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400"
              }`}
            >
              التقرير العام للمركز
            </button>
            <button
              onClick={() => setReportType("halaqa")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                reportType === "halaqa"
                  ? "bg-burgundy-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400"
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
                  مركز طارق القرآني — التقرير العام ({selectedSeasonId === "all" ? "جميع الأندية والفصول" : currentSeasonObj?.name})
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
                    {displayedOverview.totalStudents}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-xs text-slate-400 block">عدد الحلقات</span>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {displayedOverview.totalHalaqat}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-xs text-slate-400 block">نسبة الحضور</span>
                  <span className="text-xl font-black text-emerald-600">
                    {displayedOverview.attendanceRate}٪
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800">
                  <span className="text-xs text-slate-400 block">الصفحات المنجزة</span>
                  <span className="text-xl font-black text-islamicGold-600">
                    {displayedOverview.totalPagesMemorized} ص
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
                        <th className="p-2.5 border">النادي</th>
                        <th className="p-2.5 border">المعلم المشرف</th>
                        <th className="p-2.5 border text-center">عدد الطلاب</th>
                        <th className="p-2.5 border text-center">نسبة الحضور</th>
                        <th className="p-2.5 border text-center">الصفحات المنجزة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedHalaqat.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-4 text-center text-slate-400">
                            لا توجد حلقات في هذا النادي لعرضها بالتقرير.
                          </td>
                        </tr>
                      ) : (
                        displayedHalaqat.map((h) => (
                          <tr key={h.id} className="border-t font-bold">
                            <td className="p-2.5 border font-black">{h.name}</td>
                            <td className="p-2.5 border text-islamicGold-700">{h.season_name}</td>
                            <td className="p-2.5 border">{h.teacher_name}</td>
                            <td className="p-2.5 border text-center">{h.students_count}</td>
                            <td className="p-2.5 border text-center text-emerald-600">{h.attendance_rate}٪</td>
                            <td className="p-2.5 border text-center text-islamicGold-700">{h.total_pages}</td>
                          </tr>
                        ))
                      )}
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
                  {displayedHalaqat.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.season_name})
                    </option>
                  ))}
                </select>
              </div>

              {(() => {
                const curHalaqa = displayedHalaqat.find((h) => h.id === selectedReportHalaqa) || displayedHalaqat[0];
                const hStudents = displayedStudents.filter((s) => s.group_id === curHalaqa?.id);

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
                  النادي / الفصل التابع له <span className="text-rose-500">*</span>
                </label>
                <select
                  value={halaqaSeasonInput}
                  onChange={(e) => setHalaqaSeasonInput(e.target.value)}
                  className="w-full h-11 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100"
                  required
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_active ? "★ (النشط حالياً)" : ""}
                    </option>
                  ))}
                </select>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border border-islamicGold-400/30 space-y-5 animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-burgundy-50 dark:bg-burgundy-950/60 border border-burgundy-200/50 dark:border-burgundy-800/50 flex items-center justify-center text-burgundy-800 dark:text-burgundy-300">
                <ArrowUpDown className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  نقل الطالب بين الحلقات
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  إسناد الطالب إلى حلقة قرآنية ومعلم جديد
                </p>
              </div>
            </div>

            {/* Current Student Details Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-bold">اسم الطالب:</span>
                <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
                  {transferModalStudent.full_name || transferModalStudent.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-bold">الحلقة الحالية:</span>
                <span className="font-bold text-burgundy-800 dark:text-burgundy-300">
                  {transferModalStudent.halaqa_name || "بدون حلقة"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400 font-bold">المعلم الحالي:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {transferModalStudent.teacher_name || "غير محدد"}
                </span>
              </div>
            </div>

            {/* Target Halaqa Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                اختر الحلقة المستهدفة الجديدة:
              </label>
              <select
                value={transferTargetHalaqa}
                onChange={(e) => setTransferTargetHalaqa(e.target.value)}
                className="w-full h-11 px-3.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-burgundy-800"
              >
                <option value="">بدون حلقة (فك ربط الطالب من أي حلقة)</option>
                {halaqat.map((h) => {
                  const isCurrent = h.id === transferModalStudent.group_id;
                  return (
                    <option key={h.id} value={h.id}>
                      {h.name} - المعلم: {h.teacher_name} {isCurrent ? "★ (الحلقة الحالية)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                onClick={() => setTransferModalStudent(null)}
                variant="ghost"
                className="rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={isSubmittingTransfer || transferTargetHalaqa === (transferModalStudent.group_id || "")}
                className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl text-xs font-bold px-4"
              >
                {isSubmittingTransfer ? "جارٍ حفظ النقل..." : "تأكيد النقل"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RLS / DATABASE SETUP ASSISTANT */}
      {/* ========================================================================= */}
      {transferRlsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-500/40 space-y-4 animate-in zoom-in-95 duration-200" dir="rtl">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  تفعيل صلاحية نقل الطلاب في Supabase
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  مطلوب تنفيذ سياسة الأمان (RLS) مرة واحدة لمنح المدير صلاحية النقل
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              لحماية بيانات الطلاب، تفرض قاعدة البيانات سياسة أمان افتراضية تمنع نقل الطالب لمعلم آخر إلا بعد تفعيل صلاحيات إدارة المركز. انسخ الكود التالي وشغّله في محرر SQL في Supabase:
            </p>

            <div className="relative">
              <pre className="p-3.5 bg-slate-900 text-slate-200 text-2xs rounded-2xl overflow-x-auto max-h-48 font-mono border border-slate-800 text-left" dir="ltr">
                {TRANSFER_RLS_MIGRATION_SQL}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(TRANSFER_RLS_MIGRATION_SQL);
                  setCopiedTransferSql(true);
                  showToast("تم نسخ كود SQL بنجاح!");
                  setTimeout(() => setCopiedTransferSql(false), 3000);
                }}
                className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-burgundy-900 hover:bg-burgundy-800 text-white text-xs font-bold shadow-md transition-all active:scale-95"
              >
                {copiedTransferSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ كود SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={SUPABASE_SQL_EDITOR_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-burgundy-800 dark:text-burgundy-300 hover:underline"
              >
                <span>فتح محرر SQL في Supabase</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <Button
                type="button"
                onClick={() => setTransferRlsModalOpen(false)}
                variant="ghost"
                className="rounded-xl text-xs font-bold"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PERMANENT DELETE STUDENT (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {studentToDeletePermanently && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-rose-300/40 dark:border-rose-900/50 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            dir="rtl"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50 dark:border-rose-800/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  حذف الطالب نهائياً من المركز
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                  تحذير: هذا الإجراء دائم ولا يمكن التراجع عنه
                </p>
              </div>
            </div>

            <div className="bg-rose-50/60 dark:bg-rose-950/30 rounded-2xl p-4 border border-rose-200/60 dark:border-rose-900/40 space-y-2 text-xs">
              <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                هل أنت متأكد من رغبتك في حذف الطالب التالي بشكل كامل من النظام وقاعدة البيانات؟
              </p>
              <div className="pt-1.5 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">اسم الطالب:</span>
                  <span className="font-black text-rose-700 dark:text-rose-300 text-sm">
                    {studentToDeletePermanently.full_name || studentToDeletePermanently.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">الحلقة:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {studentToDeletePermanently.halaqa_name || "بدون حلقة"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold">المعلم المشرف:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {studentToDeletePermanently.teacher_name || "غير محدد"}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/60 dark:border-amber-800/40 text-2xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
              ⚠️ <strong>تنبيه إداري:</strong> سيتم حذف كافة سجلات التسميع واليوميات وسجلات الحضور والغياب وردود الأنشطة المرتبطة بالطالب بشكل نهائي من قاعدة البيانات.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                onClick={() => setStudentToDeletePermanently(null)}
                variant="ghost"
                disabled={isDeletingStudentPermanently}
                className="rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleExecutePermanentDeleteStudent}
                disabled={isDeletingStudentPermanently}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold px-4"
              >
                {isDeletingStudentPermanently ? "جارٍ الحذف نهائياً..." : "تأكيد الحذف نهائياً"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BULK DELETE ALL STUDENTS (ADMIN ONLY) */}
      {/* ========================================================================= */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-rose-400 dark:border-rose-900/60 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            dir="rtl"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-700 dark:text-rose-400">
                  تصفير وحذف جميع الطلاب نهائياً
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  مسح شامل لكافة بيانات الطلاب في المركز
                </p>
              </div>
            </div>

            <div className="bg-rose-50/70 dark:bg-rose-950/40 rounded-2xl p-4 border border-rose-200/80 dark:border-rose-900/50 space-y-2.5 text-xs">
              <p className="text-slate-800 dark:text-slate-200 font-black leading-relaxed text-sm">
                هل أنت متأكد تماماً من رغبتك في حذف جميع طلاب المركز ({students.length} طالب)؟
              </p>
              <p className="text-rose-700 dark:text-rose-300 font-bold leading-normal">
                سيؤدي هذا الإجراء إلى مسح دائم وتصفير شامل لكافة:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 font-medium text-2xs">
                <li>سجلات الطلاب وبيانات أولياء الأمور كاملة.</li>
                <li>جميع سجلات الحفظ والتسميع والصفحات المنجزة.</li>
                <li>كافة سجلات الحضور والغياب اليومية.</li>
                <li>ردود وتصويتات أولياء الأمور على كافة الأنشطة والرحلات.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                لتأكيد العملية، يرجى كتابة كلمة <span className="text-rose-600 font-black">"حذف الكل"</span> أدناه:
              </label>
              <Input
                type="text"
                placeholder='اكتب: حذف الكل'
                value={confirmDeleteText}
                onChange={(e) => setConfirmDeleteText(e.target.value)}
                className="h-10 text-xs font-bold border-rose-300 dark:border-rose-900 text-center"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                onClick={() => {
                  setIsDeleteAllModalOpen(false);
                  setConfirmDeleteText("");
                }}
                variant="ghost"
                disabled={isDeletingAllStudents}
                className="rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                onClick={handleExecuteDeleteAllStudents}
                disabled={isDeletingAllStudents || confirmDeleteText.trim() !== "حذف الكل"}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold px-4 shadow-md disabled:opacity-50"
              >
                {isDeletingAllStudents ? "جارٍ التصفير والحذف..." : "تأكيد مسح جميع الطلاب"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE TEACHER */}
      {/* ========================================================================= */}
      {isCreateTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-islamicGold-400/30 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-burgundy-50 dark:bg-burgundy-950/80 border border-islamicGold-400/30 flex items-center justify-center text-burgundy-900 dark:text-burgundy-300">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    إضافة معلم جديد للمركز
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    إنشاء حساب جديد في النظام وتعيينه بالدور &apos;معلم&apos;
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !isSubmittingTeacher && setIsCreateTeacherModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg"
              >
                ✕
              </button>
            </div>

            {teacherFormError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold">
                {teacherFormError}
              </div>
            )}

            <form onSubmit={handleExecuteCreateTeacher} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  الاسم الرباعي للمعلم <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="مثال: أحمد محمد علي القضاة"
                  value={teacherFullName}
                  onChange={(e) => setTeacherFullName(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold"
                  required
                  disabled={isSubmittingTeacher}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  البريد الإلكتروني <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="teacher@tareq-center.com"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold"
                  dir="ltr"
                  required
                  disabled={isSubmittingTeacher}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  كلمة المرور <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold pr-3 pl-10"
                    dir="ltr"
                    required
                    disabled={isSubmittingTeacher}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">لا تقل عن 6 خانات</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  رقم الهاتف (اختياري)
                </label>
                <Input
                  type="tel"
                  placeholder="0791234567"
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  className="rounded-xl border-slate-200 dark:border-slate-800 text-xs font-bold"
                  dir="ltr"
                  disabled={isSubmittingTeacher}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateTeacherModalOpen(false)}
                  className="rounded-xl text-xs font-bold"
                  disabled={isSubmittingTeacher}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingTeacher}
                  className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  {isSubmittingTeacher ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري الإضافة...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>إضافة المعلم</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRM DELETE TEACHER */}
      {/* ========================================================================= */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full border border-rose-200 dark:border-rose-900/50 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            dir="rtl"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  تأكيد حذف المعلم
                </h3>
                <p className="text-xs text-slate-500 font-bold">
                  {teacherToDelete.full_name}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs leading-relaxed font-bold">
              هل أنت متأكد من حذف المعلم؟ سيتم فك ارتباطه بالحلقات تلقائياً وحذف حسابه بالكامل من النظام.
            </div>

            {teacherToDelete.halaqat && teacherToDelete.halaqat.length > 0 && (
              <div className="text-[11px] text-slate-500 space-y-1">
                <span className="font-bold block">الحلقات التي سيتم فك ارتباطها:</span>
                <div className="flex flex-wrap gap-1">
                  {teacherToDelete.halaqat.map((h) => (
                    <span
                      key={h.id}
                      className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                    >
                      {h.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => !isDeletingTeacher && setTeacherToDelete(null)}
                className="rounded-xl text-xs font-bold"
                disabled={isDeletingTeacher}
              >
                تراجع
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteDeleteTeacher}
                disabled={isDeletingTeacher}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold gap-1.5"
              >
                {isDeletingTeacher ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد الحذف</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BULK STUDENT IMPORT DIALOG (LAZY LOADED) */}
      {/* ========================================================================= */}
      {isBulkImportOpen && (
        <BulkStudentImportDialog
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          halaqat={halaqat}
          selectedSeasonId={selectedSeasonId}
          onSuccess={(newStudents) => {
            setStudents((prev) => [
              ...newStudents.map((ns) => {
                const hObj = halaqat.find((h) => h.id === ns.group_id);
                return {
                  id: ns.id,
                  name: ns.name,
                  full_name: ns.name,
                  parent_phone: ns.parent_phone,
                  parent_token: ns.parent_token,
                  created_at: new Date().toISOString(),
                  season_id: hObj?.season_id,
                  season_name: hObj?.season_name,
                  halaqa_name: hObj?.name || "الحلقة",
                  teacher_name: hObj?.teacher_name || "غير معين",
                } as any;
              }),
              ...prev,
            ]);
            showToast(`تم استيراد ${newStudents.length} طالب بنجاح 🎉`);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* ACTIVITY & TRIP CREATION DIALOG */}
      {/* ========================================================================= */}
      {isActivityDialogOpen && (
        <ActivityDialog
          isOpen={isActivityDialogOpen}
          onClose={() => setIsActivityDialogOpen(false)}
          onSubmit={handleCreateActivity}
          halaqat={halaqat}
        />
      )}

      {/* ========================================================================= */}
      {/* ADMIN ACCOUNT SETTINGS DIALOG (SETTINGS MODAL) */}
      {/* ========================================================================= */}
      {isSettingsOpen && (
        <AdminAccountSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentUser={currentUser}
          onProfileUpdated={(updated) => {
            setCurrentUser((prev) =>
              prev
                ? {
                    ...prev,
                    fullName: updated.fullName,
                    phone: updated.phone,
                    email: updated.email || prev.email,
                  }
                : undefined
            );
            showToast("تم حفظ إعدادات الحساب بنجاح ✨");
          }}
        />
      )}
    </div>
  );
}
