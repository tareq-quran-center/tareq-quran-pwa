"use client";

import React from "react";
import { Facebook } from "lucide-react";
import { lightHaptic } from "@/lib/haptics";

export interface SocialLinksProps {
  className?: string;
  iconSize?: "sm" | "md" | "lg";
  showLabels?: boolean;
}

export const OFFICIAL_SOCIAL_LINKS = [
  {
    id: "facebook",
    name: "صفحتنا على فيسبوك",
    title: "صفحة مركز طارق القرآني على فيسبوك",
    url: "https://www.facebook.com/share/p/19sanaeGpj/",
    icon: Facebook,
    hoverClass:
      "hover:bg-[#1877F2] hover:text-white hover:border-transparent hover:shadow-md hover:shadow-blue-500/20",
    colorClass:
      "text-[#1877F2] dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50",
  },
];

export function SocialLinks({
  className = "",
  iconSize = "md",
  showLabels = false,
}: SocialLinksProps) {
  const sizeClasses = {
    sm: "w-8 h-8 p-1.5 rounded-xl",
    md: "w-9 h-9 p-2 rounded-xl",
    lg: "w-11 h-11 p-2.5 rounded-2xl",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {OFFICIAL_SOCIAL_LINKS.map((item) => {
        const Icon = item.icon;

        return (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={item.title}
            aria-label={item.title}
            onClick={() => lightHaptic()}
            className={`group inline-flex items-center justify-center gap-2 transition-all duration-200 border transform active:scale-95 ${
              showLabels
                ? "px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-md"
                : sizeClasses[iconSize]
            } ${item.colorClass} ${item.hoverClass}`}
          >
            <Icon
              className={`${iconSizes[iconSize]} transition-transform duration-200 group-hover:scale-110`}
            />
            {showLabels && <span className="text-xs font-bold">{item.name}</span>}
          </a>
        );
      })}
    </div>
  );
}
