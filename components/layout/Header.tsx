"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, LogOut, WifiOff, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutTeacher } from "@/lib/actions/auth";
import { useNetworkSync } from "@/lib/hooks/useNetworkSync";
import { PWAInstallButton } from "@/components/common/PWAInstallButton";
import { MosqueLogo } from "@/components/common/MosqueLogo";

export function Header() {
  const pathname = usePathname();
  const { isOnline, pendingCount, isSyncing } = useNetworkSync();

  const navItems = [
    { href: "/dashboard", label: "اللوحة الرئيسية", icon: LayoutDashboard },
    { href: "/students", label: "قائمة الطلاب", icon: Users },
    { href: "/admin", label: "لوحة المدير", icon: ShieldCheck },
  ];

  return (
    <header className="no-print print:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-sm transition-all pt-safe">
      {/* ========================================================================= */}
      {/* Desktop Header (Visible on md+ screens) */}
      {/* ========================================================================= */}
      <div className="hidden md:flex max-w-7xl mx-auto px-4 h-16 items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <MosqueLogo variant="badge" size="sm" className="w-10 h-10" alt="شعار مركز طارق القرآني" />
            <div className="flex flex-col">
              <span className="font-black text-base sm:text-lg text-slate-900 dark:text-slate-50 leading-tight">
                متابع الحفظ
              </span>
              <span className="text-[10px] text-islamicGold-700 dark:text-islamicGold-300 font-bold hidden sm:inline">
                مركز طارق القرآني
              </span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1.5 mr-6 border-r border-slate-200 dark:border-slate-800 pr-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? "bg-burgundy-50 dark:bg-burgundy-950/70 text-burgundy-900 dark:text-burgundy-300 shadow-sm border border-burgundy-200/60 dark:border-burgundy-800/60"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-burgundy-700 dark:text-burgundy-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Profile / Network Badge / Logout Action */}
        <div className="flex items-center gap-2">
          {/* PWA Install Trigger Button */}
          <PWAInstallButton />

          {/* Subtle Online / Offline Status Badge */}
          {!isOnline ? (
            <div
              title={`أنت تعمل بدون اتصال. يوجد ${pendingCount} سجل محفوظ محلياً`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-[11px] font-black text-amber-900 dark:text-amber-300 animate-pulse"
            >
              <WifiOff className="w-3 h-3" />
              <span>أوفلاين {pendingCount > 0 && `(${pendingCount})`}</span>
            </div>
          ) : isSyncing ? (
            <div
              title="جارٍ المزامنة مع الخادم..."
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-burgundy-100 dark:bg-burgundy-950/80 border border-burgundy-300 dark:border-burgundy-800 text-[11px] font-black text-burgundy-900 dark:text-burgundy-300"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>مزامنة...</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-burgundy-50 dark:bg-slate-800 border border-burgundy-100 dark:border-slate-700 text-xs font-bold text-burgundy-900 dark:text-burgundy-300">
              <span className="w-2 h-2 rounded-full bg-islamicGold-500 animate-pulse"></span>
              <span>{pathname?.startsWith("/admin") ? "مدير المركز 👑" : "معلم الحلقة 📖"}</span>
            </div>
          )}

          <form action={logoutTeacher}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">خروج</span>
            </Button>
          </form>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Native Mobile App Header (Visible ONLY on mobile: md:hidden) */}
      {/* ========================================================================= */}
      <div className="flex md:hidden items-center justify-between px-3.5 h-14 relative w-full">
        {/* Right side (RTL start): Mosque Identity Icon Badge */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 group shrink-0 focus:outline-none"
          aria-label="الرئيسية - متابع الحفظ"
        >
          <MosqueLogo variant="badge" size="sm" className="w-9 h-9" alt="شعار مركز طارق القرآني" />
        </Link>

        {/* Center: Main Visual Focal Point (Title «متابع الحفظ») */}
        <Link
          href="/dashboard"
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center focus:outline-none max-w-[170px] pointer-events-auto"
        >
          <span className="font-black text-[15px] text-slate-900 dark:text-slate-50 tracking-tight leading-none">
            متابع الحفظ
          </span>
          <span className="text-[10px] text-islamicGold-700 dark:text-islamicGold-300 font-bold hidden min-[390px]:inline-block leading-none mt-0.5">
            مركز طارق القرآني
          </span>
        </Link>

        {/* Left side (RTL actions): Install Button + Secondary Logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Subtle Mobile Offline / Sync Status Indicator */}
          {!isOnline ? (
            <div
              title={`أنت تعمل بدون اتصال (${pendingCount} سجل معلق)`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-[10px] font-black text-amber-900 dark:text-amber-300 animate-pulse"
            >
              <WifiOff className="w-3 h-3" />
              <span className="hidden min-[360px]:inline">أوفلاين</span>
            </div>
          ) : isSyncing ? (
            <div
              title="جارٍ المزامنة مع الخادم..."
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-burgundy-100 dark:bg-burgundy-950/80 border border-burgundy-300 dark:border-burgundy-800 text-[10px] font-black text-burgundy-900 dark:text-burgundy-300"
            >
              <RefreshCw className="w-3 h-3 animate-spin" />
            </div>
          ) : null}

          {/* Integrated Sleek Install App Pill */}
          <PWAInstallButton variant="header" />

          {/* Visually Secondary Logout Button */}
          <form action={logoutTeacher}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              title="تسجيل الخروج"
              aria-label="تسجيل الخروج"
              className="w-9 h-9 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 rounded-xl font-bold transition-colors active:scale-95 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
