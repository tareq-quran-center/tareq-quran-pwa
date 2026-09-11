import { getStudentTrackData } from "@/lib/actions/track";
import { redirect } from "next/navigation";
import { MosqueLogo } from "@/components/common/MosqueLogo";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

interface TrackPageProps {
  params: {
    code: string;
  };
}

export default async function TrackStudentPage({ params }: TrackPageProps) {
  const data = await getStudentTrackData(params.code);

  if (data.success && data.student?.parent_token) {
    redirect(`/parent/${data.student.parent_token}`);
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <MosqueLogo variant="badge" size="sm" className="w-10 h-10" alt="مركز طارق القرآني" />
            <div>
              <span className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-50 block leading-tight">
                متابع الحفظ
              </span>
              <span className="text-[10px] text-islamicGold-700 dark:text-islamicGold-300 font-bold block">
                مركز طارق القرآني
              </span>
            </div>
          </Link>

          <Link href="/track">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-bold rounded-xl border-slate-300 dark:border-slate-700"
            >
              <span>البحث مجدداً</span>
              <Search className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-16 flex items-center justify-center">
        <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 p-8 text-center space-y-5 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">
              لم يتم العثور على بيانات الطالب
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {data.error || "تأكد من صحة رقم هاتف ولي الأمر أو رمز المتابعة المدخل، أو تواصل مع إدارة الحلقة."}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link href="/track" className="w-full">
              <Button className="w-full bg-burgundy-900 hover:bg-burgundy-800 text-white font-bold rounded-2xl h-11 gap-2">
                <Search className="w-4 h-4 text-islamicGold-300" />
                <span>إعادة المحاولة برقم آخر</span>
              </Button>
            </Link>
            <Link href="/" className="w-full">
              <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-800 rounded-2xl text-xs">
                العودة للصفحة الرئيسية
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-slate-400">
        مركز طارق القرآني — متابع الحفظ
      </footer>
    </div>
  );
}
