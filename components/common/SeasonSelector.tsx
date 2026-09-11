"use client";

import React, { useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SeasonRow } from "@/types";
import { Sun, Snowflake, BookOpen, Layers } from "lucide-react";

export interface SeasonSelectorProps {
  seasons: SeasonRow[];
  selectedSeasonId: string;
  onSeasonChange: (seasonId: string) => void;
  showAllOption?: boolean;
  className?: string;
  defaultSeasonId?: string;
}

const LOCAL_STORAGE_KEY = "tareq_center_selected_season";

export function SeasonSelector({
  seasons,
  selectedSeasonId,
  onSeasonChange,
  showAllOption = true,
  className = "",
  defaultSeasonId,
}: SeasonSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Helper to get matching icon for season name
  const getSeasonIcon = (name: string) => {
    if (name.includes("صيف") || name.toLowerCase().includes("summer")) {
      return <Sun className="w-4 h-4 text-amber-500 shrink-0" />;
    }
    if (name.includes("شتو") || name.toLowerCase().includes("winter")) {
      return <Snowflake className="w-4 h-4 text-sky-400 shrink-0" />;
    }
    return <BookOpen className="w-4 h-4 text-islamicGold-500 shrink-0" />;
  };

  // Synchronize initial selection from URL query param or localStorage
  useEffect(() => {
    if (!seasons || seasons.length === 0) return;

    const urlSeason = searchParams?.get("season");
    const storedSeason = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;

    // Check if urlSeason exists in seasons list
    if (urlSeason && (urlSeason === "all" || seasons.some((s) => s.id === urlSeason))) {
      if (urlSeason !== selectedSeasonId) {
        onSeasonChange(urlSeason);
      }
      return;
    }

    // Check if a specific defaultSeasonId was enforced (e.g. teacher belongs to a single club)
    if (defaultSeasonId && seasons.some((s) => s.id === defaultSeasonId)) {
      if (defaultSeasonId !== selectedSeasonId) {
        onSeasonChange(defaultSeasonId);
      }
      return;
    }

    // Check if storedSeason exists in seasons list
    if (storedSeason && (storedSeason === "all" || seasons.some((s) => s.id === storedSeason))) {
      if (storedSeason !== selectedSeasonId) {
        onSeasonChange(storedSeason);
      }
      return;
    }

    // Fallback: active season (is_active = true) or default
    const active = seasons.find((s) => s.is_active) || seasons[0];
    if (active && active.id !== selectedSeasonId) {
      onSeasonChange(active.id);
    }
  }, [seasons, searchParams, defaultSeasonId]);

  // Handle season selection with URL and localStorage persistence
  const handleSelectSeason = useCallback(
    (seasonId: string) => {
      onSeasonChange(seasonId);

      // Save to localStorage
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_STORAGE_KEY, seasonId);
        }
      } catch {
        // ignore localStorage access errors in private mode
      }

      // Update URL query param smoothly
      try {
        const currentParams = new URLSearchParams(searchParams?.toString() || "");
        if (seasonId === "all") {
          currentParams.set("season", "all");
        } else {
          currentParams.set("season", seasonId);
        }
        const newUrl = `${pathname}?${currentParams.toString()}`;
        window.history.replaceState(null, "", newUrl);
      } catch {
        // fallback
      }
    },
    [onSeasonChange, pathname, searchParams]
  );

  return (
    <div
      className={`relative p-1.5 sm:p-2 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 shadow-sm ${className}`}
      dir="rtl"
    >
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {/* Label badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-slate-500 dark:text-slate-400 shrink-0 select-none">
          <span className="w-2 h-2 rounded-full bg-islamicGold-500 animate-pulse" />
          <span>النادي المعتمد:</span>
        </div>

        {/* Optional 'All Clubs' pill */}
        {showAllOption && (
          <button
            type="button"
            onClick={() => handleSelectSeason("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer select-none ${
              selectedSeasonId === "all"
                ? "bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white border border-islamicGold-400/50 shadow-md shadow-burgundy-950/25 ring-1 ring-islamicGold-400/30 scale-[1.02]"
                : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60"
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${selectedSeasonId === "all" ? "text-islamicGold-300" : "text-slate-400"}`} />
            <span>جميع الأندية</span>
          </button>
        )}

        {/* Dynamic Season Pills */}
        {seasons.map((season) => {
          const isSelected = selectedSeasonId === season.id;
          return (
            <button
              key={season.id}
              type="button"
              onClick={() => handleSelectSeason(season.id)}
              className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer select-none ${
                isSelected
                  ? "bg-gradient-to-r from-burgundy-950 via-burgundy-900 to-burgundy-950 text-white border-2 border-islamicGold-400 shadow-md shadow-burgundy-950/20 ring-1 ring-islamicGold-400/40 scale-[1.02]"
                  : "bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-burgundy-50/50 dark:hover:bg-slate-800 hover:text-burgundy-900 dark:hover:text-burgundy-200 border border-slate-200 dark:border-slate-700/60"
              }`}
            >
              {getSeasonIcon(season.name)}
              <span>{season.name}</span>
              {season.is_active && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected
                      ? "bg-islamicGold-400/20 text-islamicGold-300 border border-islamicGold-400/40"
                      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  }`}
                >
                  النشط
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
