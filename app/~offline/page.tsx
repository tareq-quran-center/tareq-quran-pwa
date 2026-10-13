"use client";

import Link from "next/link";
import { WifiOff, RotateCcw, Home, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MosqueLogo } from "@/components/common/MosqueLogo";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <MosqueLogo variant="badge" size="lg" alt="مركز طارق القرآني" />
            <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-amber-500 text-white shadow-md">
              <WifiOff className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            أنت في وضع عدم الاتصال
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            لا يتوفر اتصال بالإنترنت حالياً. إذا كنت قد سجلت الدخول مسبقاً، يمكنك متابعة العمل ورصد السجلات من الذاكرة المحلية وسيتم مزامنتها تلقائياً فور عودة الشبكة.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs font-bold leading-relaxed text-right">
          💡 <span className="underline">ملاحظة للمعلمين:</span> تسجيل الدخول لأول مرة يتطلب اتصالاً بالإنترنت لتوثيق الحساب. بعد تسجيل الدخول يمكنك العمل بدون إنترنت دائماً.
        </div>

        <div className="space-y-2.5 pt-2">
          <Button
            onClick={handleReload}
            className="w-full h-11 bg-burgundy-900 hover:bg-burgundy-800 text-white font-bold rounded-2xl gap-2 shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/dashboard" className="w-full">
              <Button variant="outline" className="w-full h-10 rounded-2xl text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700">
                <LayoutDashboard className="w-3.5 h-3.5 text-burgundy-700" />
                <span>لوحة الحلقات</span>
              </Button>
            </Link>

            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full h-10 rounded-2xl text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700">
                <Home className="w-3.5 h-3.5" />
                <span>الرئيسية</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-xs text-slate-400 font-medium">
        مركز طارق القرآني — متابع الحفظ
      </footer>
    </div>
  );
}
