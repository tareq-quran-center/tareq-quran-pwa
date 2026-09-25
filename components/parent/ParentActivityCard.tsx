"use client";

import React, { useState } from "react";
import { ActivityWithResponse } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Calendar,
  DollarSign,
  MapPin,
  CheckCircle2,
  Sparkles,
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
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
  const [showDetails, setShowDetails] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

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
        setFeedbackMsg(
          status === "approved"
            ? "تم تأكيد مشاركة ابننا الحبيب بنجاح! نسعد بلقائه 🌟"
            : "حُفظ اعتذاركم بكل مودة وتقدير، بارك الله فيكم 🌸"
        );
        setTimeout(() => setFeedbackMsg(null), 5000);
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
  // الحالة 1: تم الرد بالاعتذار (ظهور لطيف وهادئ جداً مع عبارات ود وتقدير)
  // =========================================================================
  if (hasResponded && responseStatus === "rejected" && !showEdit) {
    return (
      <div className="relative overflow-hidden rounded-3xl border-2 border-rose-200/80 dark:border-rose-900/50 shadow-sm bg-gradient-to-br from-rose-50/70 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/20 p-4 sm:p-5 animate-in fade-in duration-300">
        {/* شريط الإشعار العلوي اللطيف */}
        <div className="flex items-center justify-between gap-2 border-b border-rose-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-100/80 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 flex items-center justify-center text-lg shadow-2xs">
              🌸
            </div>
            <div>
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 block">
                نشاط المركز: {activity.activity_type}
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
                {activity.title}
              </h4>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-black bg-rose-100/90 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800 shrink-0">
            تم تسجيل الاعتذار 🌸
          </span>
        </div>

        {/* الرسالة اللطيفة الدافئة */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-rose-100 dark:border-rose-950/60 shadow-2xs space-y-1.5">
          <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <span>حُفظ اعتذاركم بكل محبة وتقدير</span>
            <span className="text-sm">🌸</span>
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            قدّر الله وما شاء فعل؛ نسأل الله العظيم أن يبارك في ابننا الحبيب{" "}
            <strong className="text-burgundy-900 dark:text-amber-300 font-bold">
              ({studentName})
            </strong>{" "}
            ويحفظه، ويسعدنا جداً مشاركته معنا في الأنشطة والرحلات القادمة بإذن الله تعالى.
          </p>
        </div>

        {/* ملخص الرحلة وزر عرض التفاصيل اختياري */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{formatActivityDate(activity.activity_date)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-0.5 shrink-0 transition-colors"
          >
            <span>{showDetails ? "إخفاء التفاصيل" : "عرض التفاصيل"}</span>
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* تفاصيل الرحلة الموسعة عند الطلب */}
        {showDetails && (
          <div className="mt-2.5 pt-2.5 border-t border-rose-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2 animate-in fade-in">
            {activity.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>مكان التجمع: {activity.location}</span>
              </div>
            )}
            {activity.description && (
              <p className="text-slate-500 dark:text-slate-400 bg-white/60 dark:bg-slate-800/40 p-2.5 rounded-xl border border-rose-100/60 leading-relaxed">
                💡 {activity.description}
              </p>
            )}
          </div>
        )}

        {/* إمكانية تغيير القرار وتأكيد المشاركة */}
        <div className="mt-3.5 pt-2.5 border-t border-rose-100/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            تيسرت ظروفكم وترغبون بالمشاركة؟
          </span>
          <button
            type="button"
            onClick={() => {
              lightHaptic();
              setShowEdit(true);
            }}
            className="text-xs font-bold text-rose-700 dark:text-rose-300 hover:text-rose-900 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
          >
            <RotateCcw className="w-3 h-3 text-rose-500" />
            <span>تأكيد المشاركة بدلاً من ذلك 🔄</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // الحالة 2: تم الرد بالموافقة (ظهور مبهج ملكي زمردي يؤكد المقعد والترحيب)
  // =========================================================================
  if (hasResponded && responseStatus === "approved" && !showEdit) {
    return (
      <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-300/80 dark:border-emerald-800/60 shadow-sm bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30 p-4 sm:p-5 animate-in fade-in duration-300">
        {/* شريط الإشعار العلوي المبهج */}
        <div className="flex items-center justify-between gap-2 border-b border-emerald-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg shadow-2xs">
              🌟
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                نشاط المركز: {activity.activity_type}
              </span>
              <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-white">
                {activity.title}
              </h4>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 shrink-0">
            المقعد مؤكد بنجاح ✅
          </span>
        </div>

        {/* رسالة الترحيب والابتهاج */}
        <div className="mt-3.5 p-3.5 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-950/60 shadow-2xs space-y-1.5">
          <p className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>أهلاً وسهلاً بابننا الغالي في رحلتنا المباركة!</span>
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            تم تأكيد تسجيل مقعد الطالب{" "}
            <strong className="text-emerald-800 dark:text-emerald-300 font-bold">
              ({studentName})
            </strong>{" "}
            بنجاح. نسعد جداً بتواجده مع إخوانه ونسأل الله له ولأصحابه وقتاً عامراً بالفرح والفائدة والصحبة الصالحة.
          </p>
        </div>

        {/* تفاصيل الموعد والانطلاق المهمة لولي الأمر */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-emerald-200/60 dark:border-slate-700">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>الموعد: {formatActivityDate(activity.activity_date)}</span>
          </div>

          {activity.location && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/90 dark:bg-slate-800/80 border border-emerald-200/60 dark:border-slate-700">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{activity.location}</span>
            </div>
          )}
        </div>

        {activity.description && (
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-800/50 p-2.5 rounded-xl border border-emerald-100 dark:border-slate-800 leading-relaxed">
            💡 {activity.description}
          </p>
        )}

        {/* إمكانية تعديل الخيار إذا طرأ ظرف */}
        <div className="mt-3.5 pt-2.5 border-t border-emerald-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            الرسوم المطلوبة: {activity.cost}
          </span>
          <button
            type="button"
            onClick={() => {
              lightHaptic();
              setShowEdit(true);
            }}
            className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 bg-white dark:bg-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 active:scale-95 transition-all shadow-2xs"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>تعديل الرد أو الاعتذار 🔄</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // الحالة 3: قبل الرد (أو في وضع التعديل) - دعوة أنيقة وواضحة للاختيار
  // =========================================================================
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-islamicGold-400/50 shadow-md bg-gradient-to-br from-amber-50/90 via-white to-amber-100/50 dark:from-slate-900 dark:via-slate-900 dark:to-burgundy-950/40 p-4 sm:p-5 animate-in fade-in">
      {/* Decorative Islamic top banner */}
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

      {/* Response Action Area */}
      {feedbackMsg && (
        <div className="p-3 mb-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-xs font-black flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      <div className="space-y-2 pt-1 border-t border-amber-200/60 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
          <span>هل ترغب بمشاركة ابننا الحبيب ({studentName}) في هذا النشاط؟</span>
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
            className="min-h-[44px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md gap-1.5 active:scale-95 transition-all"
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

          {/* زر الاعتذار المهذب واللطيف */}
          <Button
            disabled={isSubmitting}
            variant="outline"
            onClick={() => handleRespond("rejected")}
            className="min-h-[44px] bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 font-black text-xs rounded-xl gap-1.5 active:scale-95 transition-all"
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
