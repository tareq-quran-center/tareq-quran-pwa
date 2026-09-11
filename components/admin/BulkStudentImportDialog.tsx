"use client";

import { useState, useMemo, useRef } from "react";
import {
  FileSpreadsheet,
  ClipboardPaste,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Trash2,
  X,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Users,
  Plus,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HalaqaWithDetails, BulkImportResult } from "@/types";
import { bulkImportStudents } from "@/lib/actions/admin";
import {
  parseExcelFile,
  parsePastedTable,
  autoDetectColumns,
  normalizeRawRows,
  downloadStudentImportTemplate,
  exportImportedLinksToExcel,
  ColumnMapping,
  NormalizedStudentRow,
  RawImportRow,
} from "@/lib/bulkImportParser";

interface BulkStudentImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  halaqat: HalaqaWithDetails[];
  selectedSeasonId?: string;
  onSuccess?: (insertedStudents: any[]) => void;
}

export function BulkStudentImportDialog({
  isOpen,
  onClose,
  halaqat,
  selectedSeasonId,
  onSuccess,
}: BulkStudentImportDialogProps) {
  const [step, setStep] = useState<"input" | "preview" | "success">("input");
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");

  // Season / Circle selection
  const filteredHalaqat = useMemo(() => {
    if (!selectedSeasonId) return halaqat;
    const seasonFiltered = halaqat.filter((h) => h.season_id === selectedSeasonId);
    return seasonFiltered.length > 0 ? seasonFiltered : halaqat;
  }, [halaqat, selectedSeasonId]);

  const [selectedCircleId, setSelectedCircleId] = useState<string>(
    filteredHalaqat[0]?.id || ""
  );

  const selectedCircle = useMemo(
    () => halaqat.find((h) => h.id === selectedCircleId),
    [halaqat, selectedCircleId]
  );

  // File and paste inputs
  const [pastedText, setPastedText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Raw & Normalized data
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawImportRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    nameCol: "",
    parentPhoneCol: "",
    notesCol: "",
  });
  const [normalizedStudents, setNormalizedStudents] = useState<NormalizedStudentRow[]>([]);

  // Execution state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Step 1: Handlers for parsing File & Pasted text
  // -------------------------------------------------------------
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const { rows, headers } = await parseExcelFile(file);
      if (rows.length === 0) {
        throw new Error("لم يتم العثور على أي صفوف بيانات صالحة في الملف");
      }

      const mapping = autoDetectColumns(headers);
      const normalized = normalizeRawRows(rows, mapping);

      setRawHeaders(headers);
      setRawRows(rows);
      setColumnMapping(mapping);
      setNormalizedStudents(normalized);
      setStep("preview");
    } catch (err: any) {
      setParseError(err?.message || "فشل قراءة ملف الإكسل");
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleParsePasted = () => {
    if (!pastedText.trim()) {
      setParseError("يرجى لصق بيانات الجدول أولاً");
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const { rows, headers } = parsePastedTable(pastedText);
      if (rows.length === 0) {
        throw new Error("تعذر استخراج أي صفوف من النص المنسوخ");
      }

      const mapping = autoDetectColumns(headers);
      const normalized = normalizeRawRows(rows, mapping);

      setRawHeaders(headers);
      setRawRows(rows);
      setColumnMapping(mapping);
      setNormalizedStudents(normalized);
      setStep("preview");
    } catch (err: any) {
      setParseError(err?.message || "فشل قراءة النص المنسوخ");
    } finally {
      setIsParsing(false);
    }
  };

  // -------------------------------------------------------------
  // Step 2: Mapping change & Table inline edit
  // -------------------------------------------------------------
  const handleMappingChange = (
    field: "nameCol" | "parentPhoneCol" | "notesCol",
    val: string
  ) => {
    const nextMapping = { ...columnMapping, [field]: val };
    setColumnMapping(nextMapping);
    setNormalizedStudents(normalizeRawRows(rawRows, nextMapping));
  };

  const handleStudentFieldChange = (
    id: string,
    field: "name" | "parent_phone" | "notes",
    val: string
  ) => {
    setNormalizedStudents((prev) =>
      prev.map((st) => {
        if (st.id !== id) return st;
        const updated = { ...st, [field]: val };
        // Recalculate validity
        updated.isValid = Boolean(updated.name && updated.name.trim().length >= 2);
        return updated;
      })
    );
  };

  const handleDeleteRow = (id: string) => {
    setNormalizedStudents((prev) => prev.filter((st) => st.id !== id));
  };

  const handleAddManualRow = () => {
    const newRow: NormalizedStudentRow = {
      id: `manual-${Date.now()}`,
      name: "",
      parent_phone: "",
      notes: "",
      isValid: false,
      phoneStatus: "empty",
    };
    setNormalizedStudents((prev) => [newRow, ...prev]);
  };

  // -------------------------------------------------------------
  // Step 3: Submission & Bulk Insert
  // -------------------------------------------------------------
  const validStudents = useMemo(
    () => normalizedStudents.filter((s) => s.isValid && s.name.trim().length >= 2),
    [normalizedStudents]
  );

  const handleConfirmImport = async () => {
    if (!selectedCircleId) {
      setParseError("يرجى اختيار الحلقة المستهدفة أولاً");
      return;
    }

    if (validStudents.length === 0) {
      setParseError("لا يوجد أي طلاب بأسماء صالحة للاستيراد");
      return;
    }

    setIsSubmitting(true);
    setParseError(null);

    try {
      const payload = {
        circle_id: selectedCircleId,
        students: validStudents.map((s) => ({
          name: s.name.trim(),
          parent_phone: s.parent_phone.trim(),
          notes: s.notes ? s.notes.trim() : null,
        })),
      };

      const res = await bulkImportStudents(payload);
      if (res.success && res.insertedStudents) {
        setImportResult(res);
        setStep("success");
        if (onSuccess) {
          onSuccess(res.insertedStudents);
        }
      } else {
        setParseError(res.error || "فشل تنفيذ الاستيراد الجماعي");
      }
    } catch (err: any) {
      setParseError(err?.message || "حدث خطأ غير متوقع أثناء إرسال البيانات");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadStudentImportTemplate();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleExportLinks = async () => {
    if (!importResult || !importResult.insertedStudents) return;
    setIsExporting(true);
    try {
      await exportImportedLinksToExcel(
        importResult.insertedStudents,
        selectedCircle?.name || "الحلقة"
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setPastedText("");
    setRawRows([]);
    setRawHeaders([]);
    setNormalizedStudents([]);
    setImportResult(null);
    setParseError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-right">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-burgundy-900 text-white flex items-center justify-center shadow-md shadow-burgundy-950/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-islamicGold-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  الاستيراد الجماعي للطلاب
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-islamicGold-100 dark:bg-islamicGold-950 text-islamicGold-800 dark:text-islamicGold-300 text-[10px] font-black border border-islamicGold-300/50">
                  خاص بالإدارة 👑
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تسكين الطلاب دفعة واحدة وتوليد أكواد وروابط المتابعة لأولياء الأمور
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {parseError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="flex-1">{parseError}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: INPUT SETUP */}
          {/* ========================================================================= */}
          {step === "input" && (
            <div className="space-y-6">
              {/* 1. Target Circle Selection (Mandatory) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-burgundy-50/50 dark:bg-burgundy-950/20 border border-burgundy-200/70 dark:border-burgundy-900/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs sm:text-sm font-black text-burgundy-950 dark:text-burgundy-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-burgundy-700 dark:text-burgundy-400" />
                    <span>اختر الحلقة المستهدفة لتسكين الطلاب *:</span>
                  </label>
                  {selectedCircle && (
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      معلم الحلقة:{" "}
                      <strong className="text-burgundy-900 dark:text-burgundy-200">
                        {selectedCircle.teacher_name || "غير محدد"}
                      </strong>
                    </span>
                  )}
                </div>

                <select
                  value={selectedCircleId}
                  onChange={(e) => setSelectedCircleId(e.target.value)}
                  className="w-full h-11 px-3 text-xs sm:text-sm font-bold rounded-xl border border-burgundy-200 dark:border-burgundy-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-burgundy-700"
                >
                  {filteredHalaqat.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} — {h.season_name} (المعلم: {h.teacher_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Input Mode Switcher */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInputMode("file")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      inputMode === "file"
                        ? "bg-burgundy-900 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع ملف Excel أو CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode("paste")}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      inputMode === "paste"
                        ? "bg-burgundy-900 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    <ClipboardPaste className="w-3.5 h-3.5" />
                    <span>نسخ ولصق جدول مباشر</span>
                  </button>
                </div>

                {/* Template Download Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl"
                >
                  <Download className="w-3.5 h-3.5 text-islamicGold-600" />
                  <span>
                    {isDownloadingTemplate ? "جاري التجهيز..." : "تحميل نموذج Excel جاهز"}
                  </span>
                </Button>
              </div>

              {/* Mode A: File Upload */}
              {inputMode === "file" && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-burgundy-700 dark:hover:border-burgundy-600 rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-burgundy-50/30 dark:bg-slate-800/30 dark:hover:bg-burgundy-950/20 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-burgundy-100 dark:bg-burgundy-950/80 text-burgundy-900 dark:text-burgundy-300 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    {isParsing ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8" />
                    )}
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 mb-1">
                    {isParsing ? "جاري قراءة وتحليل ملف الإكسل..." : "انقر لاختيار ملف أو اسحبه إلى هنا"}
                  </h4>
                  <p className="text-xs text-slate-500">
                    يدعم ملفات Excel (`.xlsx` و `.xls`) أو ملفات القيم المفصولة (`.csv`)
                  </p>
                </div>
              )}

              {/* Mode B: Direct Table Copy-Paste */}
              {inputMode === "paste" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>
                      انسخ الصفوف مباشرة من ملف Word أو Excel أو Google Sheets والصقها هنا:
                    </span>
                    <span className="text-burgundy-800 dark:text-burgundy-300 font-bold">
                      يدعم التبويب Tab والفواصل
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={`مثال:\nمحمد أحمد عبد الله\t0781234567\tحفظ سورة البقرة\nعمر خالد المحمود\t0799876543\tطالب مستجد`}
                    className="w-full p-3.5 text-xs sm:text-sm font-mono rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-burgundy-700 focus:border-transparent text-right"
                  />
                  <Button
                    type="button"
                    onClick={handleParsePasted}
                    disabled={isParsing || !pastedText.trim()}
                    className="w-full h-11 bg-burgundy-900 hover:bg-burgundy-800 text-white font-black rounded-xl gap-2 shadow-md"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري معالجة البيانات...</span>
                      </>
                    ) : (
                      <>
                        <span>متابعة للمعاينة والتأكيد</span>
                        <ArrowLeft className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PREVIEW & INLINE EDITING */}
          {/* ========================================================================= */}
          {step === "preview" && (
            <div className="space-y-5">
              {/* Column Mapping Toolbar */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-islamicGold-600" />
                    <span>مطابقة أعمدة الملف مع بيانات النظام:</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    تم التعرف التلقائي الذكي على الحقول
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      عمود اسم الطالب *:
                    </label>
                    <select
                      value={columnMapping.nameCol}
                      onChange={(e) => handleMappingChange("nameCol", e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                    >
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      عمود هاتف ولي الأمر:
                    </label>
                    <select
                      value={columnMapping.parentPhoneCol}
                      onChange={(e) => handleMappingChange("parentPhoneCol", e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                    >
                      <option value="">-- بدون هاتف --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      عمود الملاحظات (اختياري):
                    </label>
                    <select
                      value={columnMapping.notesCol}
                      onChange={(e) => handleMappingChange("notesCol", e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold"
                    >
                      <option value="">-- بدون ملاحظات --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Status Summary Cards */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black">
                    إجمالي الصفوف: {normalizedStudents.length}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black">
                    صالحة للإدراج: {validStudents.length}
                  </span>
                  {normalizedStudents.length - validStudents.length > 0 && (
                    <span className="px-3 py-1 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-black">
                      غير صالحة (بدون اسم): {normalizedStudents.length - validStudents.length}
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddManualRow}
                  className="h-8 text-xs font-bold gap-1 rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة صف يدوياً</span>
                </Button>
              </div>

              {/* Interactive Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-100/90 dark:bg-slate-800/90 sticky top-0 z-10 text-slate-700 dark:text-slate-200 font-black">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5">اسم الطالب (إلزامي)</th>
                      <th className="p-2.5">هاتف ولي الأمر</th>
                      <th className="p-2.5">ملاحظات</th>
                      <th className="p-2.5 w-12 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {normalizedStudents.map((st, idx) => (
                      <tr
                        key={st.id}
                        className={`transition-colors ${
                          !st.isValid
                            ? "bg-rose-50/60 dark:bg-rose-950/20"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="p-2 text-center text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-2">
                          <Input
                            type="text"
                            value={st.name}
                            onChange={(e) =>
                              handleStudentFieldChange(st.id, "name", e.target.value)
                            }
                            placeholder="اسم الطالب الثلاثي..."
                            className={`h-8 text-xs font-bold ${
                              !st.isValid ? "border-rose-400 focus:border-rose-500" : ""
                            }`}
                          />
                        </td>
                        <td className="p-2">
                          <div className="relative">
                            <Input
                              type="text"
                              value={st.parent_phone}
                              onChange={(e) =>
                                handleStudentFieldChange(st.id, "parent_phone", e.target.value)
                              }
                              placeholder="07xxxxxxxx"
                              dir="ltr"
                              className={`h-8 text-xs font-bold text-right ${
                                st.phoneStatus === "valid"
                                  ? "border-emerald-300 dark:border-emerald-800"
                                  : st.phoneStatus === "warning"
                                  ? "border-amber-300 dark:border-amber-800"
                                  : ""
                              }`}
                            />
                            {st.phoneStatus === "valid" && (
                              <span className="absolute left-2 top-2 text-[10px] text-emerald-600 font-bold pointer-events-none">
                                ✓ أردني
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <Input
                            type="text"
                            value={st.notes || ""}
                            onChange={(e) =>
                              handleStudentFieldChange(st.id, "notes", e.target.value)
                            }
                            placeholder="ملاحظات..."
                            className="h-8 text-xs font-medium"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(st.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950 transition-colors"
                            title="حذف هذا الصف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Navigation Toolbar */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("input")}
                  disabled={isSubmitting}
                  className="rounded-xl gap-1.5 text-xs font-bold"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>العودة لاختيار الملف</span>
                </Button>

                <Button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isSubmitting || validStudents.length === 0}
                  className="h-11 px-6 bg-burgundy-900 hover:bg-burgundy-800 text-white font-black rounded-xl gap-2 shadow-md disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-islamicGold-300" />
                      <span>جاري تسكين الطلاب وتوليد الروابط...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-islamicGold-300" />
                      <span>
                        تأكيد استيراد ({validStudents.length}) طالب في حلقة {selectedCircle?.name}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: SUCCESS REPORT & EXPORT */}
          {/* ========================================================================= */}
          {step === "success" && importResult && (
            <div className="py-6 text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  تم الاستيراد بنجاح وتوليد الأكواد! 🎉
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  تم تسكين{" "}
                  <strong className="text-emerald-700 dark:text-emerald-300 font-black">
                    {importResult.insertedCount}
                  </strong>{" "}
                  طالب بنجاح في حلقة (
                  <strong className="text-burgundy-900 dark:text-burgundy-200">
                    {selectedCircle?.name}
                  </strong>
                  ) وتوليد روابط متابعة أولياء الأمور المخصصة لهم.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="max-w-md mx-auto flex flex-col gap-3">
                <Button
                  type="button"
                  onClick={handleExportLinks}
                  disabled={isExporting}
                  className="w-full h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-2xl gap-2 shadow-md"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isExporting
                      ? "جاري إنشاء كشف الإكسل..."
                      : "تحميل كشف روابط متابعة الطلاب (Excel) 📥"}
                  </span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1 h-11 rounded-2xl text-xs font-bold gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>استيراد دفعة أخرى</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={onClose}
                    className="flex-1 h-11 bg-burgundy-900 hover:bg-burgundy-800 text-white font-black rounded-2xl text-xs"
                  >
                    <span>إغلاق والعودة للوحة التحكم</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
