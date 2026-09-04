"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/dashboard",
      label: "الرئيسية",
      icon: LayoutDashboard,
    },
    {
      href: "/students",
      label: "الطلاب",
      icon: Users,
    },
  ];

  return (
    <nav aria-label="التنقل السفلي للجوال" className="bottom-nav no-print print:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 md:hidden shadow-lg shadow-slate-900/10 pb-safe">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-burgundy-900 dark:text-burgundy-300 font-black"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? "bg-burgundy-100/90 dark:bg-burgundy-950/80 text-burgundy-900 dark:text-burgundy-200 scale-105 border border-burgundy-200/60 dark:border-burgundy-800/60 shadow-xs"
                    : "bg-transparent"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
