"use client";

import { useState } from "react";
import Link from "next/link";
import { StudentTrackData } from "@/types";
import { MosqueLogo } from "@/components/common/MosqueLogo";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  BookOpen,
  CalendarCheck,
  Award,
  MessageCircle,
  Share2,
  CheckCircle2,
  AlertCircle,
  User,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PublicTrackCardProps {
  data: StudentTrackData;
}

export function PublicTrackCard({ data }: PublicTrackCardProps) {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const {
    student,
    halaqa,
    teacher,
    attendanceRate,
    presentDays,
    totalDays,
    latestHifz,
    latestRevision,
    todayEvaluation,
    teacherNotes,
    recentLogs,
    recentAttendance,
  } = data;

  if (!student) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xl text-center space-y-4">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
          لم يتم العثور على بيانات الطالب
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {data.error || "تأكد من صحة الرابط أو الرمز المدخل والمحاولة مرة أخرى."}
        </p>
        <Link href="/">
          <Button className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl">
            العودة للرئيسية
          </Button>
        </Link>
      </div>
    );
  }

  // Generate WhatsApp Share Message
  const shareText = `السلام عليكم ورحمة الله وبركاته 🌸%0A%0A*تقرير إنجاز الطالب في مركز طارق القرآني:*%0A👤 *الطالب:* ${student.full_name}%0A🕌 *الحلقة:* ${halaqa?.name || "مركز طارق القرآني"}%0A👨‍🏫 *المعلم:* ${teacher?.full_name || "معلم الحلقة"}%0A%0A📊 *نسبة الحضور:* ${attendanceRate}٪ (${presentDays} من ${totalDays} يوم)%0A%0A📖 *آخر حفظ جديد:* ${
    latestHifz
      ? `${latestHifz.surah_start} (${latestHifz.aya_start}-${latestHifz.aya_end}) - تقييم: ${latestHifz.grade}`
      : "لا يوجد بعد"
  }%0A%0A🔄 *آخر مراجعة:* ${
    latestRevision
      ? `${latestRevision.surah_start} (${latestRevision.aya_start}-${latestRevision.aya_end}) - تقييم: ${latestRevision.grade}`
      : "لا يوجد بعد"
  }%0A%0A⭐ *تقييم اليوم:* ${todayEvaluation ? `${todayEvaluation.grade}` : "لم يرصد اليوم"}%0A${
    teacherNotes ? `📝 *ملاحظات المعلم:* ${teacherNotes}%0A` : ""
  }%0A🔗 *رابط المتابعة المباشر:*%0A${typeof window !== "undefined" ? window.location.href : ""}`;

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "ممتاز":
        return "bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700";
      case "جيد_جدا":
      case "جيد جداً":
        return "bg-sky-100 dark:bg-sky-950/80 text-sky-900 dark:text-sky-300 border-sky-300 dark:border-sky-700";
      case "جيد":
        return "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700";
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Center Identity Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-islamicGold-500/40">
        <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1.5px,transparent_1.5px)] [background-size:20px_20px] opacity-15 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-right">
          {/* Logo */}
          <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl shadow-lg border border-islamicGold-400/50 shrink-0">
            <MosqueLogo variant="badge" size="lg" className="w-16 h-16 sm:w-20 sm:h-20" alt="مركز طارق القرآني" />
          </div>

          {/* Titles & Student Name */}
          <div className="flex-1 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-burgundy-800/80 border border-islamicGold-400/40 text-islamicGold-300 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5 text-islamicGold-400" />
              <span>بطاقة إنجاز ومتابعة الطالب القرآني</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {student.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-burgundy-200 font-medium">
              مركز طارق القرآني • جمعية المحافظة على القرآن الكريم
            </p>
          </div>
        </div>

        {/* Quick Meta Grid */}
        <div className="mt-6 pt-5 border-t border-burgundy-800/60 grid grid-cols-2 sm:grid-cols-3 gap-3 text-right">
          <div className="bg-white/10 dark:bg-black/20 rounded-xl p-2.5 backdrop-blur-xs">
            <span className="text-[11px] text-islamicGold-300 block font-bold">الحلقة القرآنية</span>
            <span className="text-xs sm:text-sm font-black text-white">
              {halaqa?.name || "حلقة مركز طارق"}
            </span>
          </div>

          <div className="bg-white/10 dark:bg-black/20 rounded-xl p-2.5 backdrop-blur-xs">
            <span className="text-[11px] text-islamicGold-300 block font-bold">معلم الحلقة</span>
            <span className="text-xs sm:text-sm font-black text-white">
              {teacher?.full_name || "معلم الحلقة"}
            </span>
          </div>

          <div className="bg-white/10 dark:bg-black/20 rounded-xl p-2.5 backdrop-blur-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] text-islamicGold-300 block font-bold">نسبة الحضور والالتزام</span>
            <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1">
              <span>{attendanceRate}٪</span>
              <span className="text-[10px] text-burgundy-200 font-normal">
                ({presentDays}/{totalDays} يوم)
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: WhatsApp Share & Copy Link */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        <a
          href={`https://api.whatsapp.com/send?text=${shareText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-[200px]"
        >
          <Button className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl gap-2 shadow-md hover:shadow-lg transition-all">
            <Share2 className="w-5 h-5 text-emerald-200" />
            <span>مشاركة الإنجاز عبر واتساب</span>
          </Button>
        </a>

        <Button
          onClick={handleCopyLink}
          variant="outline"
          className="h-12 px-5 border-burgundy-800/30 dark:border-burgundy-600/30 text-burgundy-900 dark:text-burgundy-200 hover:bg-burgundy-50 font-bold rounded-2xl gap-2"
        >
          {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <MessageCircle className="w-4 h-4 text-islamicGold-600" />}
          <span>{copied ? "تم نسخ الرابط بنجاح!" : "نسخ الرابط"}</span>
        </Button>

        <Button
          onClick={() => window.print()}
          variant="ghost"
          className="h-12 px-4 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-2xl gap-1.5"
          title="طباعة التقرير"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:inline">طباعة</span>
        </Button>
      </div>

      {/* Today's Evaluation & Note Banner */}
      {todayEvaluation && (
        <div className="bg-gradient-to-r from-islamicGold-50 via-white to-islamicGold-50 dark:from-islamicGold-950/40 dark:via-slate-900 dark:to-islamicGold-950/40 border-2 border-islamicGold-400/60 rounded-3xl p-5 sm:p-6 shadow-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-islamicGold-100 dark:bg-islamicGold-900/50 text-islamicGold-800 dark:text-islamicGold-300">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-islamicGold-700 dark:text-islamicGold-400 block">
                تقييم اليوم
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-slate-50">
                تقييم التسميع: {todayEvaluation.grade} ⭐
              </span>
            </div>
          </div>
          {todayEvaluation.notes && (
            <p className="text-sm text-slate-700 dark:text-slate-300 mt-2 bg-white/70 dark:bg-slate-800/70 p-3 rounded-xl border border-islamicGold-200 dark:border-islamicGold-800">
              {todayEvaluation.notes}
            </p>
          )}
        </div>
      )}

      {/* Main Progress Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Latest Memorization (جديد) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-burgundy-50 dark:bg-burgundy-950 text-burgundy-800 dark:text-burgundy-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  آخر حفظ جديد
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  المقرر الجديد
                </span>
              </div>
            </div>
            {latestHifz && (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getGradeBadge(latestHifz.grade)}`}>
                {latestHifz.grade}
              </span>
            )}
          </div>

          {latestHifz ? (
            <div className="space-y-2 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-base font-black text-burgundy-900 dark:text-burgundy-300">
                  سورة {latestHifz.surah_start}
                </p>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                  من آية {latestHifz.aya_start} إلى آية {latestHifz.aya_end}
                </p>
                {latestHifz.page_count && Number(latestHifz.page_count) > 0 && (
                  <p className="text-[11px] font-medium text-islamicGold-700 dark:text-islamicGold-400 mt-1">
                    (إجمالي: {latestHifz.page_count} صفحة)
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>تاريخ التسميع: {latestHifz.date?.split("T")[0] || "مؤخراً"}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              لم يُسجل حفظ جديد للطالب حتى الآن
            </div>
          )}
        </div>

        {/* Latest Revision (مراجعة) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-islamicGold-50 dark:bg-islamicGold-950 text-islamicGold-800 dark:text-islamicGold-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  آخر مراجعة
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  التثبيت والمراجعة
                </span>
              </div>
            </div>
            {latestRevision && (
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${getGradeBadge(latestRevision.grade)}`}>
                {latestRevision.grade}
              </span>
            )}
          </div>

          {latestRevision ? (
            <div className="space-y-2 pt-1">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-base font-black text-islamicGold-800 dark:text-islamicGold-300">
                  سورة {latestRevision.surah_start}
                </p>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                  من آية {latestRevision.aya_start} إلى آية {latestRevision.aya_end}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                <span>تاريخ المراجعة: {latestRevision.date?.split("T")[0] || "مؤخراً"}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400">
              لم تُسجل مراجعة للطالب حتى الآن
            </div>
          )}
        </div>
      </div>

      {/* Teacher's General Notes */}
      {teacherNotes && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-burgundy-700 dark:text-burgundy-400" />
            <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
              ملاحظة وتوجيه معلم الحلقة
            </h3>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 bg-burgundy-50/50 dark:bg-burgundy-950/30 p-4 rounded-2xl border border-burgundy-100 dark:border-burgundy-900/50 leading-relaxed font-medium">
            "{teacherNotes}"
          </p>
        </div>
      )}

      {/* Expandable Recitation & Attendance History */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between text-right font-black text-sm text-slate-800 dark:text-slate-100 py-1"
        >
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-burgundy-800 dark:text-burgundy-400" />
            <span>سجل التسميع والحضور الأخير ({recentLogs?.length || 0} تسجيلات)</span>
          </div>
          {showHistory ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {showHistory && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 max-h-72 overflow-y-auto">
            {recentLogs && recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      سورة {log.surah_start} ({log.aya_start}-{log.aya_end})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {log.log_type} • {log.date?.split("T")[0]}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-black text-[10px] border ${getGradeBadge(log.grade)}`}>
                    {log.grade}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-center text-slate-400 py-4">لا توجد سجلات سابقة</p>
            )}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4 pb-8 space-y-1">
        <p className="font-bold">مركز طارق القرآني — نظام متابع الحفظ الإلكتروني</p>
        <p className="text-[11px]">نسأل الله أن يجعل القرآن الكريم ربيع قلوبنا ونور صدورنا</p>
      </div>
    </div>
  );
}
