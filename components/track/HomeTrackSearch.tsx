"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, ArrowLeft } from "lucide-react";

export function HomeTrackSearch() {
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
    <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-5 sm:p-6 border-2 border-islamicGold-400/50 shadow-xl shadow-burgundy-950/10 space-y-3.5 text-right">
      <div className="flex items-center gap-2">
        <span className="p-2 rounded-xl bg-burgundy-50 dark:bg-burgundy-950/80 text-burgundy-900 dark:text-burgundy-300">
          <Sparkles className="w-4 h-4 text-islamicGold-600" />
        </span>
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
            متابعة إنجاز الطالب
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            أدخل رمز الطالب أو رقم هاتف ولي الأمر
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="space-y-2.5">
        <Input
          type="text"
          placeholder="رمز المتابعة أو رقم الهاتف (079xxxxxxx)..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-12 text-center text-xs sm:text-sm font-bold rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:border-burgundy-800"
          required
        />
        <Button
          type="submit"
          className="w-full h-12 bg-burgundy-900 hover:bg-burgundy-800 text-white font-black text-xs sm:text-sm rounded-2xl gap-2 shadow-md transition-all active:scale-[0.98]"
        >
          <Search className="w-4 h-4 text-islamicGold-300" />
          <span>عرض بطاقة الإنجاز</span>
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
