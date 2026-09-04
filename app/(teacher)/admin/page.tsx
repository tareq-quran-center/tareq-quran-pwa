import { getAdminCenterData } from "@/lib/actions/admin";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

export default async function AdminPage() {
  const data = await getAdminCenterData();

  if (!data.success) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-xl text-center space-y-4">
        <AlertCircle className="w-14 h-14 text-rose-500 mx-auto" />
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
          غير مصرح بالوصول إلى لوحة الإدارة
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {data.error || "يتطلب الوصول إلى لوحة تحكم المدير صلاحيات مدير المركز."}
        </p>
        <Link href="/dashboard">
          <Button className="bg-burgundy-900 hover:bg-burgundy-800 text-white rounded-xl">
            العودة للوحة المعلم
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <AdminDashboardClient
        initialData={{
          overview: data.overview,
          halaqat: data.halaqat,
          teachers: data.teachers,
          students: data.students,
          currentUserIsAdmin: data.currentUserIsAdmin,
        }}
      />
    </div>
  );
}
