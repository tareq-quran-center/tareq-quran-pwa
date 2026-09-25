"use client";

import { Sparkles, Zap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeacherDashboardClientProps {
  isAdmin?: boolean;
  onOpenLiveRecitation?: () => void;
}

export function TeacherDashboardClient({
  isAdmin = false,
  onOpenLiveRecitation,
}: TeacherDashboardClientProps) {
  return (
    <>
      {/* Compact Hero Banner */}
      <div className="hero-banner no-print print:hidden relative overflow-hidden bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-islamicGold-400/30">
        <div className="absolute inset-0 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-burgundy-800/80 border border-islamicGold-400/40 text-islamicGold-300 text-[11px] font-black shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-islamicGold-400" />
              <span>مساعد معلم القرآن الكريم</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              أهلاً بك، معلم الحلقة 📜
            </h1>
            <p className="text-burgundy-100/90 text-xs font-medium">
              متابعة دقيقة للحفظ والمراجعة والحضور اليومي • مركز طارق القرآني
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {onOpenLiveRecitation && (
              <Button
                onClick={onOpenLiveRecitation}
                className="bg-gradient-to-r from-islamicGold-500 to-amber-400 hover:from-islamicGold-600 hover:to-amber-500 text-burgundy-950 font-black text-xs px-4 py-2 rounded-xl shadow-md border border-islamicGold-300 gap-1.5 active:scale-95 transition-all"
              >
                <Zap className="w-4 h-4 fill-current text-burgundy-950" />
                <span>التسميع السريع للطلاب ⚡</span>
              </Button>
            )}

            {isAdmin && (
              <>
                <a
                  href="/admin"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-islamicGold-400/50 text-white text-xs font-bold transition-all shadow-xs backdrop-blur-xs"
                >
                  <span>لوحة المدير</span>
                  <span className="text-islamicGold-300">👑</span>
                </a>
                <a
                  href="/admin?settings=open"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-islamicGold-500 hover:from-amber-600 hover:to-islamicGold-600 text-burgundy-950 text-xs font-black transition-all shadow-md border border-islamicGold-300 active:scale-95"
                  title="إعدادات حساب المدير"
                >
                  <Settings className="w-3.5 h-3.5 text-burgundy-950" />
                  <span>إعدادات الحساب ⚙️</span>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
