"use client";

import React, { useMemo } from "react";
import { HalaqaWithDetails, StudentRow } from "@/types";
import {
  Trophy,
  Crown,
  Sparkles,
  BookOpen,
  Award,
  Users,
  ChevronLeft,
} from "lucide-react";

interface HalaqatHonorBoardProps {
  halaqat: HalaqaWithDetails[];
  students: Array<
    StudentRow & {
      halaqa_name?: string;
      teacher_name?: string;
      season_id?: string;
      season_name?: string;
      total_pages_memorized?: number;
      total_pages_count?: number;
    }
  >;
  onSelectStudent?: (studentId: string) => void;
}

interface StarStudentPerHalaqa {
  halaqa: HalaqaWithDetails;
  starStudent: (StudentRow & {
    halaqa_name?: string;
    teacher_name?: string;
    season_id?: string;
    season_name?: string;
    total_pages_memorized?: number;
  }) | null;
  totalStudentsInHalaqa: number;
}

export function HalaqatHonorBoard({
  halaqat = [],
  students = [],
  onSelectStudent,
}: HalaqatHonorBoardProps) {
  // Compute star student for each halaqa
  const starsByHalaqa: StarStudentPerHalaqa[] = useMemo(() => {
    return halaqat.map((halaqa) => {
      // Students belonging to this halaqa
      const halaqaStudents = students.filter(
        (s) => s.group_id === halaqa.id
      );

      if (halaqaStudents.length === 0) {
        return {
          halaqa,
          starStudent: null,
          totalStudentsInHalaqa: 0,
        };
      }

      // Sort students by total pages memorized descending
      const sorted = [...halaqaStudents].sort((a, b) => {
        const pagesA = Number(a.total_pages_memorized || (a as any).total_pages_count || 0);
        const pagesB = Number(b.total_pages_memorized || (b as any).total_pages_count || 0);
        if (pagesB !== pagesA) return pagesB - pagesA;
        return (a.name || a.full_name || "").localeCompare(b.name || b.full_name || "", "ar");
      });

      return {
        halaqa,
        starStudent: sorted[0],
        totalStudentsInHalaqa: halaqaStudents.length,
      };
    });
  }, [halaqat, students]);

  if (halaqat.length === 0) return null;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Honor Board Royal Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white p-5 sm:p-6 border-2 border-islamicGold-400/50 shadow-xl">
        {/* Subtle Islamic Geometrical Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-islamicGold-600 via-amber-400 to-amber-200 p-0.5 shadow-lg flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-[14px] bg-burgundy-950 flex items-center justify-center text-islamicGold-300">
                <Crown className="w-6 h-6 text-islamicGold-400 animate-pulse" />
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-islamicGold-400/20 text-islamicGold-300 text-[10px] font-black mb-1 border border-islamicGold-400/30">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>لوحة الشرف والتميز القرآني</span>
                <span>🏆</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>فرسان الحلقات المتميزون</span>
              </h2>
              <p className="text-xs text-burgundy-100/90 mt-0.5">
                تكريم الطالب الأكثر إنجازاً والتزاماً في كل حلقة قرآنية بمركز طارق القرآني
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 text-center">
              <span className="text-[10px] text-amber-300 block font-bold">إجمالي الحلقات</span>
              <span className="text-lg font-black text-white">{halaqat.length} حلقة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid: Star Student per Halaqa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {starsByHalaqa.map(({ halaqa, starStudent, totalStudentsInHalaqa }, index) => {
          const pagesMemorized = Number(
            starStudent?.total_pages_memorized || (starStudent as any)?.total_pages_count || 0
          );
          const studentName = starStudent?.name || starStudent?.full_name || "طالب متميز";

          return (
            <div
              key={halaqa.id}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50/80 via-white to-amber-100/40 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/20 border-2 border-amber-300/80 dark:border-amber-700/60 p-5 shadow-sm hover:shadow-xl hover:border-islamicGold-500 transition-all duration-300 flex flex-col justify-between group"
            >
              {/* Corner Golden Flourish Ribbon */}
              <div className="absolute top-0 left-0 bg-gradient-to-r from-amber-500 to-islamicGold-600 text-burgundy-950 text-[10px] font-black px-3 py-1 rounded-br-2xl shadow-xs flex items-center gap-1">
                <span>فارس الحلقة</span>
                <Crown className="w-3 h-3" />
              </div>

              <div>
                {/* Halaqa Header */}
                <div className="mb-3.5 pr-2 pt-1">
                  <span className="text-[11px] font-black text-islamicGold-700 dark:text-islamicGold-400 block mb-0.5">
                    حلقة: {halaqa.name}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                    المعلم المشرف: {halaqa.teacher_name || "غير محدد"}
                  </span>
                </div>

                {/* Star Student Showcase Card */}
                {starStudent ? (
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700 shadow-2xs group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                    {/* Crown Medallion Avatar */}
                    <div className="relative shrink-0 w-13 h-13 rounded-2xl bg-gradient-to-tr from-islamicGold-600 via-amber-400 to-amber-200 p-0.5 shadow-md flex items-center justify-center">
                      <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-burgundy-950 to-burgundy-900 flex items-center justify-center text-amber-300 relative overflow-hidden">
                        <Trophy className="w-6 h-6 text-islamicGold-300 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-burgundy-950 flex items-center justify-center shadow-xs">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">
                        {studentName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                          <BookOpen className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                          <span>{pagesMemorized > 0 ? `${pagesMemorized} صفحة` : "مسار الحفظ"}</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          <Award className="w-3 h-3" />
                          <span>الأول على الحلقة</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                    <Users className="w-6 h-6 mx-auto mb-1 text-slate-400 opacity-60" />
                    <span>بانتظار تسجيل طلاب وتسميع في هذه الحلقة</span>
                  </div>
                )}
              </div>

              {/* Card Footer: Summary & Action */}
              <div className="mt-3.5 pt-2.5 border-t border-amber-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  إجمالي طلاب الحلقة: <strong className="text-slate-800 dark:text-slate-200 font-bold">{totalStudentsInHalaqa}</strong>
                </span>

                {starStudent && onSelectStudent && (
                  <button
                    type="button"
                    onClick={() => onSelectStudent(starStudent.id)}
                    className="text-[11px] font-bold text-burgundy-900 dark:text-islamicGold-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>سجل الطالب</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
