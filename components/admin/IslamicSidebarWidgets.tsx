"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { StudentRow } from "@/types";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface IslamicSidebarWidgetsProps {
  students?: Array<
    StudentRow & {
      halaqa_name?: string;
      teacher_name?: string;
    }
  >;
  totalStudents?: number;
  totalHalaqat?: number;
  totalTeachers?: number;
  attendanceRate?: number;
  totalPages?: number;
}

export function IslamicSidebarWidgets({
  students = [],
  totalStudents = 0,
  totalHalaqat = 0,
  totalTeachers = 0,
  attendanceRate = 100,
  totalPages = 0,
}: IslamicSidebarWidgetsProps) {
  // Find or choose an exemplary student (first student or one with highest logs/presence)
  const starStudent = useMemo(() => {
    if (!students || students.length === 0) return null;
    return students[0];
  }, [students]);

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* WIDGET 1: الطالب المثالي (مستوحى مباشرة من بنر الطالب المثالي في الصورة) */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-amber-100/70 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950/40 border-2 border-amber-300/80 dark:border-amber-700/60 p-5 shadow-sm text-center">
        {/* Decorative Islamic Ribbon Header */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-islamicGold-600 text-burgundy-950 font-black text-xs shadow-xs mb-3">
          <Crown className="w-3.5 h-3.5" />
          <span>لوحة الشرف • الطالب المتميز</span>
        </div>

        {/* Crown & Star Icon with Golden Glow */}
        <div className="relative mx-auto my-2 w-16 h-16 rounded-2xl bg-gradient-to-tr from-islamicGold-600 via-amber-400 to-amber-200 p-0.5 shadow-md flex items-center justify-center">
          <div className="w-full h-full rounded-[14px] bg-burgundy-950 flex items-center justify-center text-amber-300">
            <Trophy className="w-8 h-8 text-islamicGold-400 drop-shadow-md animate-pulse" />
          </div>
        </div>

        {starStudent ? (
          <div className="space-y-1.5 mt-2">
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              {starStudent.full_name || starStudent.name}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              قدوة في الحفظ والالتزام والأدب القرآني
            </p>
            {starStudent.halaqa_name && (
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-burgundy-50 dark:bg-burgundy-950/80 text-burgundy-900 dark:text-islamicGold-300 text-[10px] font-bold border border-burgundy-200/50">
                حلقة: {starStudent.halaqa_name}
              </span>
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
      {/* WIDGET 2: المصحف الشريف والقرآن الكريم (مستوحى من بطاقة القرآن الكريم) */}
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
              size="sm"
              className="h-8 bg-islamicGold-500 hover:bg-islamicGold-600 text-burgundy-950 text-xs font-black rounded-xl px-3 gap-1 shadow-xs"
            >
              <span>فتح المصحف</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET 3: إحصائيات وزوار الصرح (مستوحى من عداد زوار الموقع في الصورة) */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
              إحصائيات الصرح الإجمالية
            </h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            محدث آنياً
          </span>
        </div>

        {/* Counter Display (ستايل العداد التقليدي بشكل أنيق ومذهب) */}
        <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-slate-950 border border-amber-200/60 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-burgundy-800 dark:text-islamicGold-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              إجمالي الطلاب المسجلين
            </span>
          </div>
          {/* Digits Counter Box */}
          <div className="flex items-center gap-1 font-mono">
            {String(totalStudents)
              .padStart(3, "0")
              .split("")
              .map((digit, idx) => (
                <span
                  key={idx}
                  className="w-6 h-7 rounded-lg bg-burgundy-950 text-islamicGold-300 text-sm font-black flex items-center justify-center border border-islamicGold-400/40 shadow-xs"
                >
                  {digit}
                </span>
              ))}
          </div>
        </div>

        {/* Mini stats list */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-right">
            <span className="text-[10px] text-slate-400 block font-medium">الحلقات النشطة</span>
            <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
              {totalHalaqat} حلقة
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-right">
            <span className="text-[10px] text-slate-400 block font-medium">الكادر المشرف</span>
            <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
              {totalTeachers} معلم
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-right col-span-2 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
              نسبة الالتزام بالحضور:
            </span>
            <span className="text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
              {attendanceRate}٪
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WIDGET 4: تابعنا عبر المنصات (مستوحى من قسم تابعنا عبر المواقع الاجتماعية) */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
        <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
          <ExternalLink className="w-3.5 h-3.5 text-islamicGold-600" />
          <span>تابع أنشطة وإعلانات المركز</span>
        </h4>

        <a
          href="https://www.facebook.com/share/p/19sanaeGpj/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/70 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 dark:hover:bg-[#1877F2] dark:hover:text-white transition-all duration-200 group shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
              <Facebook className="w-4 h-4 text-[#1877F2]" />
            </div>
            <div className="text-right">
              <span className="text-xs font-black block">صفحتنا على فيسبوك</span>
              <span className="text-[10px] opacity-80 block">الأنشطة والفعاليات الرسمية</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>

        <Link
          href="/parent"
          className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 hover:bg-burgundy-900 text-amber-900 hover:text-white border border-amber-200/70 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/40 dark:hover:bg-burgundy-900 dark:hover:text-white transition-all duration-200 group shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform">
              <BookOpen className="w-4 h-4 text-burgundy-800 dark:text-islamicGold-400" />
            </div>
            <div className="text-right">
              <span className="text-xs font-black block">بوابة أولياء الأمور</span>
              <span className="text-[10px] opacity-80 block">متابعة الأبناء وإشعارات الحفظ</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </div>
  );
}
