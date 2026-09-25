"use server";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema, LoginInput, SignupInput } from "@/lib/validations/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function loginTeacher(data: LoginInput): Promise<ActionResult<{ role: string }>> {
  const validation = loginSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "بيانات الإدخال غير صحيحة",
    };
  }

  try {
    const supabase = createClient();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: validation.data.email,
      password: validation.data.password,
    });

    if (error) {
      const errMsg = error.message?.toLowerCase() || "";
      if (
        errMsg.includes("email not confirmed") ||
        (error as { code?: string }).code === "email_not_confirmed"
      ) {
        return {
          success: false,
          error:
            "لم يتم تفعيل الحساب بعد! يرجى تفقد بريدك الإلكتروني (بما في ذلك مجلد Spam) والضغط على رابط التفعيل، أو قم بتأكيد الحساب من لوحة تحكم Supabase.",
        };
      }

      if (error.status === 429 || errMsg.includes("rate limit")) {
        return {
          success: false,
          error:
            "تم تجاوز عدد المحاولات المسموح به مؤقتاً، يرجى الانتظار قليلاً ثم المحاولة لاحقاً.",
        };
      }

      return {
        success: false,
        error: "بيانات الدخول غير صحيحة، يرجى التأكد من البريد الإلكتروني وكلمة المرور",
      };
    }

    let role = "teacher";
    if (authData?.user?.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle();
      if (profile?.role) role = profile.role;
    }

    revalidatePath("/", "layout");
    return { success: true, data: { role } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الدخول",
    };
  }
}

export async function signupTeacher(_data: SignupInput): Promise<ActionResult<{ requiresConfirmation: boolean }>> {
  return {
    success: false,
    error: "تم إغلاق التسجيل الذاتي. بيانات الدخول تُمنح فقط من خلال إدارة مركز طارق القرآني.",
  };
}

export async function logoutTeacher(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getCurrentUserProfile(): Promise<{
  user: any;
  profile: {
    id: string;
    full_name: string;
    phone: string | null;
    role: "admin" | "teacher" | string;
    is_active: boolean;
  } | null;
  isAdmin: boolean;
}> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, profile: null, isAdmin: false };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const role = (profile as any)?.role || "teacher";
    const isActive = (profile as any)?.is_active ?? true;
    const isAdmin = role === "admin" && isActive;

    return {
      user,
      profile: profile
        ? {
            id: profile.id,
            full_name: profile.full_name,
            phone: profile.phone,
            role,
            is_active: isActive,
          }
        : null,
      isAdmin,
    };
  } catch {
    return { user: null, profile: null, isAdmin: false };
  }
}

