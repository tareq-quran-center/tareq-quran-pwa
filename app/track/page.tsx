"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MosqueLogo } from "@/components/common/MosqueLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, ArrowLeft } from "lucide-react";

export default function TrackSearchPage() {
  const [code, setCode] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (clean) {
      router.push(`/track/${encodeURIComponent(clean)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 flex flex-col justify-between">
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <MosqueLogo variant="badge" size="sm" alt="مركز طارق القرآني" />
          <span className="font-black text-slate-900 dark:text-slate-100">مركز طارق القرآني</span>
        </Link>
        <Link href="/">
          <Button variant="ghost" size="sm" className="rounded-xl">
            الرئيسية
          </Button>
        </Link>
      </header>

      <main className="max-w-md w-full mx-auto px-4 py-12 text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-burgundy-50 dark:bg-burgundy-950/60 rounded-3xl flex items-center justify-center border border-burgundy-200 dark:border-burgundy-900 shadow-sm">
          <MosqueLogo variant="badge" size="md" alt="مركز طارق" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-burgundy-50 dark:bg-burgundy-950/60 border border-burgundy-200 text-burgundy-900 dark:text-burgundy-200 text-xs font-black">
            <Sparkles className="w-3.5 h-3.5 text-islamicGold-500" />
            <span>بوابة متابعة أولياء الأمور</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            متابعة إنجاز الطالب
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            أدخل رمز المتابعة الخاص بالطالب أو رقم هاتف ولي الأمر المسجل في الحلقة
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-3">
          <div className="relative">
            <Input
              type="text"
              placeholder="رمز المتابعة أو رقم الهاتف (مثال: 0791234567)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="h-12 text-center text-sm font-bold rounded-2xl border-slate-300 dark:border-slate-700 focus:border-burgundy-800"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-burgundy-900 hover:bg-burgundy-800 text-white font-black rounded-2xl gap-2 shadow-md"
          >
            <Search className="w-4 h-4 text-islamicGold-300" />
            <span>عرض تقرير الإنجاز</span>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </form>
      </main>

      <footer className="text-center py-4 text-xs text-slate-400">
        مركز طارق القرآني — متابع الحفظ
      </footer>
    </div>
  );
}
