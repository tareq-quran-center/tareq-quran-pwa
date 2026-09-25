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
  XCircle,
  Sparkles,
  Loader2,
  Info,
  Clock,
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
            ? "تم تأكيد مشاركة الطالب بنجاح! نراكم على خير بإذن الله 🌟"
            : "تم تسجيل اعتذاركم عن المشاركة، نتمنى لكم التوفيق 🌸"
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

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-islamicGold-400/50 shadow-md bg-gradient-to-br from-amber-50/90 via-white to-amber-100/50 dark:from-slate-900 dark:via-slate-900 dark:to-burgundy-950/40 p-4 sm:p-5">
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
          {activity.description}
        </p>
      )}

      {/* Response Action Area */}
      {feedbackMsg && (
        <div className="p-3 mb-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 text-emerald-900 dark:text-emerald-200 text-xs font-black flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {hasResponded && !showEdit ? (
        <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {responseStatus === "approved" ? (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>تم تأكيد موافقتكم على مشاركة الطالب ({studentName}) في الرحلة ✅</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 text-xs font-black">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>تم تسجيل اعتذاركم عن مشاركة الطالب ({studentName}) ❌</span>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              lightHaptic();
              setShowEdit(true);
            }}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl h-8 px-2.5"
          >
            تغيير الرد 🔄
          </Button>
        </div>
      ) : (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
            <span>هل توافق على مشاركة الطالب ({studentName}) في هذا النشاط؟</span>
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
              className="min-h-[42px] bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900 font-black text-xs rounded-xl gap-1.5 active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>اعتذار عن المشاركة ❌</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
