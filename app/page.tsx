import Link from "next/link";
import { ArrowLeft, Sparkles, UserCheck, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MosqueLogo } from "@/components/common/MosqueLogo";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 via-islamicGold-50/15 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-800 dark:text-slate-100 relative overflow-hidden">
      {/* Subtle Islamic Arch Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-islamicGold-300/15 via-burgundy-900/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <MosqueLogo variant="badge" size="sm" alt="شعار مركز طارق القرآني" />
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
                متابع الحفظ
              </h1>
              <p className="text-[11px] font-bold text-islamicGold-700 dark:text-islamicGold-300">
                مركز طارق القرآني
              </p>
            </div>
          </Link>

          <Link href="/login">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-burgundy-800/30 dark:border-burgundy-600/30 text-burgundy-900 dark:text-burgundy-200 hover:bg-burgundy-50 dark:hover:bg-burgundy-950/60 font-bold rounded-xl"
            >
              <span>تسجيل الدخول</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:py-16 text-center max-w-3xl mx-auto w-full my-auto">
        {/* Official Center Logo - Top Primary Focal Point */}
        <div className="relative mb-6 sm:mb-8 group">
          <div className="relative bg-white/90 dark:bg-slate-900/90 p-3 sm:p-4 rounded-full border-2 border-islamicGold-400/60 dark:border-islamicGold-600/50 shadow-2xl shadow-burgundy-950/15 backdrop-blur-md max-w-[240px] sm:max-w-[280px] mx-auto transition-transform duration-300 group-hover:scale-[1.03]">
            <MosqueLogo
              variant="full"
              size="2xl"
              width={260}
              height={260}
              className="mx-auto w-auto h-auto max-h-[220px] sm:max-h-[250px] object-contain drop-shadow-md"
              priority
              alt="الشعار الرسمي لمركز طارق القرآني"
            />
          </div>
        </div>

        {/* System Title Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-burgundy-50 dark:bg-burgundy-950/70 border border-burgundy-200/70 dark:border-burgundy-800/60 text-burgundy-900 dark:text-burgundy-200 text-xs font-black mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-islamicGold-600 dark:text-islamicGold-400 shrink-0" />
          <span>جمعية المحافظة على القرآن الكريم • مركز طارق القرآني</span>
        </div>

        {/* Main Title: متابع الحفظ */}
        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight mb-4">
          متابع الحفظ
        </h2>

        {/* Brief System Description */}
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed mb-8 font-medium">
          المنصة الإلكترونية الرسمية لمتابعة حفظ وتسميع القرآن الكريم، وإدارة سجلات الحضور والتقييم اليومي لطلاب حلقات مركز طارق القرآني بكل يسر واحترافية.
        </p>

        {/* Single Primary Action Button: دخول بوابة المعلمين */}
        <div className="w-full max-w-md flex flex-col items-center gap-4">
          <Link href="/login" className="w-full">
            <Button
              size="lg"
              className="w-full h-14 text-base sm:text-lg font-black bg-gradient-to-r from-burgundy-900 via-burgundy-800 to-burgundy-900 hover:from-burgundy-800 hover:to-burgundy-700 text-white rounded-2xl shadow-xl shadow-burgundy-950/25 border border-islamicGold-400/50 gap-3 group transition-all duration-300 active:scale-[0.98]"
            >
              <UserCheck className="w-5 h-5 text-islamicGold-300 group-hover:scale-110 transition-transform" />
              <span>دخول بوابة المعلمين</span>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>

          {/* Discreet Parent Quick Access */}
          <Link
            href="/parent"
            className="text-xs sm:text-sm font-bold text-slate-500 hover:text-burgundy-800 dark:text-slate-400 dark:hover:text-burgundy-300 transition-colors py-1 flex items-center gap-1.5"
          >
            <span>هل أنت ولي أمر؟ اضغط هنا لمتابعة إنجاز ابنك</span>
            <span className="text-islamicGold-600 dark:text-islamicGold-400">←</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-5 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-bold">
            مركز طارق القرآني • عمان - طبربور
          </p>
          <a
            href="https://www.facebook.com/share/p/19sanaeGpj/"
            target="_blank"
            rel="noopener noreferrer"
            title="صفحة مركز طارق القرآني على فيسبوك"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-[#1877F2] text-[#1877F2] hover:text-white dark:bg-blue-950/50 dark:text-blue-300 dark:hover:text-white border border-blue-200/80 dark:border-blue-800/80 text-xs font-bold transition-all duration-200 shadow-xs hover:shadow-md group"
          >
            <Facebook className="w-4 h-4 transition-transform group-hover:scale-110" />
            <span>صفحتنا على فيسبوك</span>
          </a>
          <p>© {new Date().getFullYear()} متابع الحفظ - جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
