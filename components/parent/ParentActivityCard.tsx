"use client";

import React, { useState } from "react";
import { ActivityWithResponse } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Compass,
} from "lucide-react";
import { lightHaptic, successHaptic } from "@/lib/haptics";
import { submitActivityResponse } from "@/lib/actions/activity";

interface ParentActivityCardProps {
  activity: ActivityWithResponse;
  studentId: string;
  studentName: string;
  parentToken: string;
}

export function ParentActivityCard({
  activity,
  studentId,
  studentName,
  parentToken,
}: ParentActivityCardProps) {
  const [responseStatus, setResponseStatus] = useState<"approved" | "rejected" | null>(
    activity.parent_response || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRespond = async (status: "approved" | "rejected") => {
    setIsSubmitting(true);
    lightHaptic();

    try {
      const res = await submitActivityResponse({
        activityId: activity.id,
        studentId,
        status,
        parentToken,
      });

      if (res.success) {
        successHaptic();
        setResponseStatus(status);
        setShowEdit(false);
        setIsExpanded(false);
      } else {
        alert(res.error || "تعذر حفظ الرد، يرجى المحاولة مرة أخرى");
      }
    } catch {
      alert("حدث خطأ في الاتصال، يرجى المحاولة ثانية");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatActivityDate = (rawDate: string) => {
    try {
      const d = new Date(rawDate);
      return new Intl.DateTimeFormat("ar-JO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
      }).format(d);
    } catch {
      return rawDate;
    }
  };

  const hasResponded = responseStatus !== null;

  // =========================================================================
  // حالة ما بعد الرد (شريط مطوي مدمج ونحيف جداً لا يأخذ أي مساحة)
  // =========================================================================
  if (hasResponded && !showEdit) {
    const isApproved = responseStatus === "approved";

    return (
      <div
        className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
          isApproved
            ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
            : "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
        }`}
      >
        {/* الشريط المدمج الأنيق - سطر واحد فقط */}
        <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2">
          {/* الجانب الأيمن: الأيقونة + اسم الرحلة + شارة الرد */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">
              {isApproved ? "🌟" : "🌸"}
            </span>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                {activity.title}
              </span>

              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                  isApproved
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
                }`}
              >
                {isApproved ? "مشارك ✅" : "معتذر 🌸"}
              </span>
            </div>
          </div>

          {/* الجانب الأيسر: زر تفاصيل + زر تعديل الرد */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                lightHaptic();
                setIsExpanded(!isExpanded);
              }}
              className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-black/5 flex items-center gap-0.5 transition-colors"
              title="عرض التفاصيل أو إخفائها"
            >
              <span>تفاصيل</span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                lightHaptic();
                setShowEdit(true);
              }}
              className="text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 bg-white/80 dark:bg-slate-800 hover:bg-white px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>تعديل</span>
            </button>
          </div>
        </div>

        {/* التفاصيل الموسعة عند النقر على "تفاصيل" فقط */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-1 border-t border-black/5 dark:border-white/5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300 animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>الموعد: {formatActivityDate(activity.activity_date)}</span>
            </div>

            {activity.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>المكان: {activity.location}</span>
              </div>
            )}

            {activity.cost && (
              <div className="text-[11px] text-slate-500">
                الرسوم: <strong className="font-bold text-slate-700 dark:text-slate-200">{activity.cost}</strong>
              </div>
            )}

            {activity.description && (
              <p className="text-[11px] text-slate-500 bg-black/5 dark:bg-white/5 p-2 rounded-xl mt-1 leading-relaxed">
                💡 {activity.description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // حالة ما قبل الرد أو عند الضغط على "تعديل"
  // =========================================================================
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-islamicGold-400/50 shadow-md bg-gradient-to-br from-amber-50/90 via-white to-amber-100/50 dark:from-slate-900 dark:via-slate-900 dark:to-burgundy-950/40 p-4 sm:p-5 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 dark:border-slate-800 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-burgundy-950 text-islamicGold-300 flex items-center justify-center shrink-0 shadow-xs">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <span className="text-[11px] font-black text-burgundy-900 dark:text-islamicGold-300 flex items-center gap-1">
              <span>نشاط ورحلة قادمة للمركز</span>
              <span>🚌</span>
            </span>
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              {activity.title}
            </h4>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-islamicGold-500/20 text-burgundy-950 dark:text-islamicGold-300 border border-islamicGold-400/40 shrink-0">
          {activity.cost}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-amber-200/50 dark:border-slate-700">
          <Calendar className="w-3.5 h-3.5 text-islamicGold-600 shrink-0" />
          <span>الموعد: {formatActivityDate(activity.activity_date)}</span>
        </div>

        {activity.location && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-slate-800/60 border border-amber-200/50 dark:border-slate-700">
            <MapPin className="w-3.5 h-3.5 text-islamicGold-600 shrink-0" />
            <span className="truncate">{activity.location}</span>
          </div>
        )}
      </div>

      {activity.description && (
        <p className="text-xs text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-amber-100 dark:border-slate-800 mb-3.5 leading-relaxed">
          💡 {activity.description}
        </p>
      )}

      {/* Action Area */}
      <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
          <span>مشاركة الطالب ({studentName}) في النشاط:</span>
          {showEdit && (
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              className="text-[11px] text-slate-400 hover:underline"
            >
              إلغاء التعديل
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* زر الموافقة */}
          <Button
            disabled={isSubmitting}
            onClick={() => handleRespond("approved")}
            className="min-h-[42px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md gap-1.5 active:scale-95 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>موافق وتأكيد المشاركة ✅</span>
              </>
            )}
          </Button>

          {/* زر الاعتذار */}
          <Button
            disabled={isSubmitting}
            variant="outline"
            onClick={() => handleRespond("rejected")}
            className="min-h-[42px] bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 font-black text-xs rounded-xl gap-1.5 active:scale-95 transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="text-sm">🌸</span>
                <span>اعتذار عن المشاركة</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
