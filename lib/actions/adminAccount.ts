"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "./auth";
import { validateAndFormatJordanianPhone } from "@/lib/phoneUtils";
import { revalidatePath } from "next/cache";

export interface AdminActionResult<T = void> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface AdminAccountDetails {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
}

/**
 * Verify caller is an active authenticated admin
 */
async function checkAdminCaller() {
  const { user, profile, isAdmin } = await getCurrentUserProfile();
  if (!user) {
    return { authorized: false, user: null, profile: null, error: "يجب تسجيل الدخول أولاً" };
  }
  if (!isAdmin || profile?.role !== "admin") {
    return { authorized: false, user, profile, error: "هذا الإجراء متاح فقط لمدير المركز" };
  }
  return { authorized: true, user, profile, error: null };
}

/**
 * Retrieve current admin profile & account details
 */
export async function getAdminAccountDetails(): Promise<AdminActionResult<AdminAccountDetails>> {
  try {
    const auth = await checkAdminCaller();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "غير مصرح" };
    }

    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, phone, role")
      .eq("id", auth.user.id)
      .maybeSingle();

    return {
      success: true,
      data: {
        id: auth.user.id,
        fullName: profile?.full_name || auth.profile?.full_name || "",
        phone: profile?.phone || auth.profile?.phone || "",
        email: auth.user.email || "",
        role: profile?.role || "admin",
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "تعذر جلب بيانات الحساب",
    };
  }
}

/**
 * Update Admin Profile information (Full Name & Phone Number)
 */
export async function updateAdminProfileInfo(payload: {
  fullName: string;
  phone?: string;
}): Promise<AdminActionResult<{ fullName: string; phone: string }>> {
  try {
    const auth = await checkAdminCaller();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "غير مصرح" };
    }

    const trimmedName = payload.fullName.trim();
    if (!trimmedName || trimmedName.length < 3) {
      return { success: false, error: "يرجى إدخال اسم ثلاثي صحيح لا يقل عن 3 أحرف" };
    }

    let formattedPhone = "";
    if (payload.phone && payload.phone.trim()) {
      const phoneValidation = validateAndFormatJordanianPhone(payload.phone);
      if (!phoneValidation.isValid) {
        return {
          success: false,
          error: phoneValidation.error || "يرجى إدخال رقم هاتف أردني صحيح (مثال: 0789894722)",
        };
      }
      formattedPhone = phoneValidation.local || payload.phone.trim();
    }

    const supabase = createClient();

    // 1. Update public.profiles
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        full_name: trimmedName,
        phone: formattedPhone || null,
      })
      .eq("id", auth.user.id);

    if (profileErr) {
      return { success: false, error: `تعذر تحديث الملف الشخصي: ${profileErr.message}` };
    }

    // 2. Also update auth user metadata for consistency
    await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
        phone: formattedPhone || null,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/admin");

    return {
      success: true,
      message: "تم تحديث البيانات الشخصية ورقم الهاتف بنجاح",
      data: {
        fullName: trimmedName,
        phone: formattedPhone,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ أثناء حفظ البيانات",
    };
  }
}

/**
 * Update Admin Password / Login Code
 */
export async function updateAdminPassword(payload: {
  newPassword: string;
  confirmPassword: string;
}): Promise<AdminActionResult> {
  try {
    const auth = await checkAdminCaller();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "غير مصرح" };
    }

    const { newPassword, confirmPassword } = payload;

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "يجب ألا تقل كلمة المرور عن 6 خانات" };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, error: "كلمتا المرور غير متطابقتين، يرجى إعادة التأكد" };
    }

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      const errMsg = error.message.toLowerCase();
      if (
        errMsg.includes("same_password") ||
        errMsg.includes("different from the old") ||
        (error as { code?: string }).code === "same_password"
      ) {
        return {
          success: false,
          error: "كلمة المرور الجديدة مطابقة لكلمة المرور الحالية، يرجى اختيار كلمة مختلفة",
        };
      }
      return { success: false, error: `فشل تحديث كلمة المرور: ${error.message}` };
    }

    return {
      success: true,
      message: "تم تغيير كلمة المرور بنجاح! احتفظ ببياناتك الجديدة في مكان آمن.",
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تحديث كلمة المرور",
    };
  }
}

/**
 * Update Admin Email Address
 */
export async function updateAdminEmail(payload: {
  newEmail: string;
}): Promise<AdminActionResult<{ requiresConfirmation: boolean; newEmail: string }>> {
  try {
    const auth = await checkAdminCaller();
    if (!auth.authorized || !auth.user) {
      return { success: false, error: auth.error || "غير مصرح" };
    }

    const trimmedEmail = payload.newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, error: "يرجى إدخال بريد إلكتروني صحيح (مثال: admin@example.com)" };
    }

    if (trimmedEmail === auth.user.email?.toLowerCase()) {
      return { success: false, error: "البريد الإلكتروني الجديد مطابق للبريد الحالي المستخدم" };
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({
      email: trimmedEmail,
    });

    if (error) {
      const errMsg = error.message.toLowerCase();
      if (errMsg.includes("already registered") || errMsg.includes("unique")) {
        return {
          success: false,
          error: "هذا البريد الإلكتروني مسجل بالفعل لحساب آخر في النظام",
        };
      }
      return { success: false, error: `فشل تحديث البريد الإلكتروني: ${error.message}` };
    }

    const isPendingConfirmation = Boolean((data?.user as any)?.new_email);

    revalidatePath("/", "layout");
    revalidatePath("/admin");

    return {
      success: true,
      message: isPendingConfirmation
        ? `تم إرسال رابط تأكيد إلى البريد الجديد (${trimmedEmail}). يرجى تفقد صندوق الوارد والضغط على الرابط لإتمام التغيير.`
        : `تم تحديث البريد الإلكتروني بنجاح إلى (${trimmedEmail}).`,
      data: {
        requiresConfirmation: isPendingConfirmation,
        newEmail: trimmedEmail,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ أثناء تحديث البريد الإلكتروني",
    };
  }
}
