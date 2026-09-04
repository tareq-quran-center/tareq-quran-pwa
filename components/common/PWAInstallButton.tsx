"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone } from "lucide-react";
import { lightHaptic, successHaptic } from "@/lib/haptics";

export interface PWAInstallButtonProps {
  className?: string;
  variant?: "badge" | "button" | "header";
}

export function PWAInstallButton({
  className = "",
  variant = "badge",
}: PWAInstallButtonProps) {
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    // Only show if NOT standalone
    const isAppStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    setIsStandalone(isAppStandalone);
  }, []);

  if (isStandalone) return null;

  const handleInstallClick = async () => {
    lightHaptic();
    const prompt = window.deferredPwaPrompt;

    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === "accepted") {
          successHaptic();
        } else {
          window.dispatchEvent(new CustomEvent("open-pwa-install-modal"));
        }
      } catch {
        window.dispatchEvent(new CustomEvent("open-pwa-install-modal"));
      }
      window.deferredPwaPrompt = null;
    } else {
      window.dispatchEvent(new CustomEvent("open-pwa-install-modal"));
    }
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-burgundy-800 hover:bg-burgundy-900 active:scale-95 text-white font-bold text-xs shadow-md transition-all border border-islamicGold-400/40 ${className}`}
      >
        <Smartphone className="w-4 h-4 text-islamicGold-300" />
        <span>تثبيت التطبيق 📲</span>
      </button>
    );
  }

  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        title="تثبيت التطبيق على جهازك للوصول السريع"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-burgundy-50 hover:bg-burgundy-100 dark:bg-burgundy-950/60 dark:hover:bg-burgundy-900/60 text-burgundy-900 dark:text-burgundy-300 text-xs font-bold transition-all border border-burgundy-200/80 dark:border-burgundy-800/80 shadow-xs active:scale-95 ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-burgundy-700 dark:text-burgundy-400 shrink-0" />
        <span>تثبيت</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleInstallClick}
      title="تثبيت التطبيق على جهازك للوصول السريع"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-burgundy-800 hover:bg-burgundy-900 text-white text-[11px] font-black shadow-sm transition-all border border-islamicGold-400/60 active:scale-95 animate-pulse hover:animate-none ${className}`}
    >
      <Download className="w-3.5 h-3.5 text-islamicGold-300" />
      <span>تثبيت التطبيق 📲</span>
    </button>
  );
}
