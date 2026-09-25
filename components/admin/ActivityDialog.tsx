"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HalaqaWithDetails } from "@/types";
import {
  Compass,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  Sparkles,
  Loader2,
  X,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { lightHaptic, successHaptic } from "@/lib/haptics";
import {
  ACTIVITIES_MIGRATION_SQL,
  SUPABASE_SQL_EDITOR_URL,
} from "@/lib/constants/activitySql";

interface ActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    activity_type: string;
    cost: string;
    activity_date: string;
    location?: string;
    description?: string;
    target_type: "all" | "halaqa";
    target_group_id?: string | null;
    target_group_name?: string | null;
  }) => Promise<{ success: boolean; error?: string; errorCode?: string } | boolean>;
  halaqat: HalaqaWithDetails[];
}

const PRESET_ACTIVITY_TYPES = [
  "رحلة ترفيهية 🎡",
  "يوم رياضي ومسبح 🏊",
  "مخيم قرآني تربوي ⛺",
  "زيارة علمية ومعرفية 🏛️",
  "إفطار جماعي مبارك 🌙",
  "نشاط تطوعي وخيري 🤝",
  "أخرى (عنوان مخصص)",
];

export function ActivityDialog({
  isOpen,
  onClose,
  onSubmit,
  halaqat = [],
}: ActivityDialogProps) {
  const [selectedType, setSelectedType] = useState<string>(PRESET_ACTIVITY_TYPES[0]);
  const [customTitle, setCustomTitle] = useState("");
  const [cost, setCost] = useState("5 دنانير");
  const [date, setDate] = useState(() => {
    // Default to upcoming Saturday at 09:00 AM
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + ((6 - nextDate.getDay() + 7) % 7 || 7));
    nextDate.setHours(9, 0, 0, 0);
    return nextDate.toISOString().slice(0, 16);
  });
  const [location, setLocation] = useState("التجمع في ساحة مركز مركز طارق القرآني");
  const [description, setDescription] = useState("يرجى إحضار زجاجة ماء وقبعة شمسية، والانضباط بآداب الرحلة القرآنية.");
  const [targetType, setTargetType] = useState<"all" | "halaqa">("all");
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMissingTablesError, setIsMissingTablesError] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(ACTIVITIES_MIGRATION_SQL);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsMissingTablesError(false);

    const titleToUse = selectedType.includes("أخرى")
      ? customTitle.trim()
      : customTitle.trim() || selectedType.replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim();

    if (!titleToUse) {
      setErrorMsg("يرجى كتابة عنوان أو تحديد نوع الرحلة");
      return;
    }

    if (targetType === "halaqa" && !targetGroupId) {
      setErrorMsg("يرجى اختيار الحلقة المستهدفة من القائمة");
      return;
    }

    let targetGroupName: string | null = null;
    if (targetType === "halaqa" && targetGroupId) {
      const found = halaqat.find((h) => h.id === targetGroupId);
      targetGroupName = found?.name || null;
    }

    setIsSubmitting(true);
    lightHaptic();

    try {
      const res = await onSubmit({
        title: titleToUse,
        activity_type: selectedType.replace(/[\u{1F300}-\u{1F9FF}]/gu, "").trim(),
        cost: cost.trim() || "مجاناً",
        activity_date: date,
        location: location.trim(),
        description: description.trim(),
        target_type: targetType,
        target_group_id: targetType === "halaqa" ? targetGroupId : null,
        target_group_name: targetGroupName,
      });

      const isOk = res === true || (typeof res === "object" && res?.success);

      if (isOk) {
        successHaptic();
        onClose();
        // Reset form
        setCustomTitle("");
        setErrorMsg(null);
        setIsMissingTablesError(false);
      } else {
        const err = typeof res === "object" ? res?.error : null;
        const errCode = typeof res === "object" ? res?.errorCode : null;
        if (errCode === "TABLES_NOT_FOUND" || err?.includes("جداول")) {
          setIsMissingTablesError(true);
        }
        setErrorMsg(err || "تعذر حفظ النشاط، يرجى التحقق من قاعدة البيانات والمحاولة ثانية");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in" dir="rtl">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-islamicGold-400/40 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white p-5 border-b border-islamicGold-400/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-islamicGold-500/20 border border-islamicGold-400/40 flex items-center justify-center text-islamicGold-300">
              <Compass className="w-5 h-5 text-islamicGold-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>إضافة نشاط أو رحلة جديدة</span>
                <span className="text-islamicGold-300">🚌</span>
              </h3>
              <p className="text-xs text-burgundy-100/90 mt-0.5">
                تحديد تفاصيل النشاط والرسوم لتظهر فوراً لأولياء الأمور لأخذ موافقتهم
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Missing Tables Notice */}
          {isMissingTablesError && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-100 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-black text-sm">يلزم تفعيل جداول النشاطات في Supabase لمرة واحدة</p>
                  <p className="mt-1 opacity-90">
                    قاعدة البيانات لم يتم إنشاء جدول النشاطات فيها بعد. قم بنسخ كود الـ SQL التالي وتشغيله في صفحة SQL في لوحة Supabase:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? "تم نسخ كود الـ SQL! ✅" : "نسخ كود الـ SQL بنقرة واحدة 📋"}</span>
                </button>
                <a
                  href={SUPABASE_SQL_EDITOR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center gap-1 hover:bg-amber-100/50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح محرر Supabase SQL ↗</span>
                </a>
              </div>
            </div>
          )}

          {errorMsg && !isMissingTablesError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {/* 1. نوع الرحلة والنشاط */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-slate-800 dark:text-slate-200">
              نوع أو نمط النشاط:
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {PRESET_ACTIVITY_TYPES.map((type) => {
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      lightHaptic();
                      setSelectedType(type);
                    }}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      isSelected
                        ? "bg-burgundy-900 text-white border-islamicGold-400 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. عنوان الرحلة المخصص */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-slate-800 dark:text-slate-200">
              عنوان أو اسم الرحلة / النشاط:
            </Label>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="مثال: رحلة مائية إلى منتجع الأندلس أو زيارة حديقة الحيوان"
              className="text-xs rounded-xl"
            />
          </div>

          {/* 3. رسوم الاشتراك وموعد الرحلة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>رسوم الاشتراك للشخص:</span>
              </Label>
              <Input
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="مثال: 5 دنانير أو مجاناً"
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-burgundy-800 dark:text-islamicGold-400" />
                <span>الموعد والتاريخ:</span>
              </Label>
              <Input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="text-xs rounded-xl"
                required
              />
            </div>
          </div>

          {/* 4. مكان التجمع والانطلاق */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>مكان التجمع والوجهة:</span>
            </Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="مكان التجمع أو وجهة الرحلة"
              className="text-xs rounded-xl"
            />
          </div>

          {/* 5. الفئة المستهدفة (كل الحلقات أم حلقة محددة) */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <Label className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-burgundy-800 dark:text-islamicGold-400" />
              <span>الفئة المستهدفة بالنشاط:</span>
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  lightHaptic();
                  setTargetType("all");
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                  targetType === "all"
                    ? "bg-burgundy-900 text-white border-islamicGold-400 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                🌟 جميع طلاب المركز
              </button>

              <button
                type="button"
                onClick={() => {
                  lightHaptic();
                  setTargetType("halaqa");
                }}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                  targetType === "halaqa"
                    ? "bg-burgundy-900 text-white border-islamicGold-400 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                🎯 حلقة قرآنية محددة
              </button>
            </div>

            {targetType === "halaqa" && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 block">
                  اختر الحلقة المستهدفة:
                </Label>
                <select
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  required={targetType === "halaqa"}
                >
                  <option value="">-- اختر الحلقة --</option>
                  {halaqat.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.teacher_name || "بدون معلم"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 6. ملاحظات وإرشادات لأولياء الأمور */}
          <div className="space-y-1.5">
            <Label className="text-xs font-black text-slate-800 dark:text-slate-200">
              تعليمات وإرشادات تظهر لولي الأمر:
            </Label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: إحضار وجبة خفيفة، الانضباط في الحافلة، ملابس رياضية مناسبة..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-burgundy-800"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="text-xs rounded-xl"
              disabled={isSubmitting}
            >
              إلغاء
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-950 text-islamicGold-300 hover:text-white font-black text-xs px-6 py-2 rounded-xl shadow-md border border-islamicGold-400/40 gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ النشر...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-islamicGold-400" />
                  <span>نشر الرحلة لأولياء الأمور 🚌</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
