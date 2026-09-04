import Link from "next/link";
import { ArrowLeft, Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MosqueLogo } from "@/components/common/MosqueLogo";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 via-islamicGold-50/20 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 relative overflow-hidden">
      {/* Subtle Islamic Arch Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-islamicGold-300/10 via-emerald-600/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <MosqueLogo variant="badge" size="sm" alt="شعار مسجد حذيفة بن اليمان" />
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
                متابع الحفظ
              </h1>
              <p className="text-[11px] font-bold text-islamicGold-700 dark:text-islamicGold-300">
                مسجد حذيفة بن اليمان
              </p>
            </div>
          </Link>

          <Link href="/login">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-emerald-700/30 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-bold rounded-xl"
            >
              <span>تسجيل الدخول</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:py-16 text-center max-w-3xl mx-auto w-full my-auto">
        {/* Official Mosque Logo - Top Primary Focal Point */}
        <div className="relative mb-6 sm:mb-8 group">
          <div className="relative bg-white/80 dark:bg-slate-900/90 p-5 sm:p-7 rounded-3xl border border-islamicGold-300/50 dark:border-islamicGold-700/40 shadow-xl shadow-islamicGold-950/5 backdrop-blur-md max-w-[280px] sm:max-w-[320px] mx-auto transition-transform duration-300 group-hover:scale-[1.02]">
            <MosqueLogo
              variant="full"
              size="2xl"
              width={280}
              height={280}
              className="mx-auto w-auto h-auto max-h-[180px] sm:max-h-[210px] object-contain drop-shadow-sm"
              priority
              alt="الشعار الرسمي لمسجد حذيفة بن اليمان"
            />
          </div>
        </div>

        {/* System Title Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 dark:bg-emerald-950/70 border border-emerald-300/50 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-xs font-black mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-islamicGold-600 dark:text-islamicGold-400 shrink-0" />
          <span>الهوية الرسمية • حلقات تدارس القرآن الكريم</span>
        </div>

        {/* Main Title: متابع الحفظ */}
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight mb-4">
          متابع الحفظ
        </h2>

        {/* Brief System Description */}
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed mb-8 font-medium">
          المنصة الإلكترونية الرسمية لمتابعة حفظ وتسميع القرآن الكريم، وإدارة سجلات الحضور والتقييم اليومي لطلاب حلقات مسجد حذيفة بن اليمان بكل يسر واحترافية.
        </p>

        {/* Single Primary Action Button: دخول بوابة المعلمين */}
        <div className="w-full max-w-md flex flex-col items-center gap-4">
          <Link href="/login" className="w-full">
            <Button
              size="lg"
              className="w-full h-14 text-base sm:text-lg font-black bg-gradient-to-r from-emerald-900 via-teal-800 to-emerald-900 hover:from-emerald-800 hover:to-teal-700 text-white rounded-2xl shadow-xl shadow-emerald-950/20 border border-islamicGold-400/40 gap-3 group transition-all duration-300 active:scale-[0.98]"
            >
              <UserCheck className="w-5 h-5 text-islamicGold-300 group-hover:scale-110 transition-transform" />
              <span>دخول بوابة المعلمين</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>

          {/* Discreet Parent Quick Access */}
          <Link
            href="/parent"
            className="text-xs sm:text-sm font-bold text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors py-1 flex items-center gap-1.5"
          >
            <span>هل أنت ولي أمر؟ اضغط هنا لمتابعة إنجاز ابنك</span>
            <span className="text-islamicGold-600 dark:text-islamicGold-400">←</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-5 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-bold">
            مسجد حذيفة بن اليمان • عمان - طبربور
          </p>
          <p>© {new Date().getFullYear()} متابع الحفظ - جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
