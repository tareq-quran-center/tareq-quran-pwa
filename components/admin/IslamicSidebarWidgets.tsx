"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { StudentRow, HalaqaWithDetails } from "@/types";
import {
  Trophy,
  Crown,
  BookOpen,
  Award,
  Users,
  CheckCircle2,
  ExternalLink,
  Facebook,
  Sparkles,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { lightHaptic } from "@/lib/haptics";

interface IslamicSidebarWidgetsProps {
  students?: Array<
    StudentRow & {
      halaqa_name?: string;
      teacher_name?: string;
      total_pages_memorized?: number;
      total_pages_count?: number;
    }
  >;
  halaqat?: HalaqaWithDetails[];
  totalStudents?: number;
  totalHalaqat?: number;
  totalTeachers?: number;
  attendanceRate?: number;
  totalPages?: number;
}

export function IslamicSidebarWidgets({
  students = [],
  halaqat = [],
  totalStudents = 0,
  totalHalaqat = 0,
  totalTeachers = 0,
  attendanceRate = 100,
  totalPages = 0,
}: IslamicSidebarWidgetsProps) {
  const [currentStarIndex, setCurrentStarIndex] = useState(0);

  // Compute star student per halaqa
  const starsByHalaqa = useMemo(() => {
    if (!halaqat || halaqat.length === 0) {
      if (!students || students.length === 0) return [];
      return [
        {
          halaqaId: "default",
          halaqaName: students[0].halaqa_name || "الحلقة القرآنية",
          teacherName: students[0].teacher_name || null,
          student: students[0],
          pages: Number(students[0].total_pages_memorized || (students[0] as any).total_pages_count || 0),
        },
      ];
    }

    const list = halaqat
      .map((h) => {
        const hStudents = students.filter((s) => s.group_id === h.id);
        if (hStudents.length === 0) return null;

        const sorted = [...hStudents].sort((a, b) => {
          const pagesA = Number(a.total_pages_memorized || (a as any).total_pages_count || 0);
          const pagesB = Number(b.total_pages_memorized || (b as any).total_pages_count || 0);
          return pagesB - pagesA;
        });

        return {
          halaqaId: h.id,
          halaqaName: h.name,
          teacherName: h.teacher_name,
          student: sorted[0],
          pages: Number(sorted[0].total_pages_memorized || (sorted[0] as any).total_pages_count || 0),
        };
      })
      .filter(Boolean) as Array<{
      halaqaId: string;
      halaqaName: string;
      teacherName: string | null;
      student: any;
      pages: number;
    }>;

    return list;
  }, [halaqat, students]);

  const activeStar = starsByHalaqa[currentStarIndex] || starsByHalaqa[0] || null;

  const handleNext = () => {
    lightHaptic();
    setCurrentStarIndex((prev) => (prev + 1) % starsByHalaqa.length);
  };

  const handlePrev = () => {
    lightHaptic();
    setCurrentStarIndex((prev) => (prev - 1 + starsByHalaqa.length) % starsByHalaqa.length);
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* WIDGET 1: فرسان الحلقات • لوحة الشرف (متميز لكل حلقة) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-amber-100/70 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40 border-2 border-amber-300/80 dark:border-amber-700/60 p-5 shadow-sm text-center">
        {/* Decorative Islamic Ribbon Header */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-islamicGold-600 text-burgundy-950 font-black text-xs shadow-xs mb-2">
          <Crown className="w-3.5 h-3.5" />
          <span>لوحة الشرف • فرسان الحلقات</span>
        </div>

        {/* Crown & Star Icon with Golden Glow */}
        <div className="relative mx-auto my-2 w-16 h-16 rounded-2xl bg-gradient-to-tr from-islamicGold-600 via-amber-400 to-amber-200 p-0.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full rounded-[14px] bg-burgundy-950 flex items-center justify-center text-amber-300">
            <Trophy className="w-8 h-8 text-islamicGold-400 drop-shadow-md animate-pulse" />
          </div>
        </div>

        {activeStar ? (
          <div className="space-y-1.5 mt-2 animate-in fade-in duration-200" key={activeStar.halaqaId}>
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-burgundy-50 dark:bg-burgundy-950/80 text-burgundy-900 dark:text-islamicGold-300 text-[11px] font-black border border-burgundy-200/50">
              حلقة: {activeStar.halaqaName}
            </span>

            <h4 className="text-base font-black text-slate-900 dark:text-white">
              {activeStar.student.full_name || activeStar.student.name}
            </h4>

            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {activeStar.pages > 0
                ? `أنجز حفظ وتسميع ${activeStar.pages} صفحة مباركة`
                : "فارس واعد ومتميز في التسميع والأدب"}
            </p>

            {/* Halaqa Navigator when multiple groups exist */}
            {starsByHalaqa.length > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
                  title="الحلقة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-bold text-slate-500">
                  {currentStarIndex + 1} من {starsByHalaqa.length} حلقة
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
                  title="الحلقة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1 mt-2">
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              فرسان القرآن الكريم
            </h4>
            <p className="text-xs text-slate-500">
              تنافس شريف في حفظ وإتقان كتاب الله تعالى
            </p>
          </div>
        )}

        <div className="mt-3.5 pt-2.5 border-t border-amber-200/70 dark:border-slate-800 text-[11px] text-amber-800 dark:text-amber-300 font-bold flex items-center justify-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>«خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET 2: المصحف الشريف والقرآن الكريم */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white p-5 border-2 border-islamicGold-400/50 shadow-md">
        <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:12px_12px] opacity-15 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-islamicGold-400/20 border border-islamicGold-400/40 flex items-center justify-center text-islamicGold-300 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white">المصحف الشريف والتلاوات</h4>
            <p className="text-[11px] text-burgundy-100 mt-0.5">
              متابعة التسميع، الآيات، وتقييم الحفظ اليومي
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-islamicGold-300 font-bold">
            {totalPages} صفحة مسجلة
          </span>
          <Link href="/quran">
            <Button
              variant="outline"
              size="sm"
              className="bg-islamicGold-500/20 hover:bg-islamicGold-500/30 text-islamicGold-300 border-islamicGold-400/40 text-xs font-bold rounded-xl h-7 px-2.5 gap-1"
            >
              <span>فتح المصحف</span>
              <ArrowUpRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET 3: الإحصاءات السريعة للمركز */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
            مؤشرات مجمع الحلقات
          </span>
          <span className="text-[10px] text-slate-400 font-bold">تحديث آني</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="p-2.5 rounded-2xl bg-amber-50/60 dark:bg-slate-800 border border-amber-200/50 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">طلاب المجمع</span>
            <span className="text-lg font-black text-burgundy-900 dark:text-islamicGold-300 block mt-0.5">
              {totalStudents}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-50/60 dark:bg-slate-800 border border-amber-200/50 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">الحلقات النشطة</span>
            <span className="text-lg font-black text-burgundy-900 dark:text-islamicGold-300 block mt-0.5">
              {totalHalaqat}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-amber-50/60 dark:bg-slate-800 border border-amber-200/50 dark:border-slate-700">
            <span className="text-[10px] text-slate-500 block">الكادر المشرف</span>
            <span className="text-lg font-black text-burgundy-900 dark:text-islamicGold-300 block mt-0.5">
              {totalTeachers}
            </span>
          </div>

          <div className="p-2.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">نسبة الحضور</span>
            <span className="text-lg font-black text-emerald-800 dark:text-emerald-200 block mt-0.5">
              {attendanceRate}٪
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET 4: تواصل وإشراف مجمع المركز */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-3xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center space-y-2">
        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 block">
          مركز طارق القرآني
        </span>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
          نظام المتابعة والإشراف الإداري والتربوي لحلقات القرآن الكريم
        </p>
      </div>
    </div>
  );
}
