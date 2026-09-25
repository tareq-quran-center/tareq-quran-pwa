"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Settings,
  User,
  Phone,
  Lock,
  Mail,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  ShieldCheck,
  KeyRound,
  Sparkles,
} from "lucide-react";
import {
  updateAdminProfileInfo,
  updateAdminPassword,
  updateAdminEmail,
  getAdminAccountDetails,
} from "@/lib/actions/adminAccount";

interface AdminAccountSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    role: string;
  };
  onProfileUpdated?: (updated: { fullName: string; phone: string; email?: string }) => void;
}

export function AdminAccountSettingsDialog({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}: AdminAccountSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "password" | "email">("profile");

  // Profile Form States
  const [fullName, setFullName] = useState(currentUser?.fullName || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Password Form States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Email Form States
  const [currentEmail, setCurrentEmail] = useState(currentUser?.email || "");
  const [newEmail, setNewEmail] = useState("");
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Refresh data on dialog open
  useEffect(() => {
    if (isOpen) {
      setProfileFeedback(null);
      setPasswordFeedback(null);
      setEmailFeedback(null);
      setNewPassword("");
      setConfirmPassword("");
      setNewEmail("");

      if (currentUser) {
        setFullName(currentUser.fullName);
        setPhone(currentUser.phone);
        setCurrentEmail(currentUser.email);
      } else {
        getAdminAccountDetails().then((res) => {
          if (res.success && res.data) {
            setFullName(res.data.fullName);
            setPhone(res.data.phone);
            setCurrentEmail(res.data.email);
          }
        });
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);
    setIsSubmittingProfile(true);

    try {
      const res = await updateAdminProfileInfo({ fullName, phone });
      if (res.success && res.data) {
        setProfileFeedback({ type: "success", message: res.message || "تم حفظ البيانات بنجاح" });
        if (onProfileUpdated) {
          onProfileUpdated({ fullName: res.data.fullName, phone: res.data.phone });
        }
      } else {
        setProfileFeedback({ type: "error", message: res.error || "تعذر حفظ التعديلات" });
      }
    } catch {
      setProfileFeedback({ type: "error", message: "حدث خطأ غير متوقع أثناء الحفظ" });
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  // Handle Password Update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 6) {
      setPasswordFeedback({ type: "error", message: "يجب ألا تقل كلمة المرور عن 6 خانات" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", message: "كلمتا المرور غير متطابقتين" });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await updateAdminPassword({ newPassword, confirmPassword });
      if (res.success) {
        setPasswordFeedback({ type: "success", message: res.message || "تم تحديث كلمة المرور بنجاح" });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordFeedback({ type: "error", message: res.error || "فشل تغيير كلمة المرور" });
      }
    } catch {
      setPasswordFeedback({ type: "error", message: "حدث خطأ غير متوقع أثناء تغيير كلمة المرور" });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Handle Email Update
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailFeedback(null);

    if (!newEmail.trim()) {
      setEmailFeedback({ type: "error", message: "يرجى كتابة البريد الإلكتروني الجديد" });
      return;
    }

    setIsSubmittingEmail(true);
    try {
      const res = await updateAdminEmail({ newEmail });
      if (res.success && res.data) {
        setEmailFeedback({ type: "success", message: res.message || "تم إرسال طلب التحديث بنجاح" });
        setCurrentEmail(res.data.newEmail);
        setNewEmail("");
        if (onProfileUpdated) {
          onProfileUpdated({ fullName, phone, email: res.data.newEmail });
        }
      } else {
        setEmailFeedback({ type: "error", message: res.error || "تعذر تحديث البريد الإلكتروني" });
      }
    } catch {
      setEmailFeedback({ type: "error", message: "حدث خطأ غير متوقع أثناء تحديث البريد" });
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 border-islamicGold-400/50 overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white shrink-0 border-b border-islamicGold-400/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-islamicGold-500/20 border border-islamicGold-400/40 text-islamicGold-300">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">إعدادات حساب مدير المركز</h3>
                <p className="text-xs text-islamicGold-200/80 font-medium">
                  إدارة بيانات الدخول، كلمة المرور، والمعلومات الشخصية
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Account Info Badge */}
        <div className="px-6 py-3 bg-amber-50/70 dark:bg-slate-800/60 border-b border-amber-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {fullName || "مدير المركز"}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-burgundy-100 dark:bg-burgundy-900/50 text-burgundy-900 dark:text-burgundy-300 text-[10px] font-black">
              صلاحية الإدارة العامة 👑
            </span>
          </div>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono dir-ltr">
            {currentEmail}
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "profile"
                ? "bg-white dark:bg-slate-800 text-burgundy-900 dark:text-islamicGold-300 shadow-sm border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>البيانات والهاتف</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("password")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "password"
                ? "bg-white dark:bg-slate-800 text-burgundy-900 dark:text-islamicGold-300 shadow-sm border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>كلمة المرور</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              activeTab === "email"
                ? "bg-white dark:bg-slate-800 text-burgundy-900 dark:text-islamicGold-300 shadow-sm border border-slate-200/80 dark:border-slate-700"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>البريد الإلكتروني</span>
          </button>
        </div>

        {/* Dialog Body (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* ============================================================== */}
          {/* TAB 1: Profile & Phone */}
          {/* ============================================================== */}
          {activeTab === "profile" && (
            <form onSubmit={handleSaveProfile} className="space-y-4 animate-in fade-in duration-200">
              {profileFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                    profileFeedback.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                  }`}
                >
                  {profileFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{profileFeedback.message}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="admin-full-name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  اسم المدير الكامل
                </Label>
                <div className="relative">
                  <Input
                    id="admin-full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: الشيخ عدنان الجالودي"
                    className="pr-10 rounded-xl border-slate-200 dark:border-slate-700 font-bold text-sm"
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-500">
                  يظهر هذا الاسم في ترويسة لوحة التحكم والتقارير الإدارية المعتمدة.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  رقم الهاتف للتواصل
                </Label>
                <div className="relative">
                  <Input
                    id="admin-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0789894722"
                    dir="ltr"
                    className="text-left font-mono pr-10 rounded-xl border-slate-200 dark:border-slate-700 text-sm"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-500">
                  يقبل الأرقام الأردنية (079، 078، 077) لاستخدامه في اتصالات الإدارة وتنبيهات الطوارئ.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmittingProfile}
                  className="w-full bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl font-bold text-xs py-2.5 gap-2 shadow-md transition-all active:scale-[0.99]"
                >
                  {isSubmittingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ حفظ التعديلات...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-islamicGold-400" />
                      <span>حفظ البيانات الشخصية</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* TAB 2: Change Password */}
          {/* ============================================================== */}
          {activeTab === "password" && (
            <form onSubmit={handleSavePassword} className="space-y-4 animate-in fade-in duration-200">
              {passwordFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                    passwordFeedback.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                  }`}
                >
                  {passwordFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-islamicGold-600" />
                  <span>تنبيه أمان كلمة المرور:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  اختر كلمة مرور قوية لا تقل عن 6 أحرف أو أرقام، واحتفظ بها لاستخدامها عند تسجيل الدخول القادم.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-new-password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  كلمة المرور الجديدة
                </Label>
                <div className="relative">
                  <Input
                    id="admin-new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="text-left font-mono pr-10 pl-10 rounded-xl border-slate-200 dark:border-slate-700 text-sm"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-confirm-password" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  تأكيد كلمة المرور الجديدة
                </Label>
                <div className="relative">
                  <Input
                    id="admin-confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    className="text-left font-mono pr-10 rounded-xl border-slate-200 dark:border-slate-700 text-sm"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmittingPassword || !newPassword}
                  className="w-full bg-gradient-to-r from-burgundy-900 to-burgundy-950 hover:from-burgundy-800 hover:to-burgundy-900 text-white rounded-xl font-bold text-xs py-2.5 gap-2 shadow-md transition-all active:scale-[0.99]"
                >
                  {isSubmittingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ التحديث...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-islamicGold-400" />
                      <span>تحديث كلمة المرور</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* TAB 3: Change Email */}
          {/* ============================================================== */}
          {activeTab === "email" && (
            <form onSubmit={handleSaveEmail} className="space-y-4 animate-in fade-in duration-200">
              {emailFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-start gap-2 ${
                    emailFeedback.type === "success"
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                  }`}
                >
                  {emailFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{emailFeedback.message}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  البريد الإلكتروني الحالي
                </Label>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-600 dark:text-slate-300 text-left dir-ltr">
                  {currentEmail}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-new-email" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  البريد الإلكتروني الجديد
                </Label>
                <div className="relative">
                  <Input
                    id="admin-new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new.email@example.com"
                    dir="ltr"
                    className="text-left font-mono pr-10 rounded-xl border-slate-200 dark:border-slate-700 text-sm"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  ملاحظة: في حال تفعيل تأكيد البريد في النظام، سيتم إرسال رسالة بريدية إلى العنوان الجديد لتأكيد التغيير.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmittingEmail || !newEmail}
                  className="w-full bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl font-bold text-xs py-2.5 gap-2 shadow-md transition-all active:scale-[0.99]"
                >
                  {isSubmittingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جارٍ التحديث...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 text-islamicGold-400" />
                      <span>تحديث البريد الإلكتروني</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs font-bold px-4 py-2 border-slate-300 dark:border-slate-700"
          >
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
