"use client";

import React, { useState } from "react";
import {
  ActivityWithStats,
  ActivityResponseRow,
  HalaqaWithDetails,
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  Compass,
  Plus,
  Calendar,
  DollarSign,
  MapPin,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { lightHaptic, successHaptic } from "@/lib/haptics";

interface ActivitiesManagerTabProps {
  activities: ActivityWithStats[];
  halaqat: HalaqaWithDetails[];
  onOpenCreate: () => void;
  onDelete: (id: string) => Promise<boolean>;
  isUsingFallback?: boolean;
}

export function ActivitiesManagerTab({
  activities = [],
  halaqat = [],
  onOpenCreate,
  onDelete,
  isUsingFallback = false,
}: ActivitiesManagerTabProps) {
  const [selectedActivityForResponses, setSelectedActivityForResponses] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Compute aggregate numbers
  const totalActivities = activities.length;
  const totalApproved = activities.reduce((acc, a) => acc + (a.approved_count || 0), 0);
  const totalRejected = activities.reduce((acc, a) => acc + (a.rejected_count || 0), 0);

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا النشاط وسجل ردود أولياء الأمور المرتبط به؟")) return;
    setDeletingId(id);
    lightHaptic();
    const ok = await onDelete(id);
    if (ok) successHaptic();
    setDeletingId(null);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner and Action */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white p-5 sm:p-6 border-2 border-islamicGold-400/40 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-center sm:text-right">
          <div className="w-12 h-12 rounded-2xl bg-islamicGold-500/20 border border-islamicGold-400/50 flex items-center justify-center text-islamicGold-300 shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-islamicGold-400/20 text-islamicGold-300 text-[10px] font-black mb-1">
              <span>الأنشطة الميدانية والتربوية</span>
              <span>🚌</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              إدارة النشاطات والرحلات المدرسية
            </h2>
            <p className="text-xs text-burgundy-100/90 mt-0.5">
              تنظيم الرحلات وأخذ موافقة أولياء الأمور وتتبع عدد المشاركين بدقة
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            lightHaptic();
            onOpenCreate();
          }}
          className="bg-gradient-to-r from-islamicGold-600 to-amber-500 hover:from-islamicGold-700 hover:to-amber-600 text-burgundy-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md border border-islamicGold-300 gap-2 shrink-0 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة رحلة أو نشاط جديد 🌟</span>
        </Button>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">إجمالي النشاطات</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
              {totalActivities}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-burgundy-50 dark:bg-burgundy-950/60 text-burgundy-800 dark:text-islamicGold-400 flex items-center justify-center font-bold">
            <Compass className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">
              المقاعد المؤكدة (موافق)
            </span>
            <span className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1 block">
              {totalApproved} طالب
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300 block">
              المعتذرون عن المشاركة
            </span>
            <span className="text-2xl font-black text-rose-800 dark:text-rose-200 mt-1 block">
              {totalRejected} طالب
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Activities Grid */}
      {activities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {activities.map((activity) => {
            const isViewingResponses = selectedActivityForResponses === activity.id;
            const responses = activity.responses || [];

            return (
              <div
                key={activity.id}
                className="rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-burgundy-50 dark:bg-burgundy-950 text-burgundy-900 dark:text-islamicGold-300 border border-burgundy-200 dark:border-burgundy-800">
                          {activity.activity_type}
                        </span>
                        {activity.target_type === "all" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200">
                            🌟 لجميع الحلقات والطلاب
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200">
                            🎯 حلقة: {activity.target_group_name || "مخصصة"}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                        {activity.title}
                      </h3>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(activity.id)}
                      disabled={deletingId === activity.id}
                      className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl h-8 w-8 p-0"
                      title="حذف النشاط"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Details List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <Calendar className="w-3.5 h-3.5 text-islamicGold-600 shrink-0" />
                      <span className="truncate">{formatActivityDate(activity.activity_date)}</span>
                    </div>

                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <DollarSign className="w-3.5 h-3.5 text-islamicGold-600 shrink-0" />
                      <span>الرسوم: {activity.cost}</span>
                    </div>

                    {activity.location && (
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 sm:col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-islamicGold-600 shrink-0" />
                        <span className="truncate">{activity.location}</span>
                      </div>
                    )}
                  </div>

                  {activity.description && (
                    <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 bg-amber-50/40 dark:bg-slate-800/40 p-2.5 rounded-xl border border-amber-100 dark:border-slate-800">
                      {activity.description}
                    </p>
                  )}
                </div>

                {/* Response Summary Bar */}
                <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/70 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>موافق: {activity.approved_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 text-xs font-black">
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>اعتذار: {activity.rejected_count || 0}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        lightHaptic();
                        setSelectedActivityForResponses(isViewingResponses ? null : activity.id);
                      }}
                      className="text-xs font-black h-8 rounded-xl gap-1.5 bg-white dark:bg-slate-800"
                    >
                      <span>كشف المشاركين ({responses.length})</span>
                      {isViewingResponses ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded Student Responses Table */}
                  {isViewingResponses && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          كشف ردود أولياء الأمور:
                        </h4>
                        <span className="text-[11px] text-slate-500 font-bold">
                          {activity.approved_count} مقعد مؤكد
                        </span>
                      </div>

                      {responses.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-800">
                          {responses.map((resp) => (
                            <div
                              key={resp.id}
                              className="p-2.5 flex items-center justify-between text-xs font-bold"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-slate-800 dark:text-slate-200">
                                  {resp.student_name || "طالب"}
                                </span>
                                {resp.parent_phone && (
                                  <span dir="ltr" className="text-[10px] text-slate-400 font-mono">
                                    {resp.parent_phone}
                                  </span>
                                )}
                              </div>

                              <div>
                                {resp.status === "approved" ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>موافق ✅</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    <span>اعتذار ❌</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-xs text-slate-500 py-4 bg-white dark:bg-slate-800/40 rounded-xl border border-dashed">
                          بانتظار ردود أولياء الأمور عبر روابط متابعة أبنائهم
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-full bg-burgundy-50 dark:bg-burgundy-950/80 text-burgundy-900 dark:text-islamicGold-300 flex items-center justify-center mx-auto">
            <Compass className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              لا توجد نشاطات أو رحلات معلنة حالياً
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              يمكنك تنظيم رحلة ترفيهية، يوم رياضي، أو مخيم قرآني مع تحديد التكلفة والموعد والحلقات المستهدفة لتظهر فوراً لأولياء الأمور لتسجيل موافقتهم.
            </p>
          </div>
          <Button
            onClick={() => {
              lightHaptic();
              onOpenCreate();
            }}
            className="bg-burgundy-950 hover:bg-burgundy-900 text-islamicGold-300 hover:text-white font-black text-xs px-5 py-2 rounded-xl gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول رحلة الآن 🚌</span>
          </Button>
        </div>
      )}
    </div>
  );
}
