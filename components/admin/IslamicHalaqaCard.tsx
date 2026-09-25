"use client";

import React from "react";
import { HalaqaWithDetails } from "@/types";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, Award, Edit2, Trash2, ExternalLink } from "lucide-react";

interface IslamicHalaqaCardProps {
  halaqa: HalaqaWithDetails;
  onViewStudents: (halaqaId: string) => void;
  onEdit: (halaqa: HalaqaWithDetails) => void;
  onDelete: (halaqaId: string) => void;
}

export function IslamicHalaqaCard({
  halaqa,
  onViewStudents,
  onEdit,
  onDelete,
}: IslamicHalaqaCardProps) {
  return (
    <div className="group relative bg-gradient-to-b from-white via-amber-50/20 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-900 rounded-3xl p-5 border-2 border-amber-200/80 dark:border-amber-900/40 shadow-xs hover:shadow-xl hover:border-islamicGold-400 dark:hover:border-islamicGold-500 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Decorative Corner Islamic Flourish */}
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-40 dark:opacity-20 group-hover:opacity-75 transition-opacity">
        <svg viewBox="0 0 100 100" className="w-full h-full text-islamicGold-500" fill="currentColor">
          <path d="M0,0 L100,0 L100,20 C60,20 20,60 20,100 L0,100 Z" />
        </svg>
      </div>

      <div>
        {/* Top Header: Badge, Season, & Admin Actions */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-burgundy-900 text-islamicGold-300 text-[10px] font-black border border-islamicGold-400/40 shadow-xs">
              حلقة قرآنية
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 text-[10px] font-bold border border-amber-300/40">
              {halaqa.season_name || "النادي الدائم"}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <Button
              onClick={() => onEdit(halaqa)}
              variant="ghost"
              size="sm"
              className="w-7 h-7 p-0 text-slate-500 hover:text-burgundy-800 hover:bg-burgundy-50 dark:hover:bg-slate-800 rounded-lg"
              title="تعديل الحلقة"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={() => onDelete(halaqa.id)}
              variant="ghost"
              size="sm"
              className="w-7 h-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg"
              title="حذف الحلقة"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Card Body: Medallion Emblem + Halaqa Name (مستوحى من تصميم مجمع الحلقات) */}
        <div className="flex items-center gap-3.5 my-3">
          {/* Islamic Arch Medallion Emblem */}
          <div className="relative shrink-0 w-13 h-15 rounded-2xl bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-950 p-0.5 border-2 border-islamicGold-400 shadow-md flex flex-col items-center justify-center text-islamicGold-300 group-hover:scale-105 transition-transform duration-300">
            {/* Islamic Arch Outline */}
            <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-burgundy-900 to-burgundy-950 flex flex-col items-center justify-center p-1 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:8px_8px] opacity-25" />
              <svg
                viewBox="0 0 24 28"
                className="w-7 h-7 text-islamicGold-400 fill-current drop-shadow-xs"
              >
                {/* Stylized Mosque Arch with Crescent & Quran */}
                <path d="M12 2 C8 6 6 10 6 15 L6 25 C6 26 7 27 8 27 L16 27 C17 27 18 26 18 25 L18 15 C18 10 16 6 12 2 Z" opacity="0.3" />
                <path d="M12 4 C9 8 8 11 8 15 L8 24 L16 24 L16 15 C16 11 15 8 12 4 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="11" r="1.5" />
                <path d="M10 17 L14 17 M10 20 L14 20" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="text-[8px] font-black text-islamicGold-200 mt-0.5 tracking-tighter">حلقة</span>
            </div>
          </div>

          {/* Halaqa Details */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight group-hover:text-burgundy-900 dark:group-hover:text-islamicGold-300 transition-colors leading-snug">
              {halaqa.name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-bold mt-1 flex items-center gap-1.5 truncate">
              <span className="text-islamicGold-600 dark:text-islamicGold-400 font-black">المعلم:</span>
              <span className="text-slate-800 dark:text-slate-200 font-extrabold truncate">
                {halaqa.teacher_name || "غير معيّن"}
              </span>
            </p>
          </div>
        </div>

        {/* Statistics Pill Strip */}
        <div className="mt-3.5 pt-3 border-t border-amber-200/50 dark:border-slate-800/80 grid grid-cols-3 gap-1.5 text-center text-xs">
          <div className="bg-amber-50/60 dark:bg-slate-800/50 p-2 rounded-xl border border-amber-200/40 dark:border-slate-700/50">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">الطلاب</span>
            <span className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
              {halaqa.students_count}
            </span>
          </div>

          <div className="bg-amber-50/60 dark:bg-slate-800/50 p-2 rounded-xl border border-amber-200/40 dark:border-slate-700/50">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">الحضور</span>
            <span className="font-black text-emerald-600 text-xs sm:text-sm">
              {halaqa.attendance_rate}٪
            </span>
          </div>

          <div className="bg-amber-50/60 dark:bg-slate-800/50 p-2 rounded-xl border border-amber-200/40 dark:border-slate-700/50">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">الإنجاز</span>
            <span className="font-black text-islamicGold-700 dark:text-islamicGold-400 text-xs sm:text-sm">
              {halaqa.total_pages} ص
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer: View Students */}
      <div className="mt-4 pt-3 border-t border-amber-200/40 dark:border-slate-800/80">
        <Button
          onClick={() => onViewStudents(halaqa.id)}
          variant="outline"
          size="sm"
          className="w-full h-9 text-xs font-black rounded-xl border-amber-300 dark:border-slate-700 bg-white hover:bg-burgundy-900 hover:text-white hover:border-burgundy-900 dark:bg-slate-800/80 dark:hover:bg-burgundy-900 transition-all shadow-2xs gap-1.5"
        >
          <span>عرض طلاب وسجلات الحلقة</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
