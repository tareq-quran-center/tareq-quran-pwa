"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, AlertCircle, CheckCircle, Facebook, Info } from "lucide-react";
import { loginSchema, LoginInput } from "@/lib/validations/auth";
import { loginTeacher } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { MosqueLogo } from "@/components/common/MosqueLogo";

export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Login Form
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onLoginSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await loginTeacher(data);
    if (res.success) {
      setSuccessMessage("تم تسجيل الدخول بنجاح! جاري التوجيه...");
      const targetPath = res.data?.role === "admin" ? "/admin" : "/dashboard";
      setTimeout(() => {
        router.push(targetPath);
        router.refresh();
      }, 500);
    } else {
      setErrorMessage(res.error || "فشل تسجيل الدخول");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="flex justify-center mb-2">
            <MosqueLogo
              variant="full"
              size="xl"
              width={140}
              height={140}
              className="object-contain drop-shadow-md transition-transform duration-300 hover:scale-105"
              priority
              alt="شعار مركز طارق القرآني"
            />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900 dark:text-slate-50">
            تسجيل الدخول
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            بوابة المعلمين والإدارة • مركز مركز طارق القرآني
          </CardDescription>
        </CardHeader>

        <CardContent>
          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-lg bg-burgundy-50 border border-burgundy-200 text-burgundy-900 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 text-burgundy-700" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="login-email">البريد الإلكتروني</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="teacher@example.com"
                dir="ltr"
                className="text-left"
                {...loginForm.register("email")}
              />
              {loginForm.formState.errors.email && (
                <p className="text-xs text-rose-600 mt-1">{loginForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">كلمة المرور</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                dir="ltr"
                className="text-left"
                {...loginForm.register("password")}
              />
              {loginForm.formState.errors.password && (
                <p className="text-xs text-rose-600 mt-1">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 gap-2 text-base mt-2 bg-burgundy-900 hover:bg-burgundy-800 text-white font-bold rounded-xl shadow-md"
              disabled={isLoading}
            >
              <LogIn className="w-5 h-5" />
              <span>{isLoading ? "جاري التحقق..." : "تسجيل الدخول"}</span>
            </Button>
          </form>

          {/* Registration Notice */}
          <div className="mt-5 p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2.5 text-right leading-relaxed font-medium">
            <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              بيانات الدخول تُمنح فقط من خلال إدارة المركز. للتسجيل يُرجى مراجعة إدارة مركز طارق القرآني.
            </span>
          </div>

          {/* Official Center Facebook Link */}
          <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              تابع أنشطة وإعلانات المركز:
            </span>
            <a
              href="https://www.facebook.com/share/p/19sanaeGpj/"
              target="_blank"
              rel="noopener noreferrer"
              title="صفحة مركز طارق القرآني على فيسبوك"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-[#1877F2] text-[#1877F2] hover:text-white dark:bg-blue-950/50 dark:text-blue-300 dark:hover:text-white border border-blue-200/80 dark:border-blue-800/80 text-xs font-bold transition-all duration-200 shadow-xs hover:shadow-md active:scale-95 group"
            >
              <Facebook className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>صفحتنا على فيسبوك</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
