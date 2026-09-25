"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { MosqueLogo } from "@/components/common/MosqueLogo";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  BookOpen,
  Calendar,
  Sparkles,
  ExternalLink,
  Plus,
  UserPlus,
  Compass,
} from "lucide-react";

interface IslamicAdminBannerProps {
  onOpenCreateHalaqa?: () => void;
  onOpenCreateTeacher?: () => void;
  onOpenActivities?: () => void;
  totalStudents?: number;
  totalHalaqat?: number;
  totalTeachers?: number;
}

export function IslamicAdminBanner({
  onOpenCreateHalaqa,
  onOpenCreateTeacher,
  onOpenActivities,
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
    <div className="no-print relative overflow-hidden rounded-3xl border-2 border-islamicGold-400/60 shadow-xl bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white">
      {/* Islamic Geometric Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      {/* Decorative Arch Flairs (Left & Right) */}
      <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-islamicGold-500/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-burgundy-500/20 blur-2xl pointer-events-none" />

      {/* Top Islamic Date Ribbon (مستوحى من شريط التاريخ في الموقع المرجعي) */}
      <div className="relative z-10 px-4 sm:px-8 py-2.5 bg-black/30 border-b border-islamicGold-400/30 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-islamicGold-200 font-bold">
          <Calendar className="w-3.5 h-3.5 text-islamicGold-400 shrink-0" />
          <span>{hijriDate}</span>
          {gregorianDate && (
            <>
              <span className="text-islamicGold-400/40">•</span>
              <span className="text-slate-300 text-[11px]">{gregorianDate} م</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="hidden sm:inline-block text-islamicGold-300 font-medium">
            ﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-islamicGold-400/20 border border-islamicGold-400/40 text-islamicGold-300 font-black">
            بوابة الإدارة العامة 👑
          </span>
        </div>
      </div>

      {/* Main Banner Content */}
      <div className="relative z-10 p-5 sm:p-7 flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Right side: Logo & Title */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-right gap-4 sm:gap-5">
          <div className="relative shrink-0">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-islamicGold-600 to-amber-200 opacity-60 blur-xs" />
            <div className="relative p-1 rounded-full bg-burgundy-950 border-2 border-islamicGold-400 shadow-md">
              <MosqueLogo
                variant="full"
                size="lg"
                width={78}
                height={78}
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/10 border border-islamicGold-400/40 text-islamicGold-300 text-[11px] font-black">
              <ShieldCheck className="w-3.5 h-3.5 text-islamicGold-400" />
              <span>مجمع حلقات مركز طارق بن زياد القرآني</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
              لوحة تحكم مدير المركز والإشراف العام
            </h1>

            <p className="text-xs sm:text-sm text-burgundy-100 font-medium max-w-xl">
              تَمَيُّزٌ وَارْتِقَاءْ .. فِي تَرْبِيَةِ وَتَعْلِيمِ أَبْنَائِنَا كِتَابَ اللهِ عَزَّ وَجَلّْ
            </p>
          </div>
        </div>

        {/* Left side: Quick Management Actions */}
        <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2.5 shrink-0 w-full sm:w-auto">
          {onOpenCreateHalaqa && (
            <Button
              onClick={onOpenCreateHalaqa}
              className="bg-gradient-to-r from-islamicGold-600 to-amber-500 hover:from-islamicGold-700 hover:to-amber-600 text-burgundy-950 font-black text-xs px-4 py-2 rounded-xl shadow-md border border-islamicGold-300 gap-1.5 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء حلقة قرآنية</span>
            </Button>
          )}

          {onOpenCreateTeacher && (
            <Button
              onClick={onOpenCreateTeacher}
              className="bg-white/10 hover:bg-white/20 border border-islamicGold-400/50 text-white font-bold text-xs px-4 py-2 rounded-xl backdrop-blur-xs gap-1.5 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4 text-islamicGold-300" />
              <span>إضافة معلم</span>
            </Button>
          )}

          {onOpenActivities && (
            <Button
              onClick={onOpenActivities}
              className="bg-white/10 hover:bg-white/20 border border-islamicGold-400/50 text-white font-bold text-xs px-4 py-2 rounded-xl backdrop-blur-xs gap-1.5 active:scale-95 transition-all"
            >
              <Compass className="w-4 h-4 text-islamicGold-300" />
              <span>النشاطات والرحلات 🚌</span>
            </Button>
          )}

          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent hover:bg-white/10 border-white/30 text-white rounded-xl text-xs font-bold gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-islamicGold-300" />
              <span>لوحة المعلم</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Bottom Architectural Border Accent */}
      <div className="relative h-1.5 w-full bg-gradient-to-r from-islamicGold-600 via-amber-300 to-islamicGold-600 opacity-80" />
    </div>
  );
}
