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

export async function loginTeacher(data: LoginInput): Promise<ActionResult> {
  const validation = loginSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "بيانات الإدخال غير صحيحة",
    };
  }

  try {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
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

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الدخول",
    };
  }
}

export async function signupTeacher(data: SignupInput): Promise<ActionResult<{ requiresConfirmation: boolean }>> {
  const validation = signupSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.errors[0]?.message || "بيانات الإدخال غير صحيحة",
    };
  }

  try {
    const supabase = createClient();
    const { data: authData, error } = await supabase.auth.signUp({
      email: validation.data.email,
      password: validation.data.password,
      options: {
        data: {
          full_name: validation.data.full_name,
          phone: validation.data.phone || null,
        },
      },
    });

    if (error) {
      const errMsg = error.message?.toLowerCase() || "";
      if (error.status === 429 || errMsg.includes("rate limit")) {
        return {
          success: false,
          error:
            "تم تجاوز حد إرسال الرسائل في Supabase. يُرجى تعطيل 'Confirm email' من إعدادات Supabase، أو الانتظار قليلاً.",
        };
      }
      return {
        success: false,
        error: error.message || "فشل إنشاء الحساب، قد يكون البريد الإلكتروني مستخدماً بالفعل",
      };
    }

    // In Supabase with email enumeration protection, existing emails return empty identities array
    if (authData?.user?.identities && authData.user.identities.length === 0) {
      return {
        success: false,
        error: "هذا البريد الإلكتروني مسجل بالفعل. يرجى الانتقال إلى تبويب 'تسجيل الدخول'.",
      };
    }

    const requiresConfirmation = !authData?.session;

    revalidatePath("/", "layout");
    return {
      success: true,
      data: { requiresConfirmation },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء تسجيل الحساب",
    };
  }
}

export async function logoutTeacher(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
