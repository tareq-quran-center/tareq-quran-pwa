import { getStudentTrackData } from "@/lib/actions/track";
import { PublicTrackCard } from "@/components/track/PublicTrackCard";
import { MosqueLogo } from "@/components/common/MosqueLogo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

interface TrackPageProps {
  params: {
    code: string;
  };
}

export default async function TrackStudentPage({ params }: TrackPageProps) {
  const data = await getStudentTrackData(params.code);

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

          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-bold rounded-xl border-slate-300 dark:border-slate-700"
            >
              <span>الرئيسية</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        <PublicTrackCard data={data} />
      </main>
    </div>
  );
}
