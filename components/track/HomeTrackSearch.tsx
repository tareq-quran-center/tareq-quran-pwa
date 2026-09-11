"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { getStudentTrackData } from "@/lib/actions/track";

export function HomeTrackSearch() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (!clean || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await getStudentTrackData(clean);
      if (data.success && data.student?.parent_token) {
        router.push(`/parent/${data.student.parent_token}`);
      } else {
        setErrorMsg(
          data.error || "لم يتم العثور على طالب بهذا الرمز أو رقم الهاتف."
        );
        setIsLoading(false);
      }
    } catch {
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

      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 text-right animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSearch} className="space-y-2.5">
        <Input
          type="text"
          placeholder="رمز المتابعة أو رقم الهاتف (079xxxxxxx)..."
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          disabled={isLoading}
          className="h-12 text-center text-xs sm:text-sm font-bold rounded-2xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:border-burgundy-800 disabled:opacity-60"
          required
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-burgundy-900 hover:bg-burgundy-800 text-white font-black text-xs sm:text-sm rounded-2xl gap-2 shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 text-islamicGold-300 animate-spin" />
              <span>جاري البحث والتحميل...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4 text-islamicGold-300" />
              <span>عرض بطاقة الإنجاز</span>
              <ArrowLeft className="w-4 h-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
