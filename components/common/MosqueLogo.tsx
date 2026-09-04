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
  alt = "شعار مسجد حذيفة بن اليمان",
}: MosqueLogoProps) {
  const currentSize = size !== "custom" ? sizeMap[size] : { width: width || 48, height: height || 48, badgeSize: "w-11 h-11" };
  const targetWidth = width || currentSize.width;
  const targetHeight = height || currentSize.height;

  if (variant === "badge") {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-900 text-amber-300 border border-islamicGold-400/40 shadow-md shadow-emerald-950/20 overflow-hidden relative group shrink-0 ${currentSize.badgeSize} ${className}`}
        style={size === "custom" && width ? { width, height } : undefined}
      >
        {/* Subtle Islamic gold sheen */}
        <div className="absolute inset-0 bg-radial from-islamicGold-300/15 via-transparent to-transparent pointer-events-none" />
        <Image
          src="/images/logo-icon-gold.png"
          alt={alt}
          width={Math.round(targetWidth * 0.75)}
          height={Math.round(targetHeight * 0.75)}
          className="object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform duration-200"
          priority={priority}
          unoptimized={true}
        />
      </div>
    );
  }

  if (variant === "center") {
    return (
      <Image
        src={gold ? "/images/logo-icon-center-gold.png" : "/images/logo-icon-center.png"}
        alt={alt}
        width={targetWidth}
        height={targetHeight}
        className={`object-contain ${className}`}
        priority={priority}
        unoptimized={true}
      />
    );
  }

  if (variant === "arches" || variant === "icon") {
    return (
      <Image
        src={gold ? "/images/logo-icon-gold.png" : "/images/logo-arches.png"}
        alt={alt}
        width={targetWidth}
        height={targetHeight}
        className={`object-contain ${className}`}
        priority={priority}
        unoptimized={true}
      />
    );
  }

  // Full official logo with typography
  return (
    <Image
      src={gold ? "/images/logo-full-gold.png" : "/images/logo-full.png"}
      alt={alt}
      width={targetWidth}
      height={targetHeight}
      className={`object-contain ${className}`}
      priority={priority}
      unoptimized={true}
    />
  );
}
