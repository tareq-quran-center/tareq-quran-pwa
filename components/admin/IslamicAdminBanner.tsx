"use client";

import React, { useMemo } from "react";
import { MosqueLogo } from "@/components/common/MosqueLogo";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Calendar,
  Sparkles,
  Plus,
  UserPlus,
  Compass,
  Settings,
  BookOpen,
  Users,
  GraduationCap,
} from "lucide-react";

interface IslamicAdminBannerProps {
  onOpenCreateHalaqa?: () => void;
  onOpenCreateTeacher?: () => void;
  onOpenActivities?: () => void;
  onOpenSettings?: () => void;
  totalStudents?: number;
  totalHalaqat?: number;
  totalTeachers?: number;
}

export function IslamicAdminBanner({
  onOpenCreateHalaqa,
  onOpenCreateTeacher,
  onOpenActivities,
  onOpenSettings,
  totalStudents = 0,
  totalHalaqat = 0,
  totalTeachers = 0,
}: IslamicAdminBannerProps) {
  // Format current Hijri and Gregorian dates in Arabic
  const { hijriDate, gregorianDate } = useMemo(() => {
    const now = new Date();
    let hijri = "";
    let gregorian = "";
    try {
      hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long",
      }).format(now);
    } catch {
      hijri = "التقويم الهجري المبارك";
    }

    try {
      gregorian = new Intl.DateTimeFormat("ar-JO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(now);
    } catch {
      gregorian = "";
    }

    return { hijriDate: hijri, gregorianDate: gregorian };
  }, []);

  return (
    <div className="no-print relative overflow-hidden rounded-3xl border-2 border-islamicGold-400/60 shadow-2xl bg-gradient-to-br from-burgundy-950 via-[#3B0711] to-burgundy-950 text-white">
      {/* Islamic Geometric Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1.2px,transparent_1.2px)] [background-size:22px_22px] opacity-15 pointer-events-none" />

      {/* Decorative Golden Arch Flairs */}
      <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-islamicGold-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

      {/* Top Islamic Date & Motto Ribbon */}
      <div className="relative z-10 px-4 sm:px-8 py-2.5 bg-black/40 border-b border-islamicGold-400/30 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-islamicGold-200 font-bold">
          <Calendar className="w-3.5 h-3.5 text-islamicGold-400 shrink-0" />
          <span>{hijriDate}</span>
          {gregorianDate && (
            <>
              <span className="text-islamicGold-400/40">•</span>
              <span className="text-slate-300 text-[11px] font-sans">{gregorianDate} م</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="hidden md:inline-flex items-center gap-1.5 text-islamicGold-300 font-medium">
            <Sparkles className="w-3 h-3 text-islamicGold-400" />
            <span>﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-islamicGold-500/20 border border-islamicGold-400/40 text-islamicGold-300 font-black shadow-2xs">
            <ShieldCheck className="w-3 h-3 text-islamicGold-400" />
            <span>بوابة الإدارة والإشراف العام 👑</span>
          </span>
        </div>
      </div>

      {/* Main Banner Content */}
      <div className="relative z-10 p-5 sm:p-7 flex flex-col xl:flex-row items-center justify-between gap-6">
        {/* Right side: Logo, Identity & Center Statistics */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-4 sm:gap-6 w-full xl:w-auto">
          {/* Logo Frame */}
          <div className="relative shrink-0">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-islamicGold-600 via-amber-300 to-islamicGold-500 opacity-75 blur-xs" />
            <div className="relative p-1.5 rounded-full bg-burgundy-950 border-2 border-islamicGold-400 shadow-xl">
              <MosqueLogo
                variant="full"
                size="lg"
                width={80}
                height={80}
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Titles & Summary Badges */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 border border-islamicGold-400/40 text-islamicGold-300 text-[11px] font-black">
              <span>مجمع حلقات مركز طارق بن زياد القرآني</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              لوحة تحكم مدير المركز والإشراف العام
            </h1>

            <p className="text-xs sm:text-sm text-burgundy-100/90 font-medium">
              الشيخ عدنان الجالودي • تَمَيُّزٌ وَارْتِقَاءْ فِي خِدْمَةِ كِتَابِ اللهِ تَعَالَى 🌸
            </p>

            {/* Quick Live Stats Pills */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/25 border border-islamicGold-400/30 text-[11px] font-bold text-slate-200">
                <BookOpen className="w-3.5 h-3.5 text-islamicGold-400" />
                <span>{totalHalaqat} حلقة قرآنية</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/25 border border-islamicGold-400/30 text-[11px] font-bold text-slate-200">
                <Users className="w-3.5 h-3.5 text-islamicGold-400" />
                <span>{totalTeachers} معلماً</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/25 border border-islamicGold-400/30 text-[11px] font-bold text-slate-200">
                <GraduationCap className="w-3.5 h-3.5 text-islamicGold-400" />
                <span>{totalStudents} طالباً</span>
              </div>
            </div>
          </div>
        </div>

        {/* Left side: Professional Quick Action Buttons Grid */}
        <div className="w-full xl:w-auto shrink-0">
          <div className="p-2 sm:p-2.5 rounded-2xl bg-black/30 border border-islamicGold-400/30 backdrop-blur-md shadow-inner">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2">
              {/* 1. Create Halaqa (Primary Action) */}
              {onOpenCreateHalaqa && (
                <Button
                  onClick={onOpenCreateHalaqa}
                  className="h-11 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-islamicGold-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-burgundy-950 font-black text-xs sm:text-sm shadow-md border border-amber-200 gap-2 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>إنشاء حلقة</span>
                </Button>
              )}

              {/* 2. Add Teacher */}
              {onOpenCreateTeacher && (
                <Button
                  onClick={onOpenCreateTeacher}
                  className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-islamicGold-400/40 text-white font-bold text-xs sm:text-sm shadow-sm gap-2 backdrop-blur-xs active:scale-95 transition-all"
                >
                  <UserPlus className="w-4 h-4 text-islamicGold-300" />
                  <span>إضافة معلم</span>
                </Button>
              )}

              {/* 3. Activities & Trips */}
              {onOpenActivities && (
                <Button
                  onClick={onOpenActivities}
                  className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-islamicGold-400/40 text-white font-bold text-xs sm:text-sm shadow-sm gap-2 backdrop-blur-xs active:scale-95 transition-all"
                >
                  <Compass className="w-4 h-4 text-islamicGold-300" />
                  <span>الأنشطة والرحلات 🚌</span>
                </Button>
              )}

              {/* 4. Account Settings */}
              {onOpenSettings && (
                <Button
                  onClick={onOpenSettings}
                  className="h-11 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/60 text-amber-200 hover:text-white font-black text-xs sm:text-sm shadow-sm gap-2 backdrop-blur-xs active:scale-95 transition-all"
                >
                  <Settings className="w-4 h-4 text-islamicGold-400" />
                  <span>إعدادات الحساب ⚙️</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Architectural Border Accent */}
      <div className="relative h-1.5 w-full bg-gradient-to-r from-islamicGold-600 via-amber-300 to-islamicGold-600 opacity-90" />
    </div>
  );
}
