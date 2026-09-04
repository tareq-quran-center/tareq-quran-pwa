import React from "react";
import Image from "next/image";

export interface MosqueLogoProps {
  variant?: "full" | "arches" | "icon" | "center" | "badge";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "custom";
  width?: number;
  height?: number;
  className?: string;
  gold?: boolean;
  priority?: boolean;
  alt?: string;
}

const sizeMap = {
  xs: { width: 24, height: 24, badgeSize: "w-7 h-7" },
  sm: { width: 36, height: 36, badgeSize: "w-9 h-9" },
  md: { width: 54, height: 48, badgeSize: "w-11 h-11" },
  lg: { width: 90, height: 80, badgeSize: "w-16 h-16" },
  xl: { width: 140, height: 125, badgeSize: "w-24 h-24" },
  "2xl": { width: 260, height: 230, badgeSize: "w-36 h-36" },
};

export function MosqueLogo({
  variant = "full",
  size = "md",
  width,
  height,
  className = "",
  gold = false,
  priority = false,
  alt = "شعار مركز طارق القرآني",
}: MosqueLogoProps) {
  const currentSize = size !== "custom" ? sizeMap[size] : { width: width || 48, height: height || 48, badgeSize: "w-11 h-11" };
  const targetWidth = width || currentSize.width;
  const targetHeight = height || currentSize.height;

  if (variant === "badge") {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-burgundy-950 via-burgundy-900 to-burgundy-800 text-amber-300 border-2 border-islamicGold-400/70 shadow-md shadow-burgundy-950/30 overflow-hidden relative group shrink-0 ${currentSize.badgeSize} ${className}`}
        style={size === "custom" && width ? { width, height } : undefined}
      >
        <Image
          src="/images/tareq-logo.jpg"
          alt={alt}
          width={targetWidth}
          height={targetHeight}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          priority={priority}
          unoptimized={true}
        />
      </div>
    );
  }

  // Full, arches, center, icon variants all present the beautiful new emblem
  return (
    <div className={`relative inline-block rounded-full overflow-hidden p-0.5 border border-islamicGold-400/40 shadow-sm ${className}`}>
      <Image
        src="/images/tareq-logo.jpg"
        alt={alt}
        width={targetWidth}
        height={targetHeight}
        className="object-contain rounded-full drop-shadow-sm transition-transform duration-300 hover:scale-[1.02]"
        priority={priority}
        unoptimized={true}
      />
    </div>
  );
}
