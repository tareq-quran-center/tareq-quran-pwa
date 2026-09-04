import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  const variants = {
    default: "bg-burgundy-100 text-burgundy-900 dark:bg-burgundy-950/70 dark:text-burgundy-200 border border-burgundy-200/60 dark:border-burgundy-800/60",
    secondary: "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/60",
    success: "bg-burgundy-50 text-burgundy-900 dark:bg-burgundy-950/60 dark:text-burgundy-200 border border-islamicGold-400/50",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    danger: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    outline: "text-slate-950 border border-slate-200 dark:border-slate-800 dark:text-slate-50",
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props} />
  );
}

export { Badge };
