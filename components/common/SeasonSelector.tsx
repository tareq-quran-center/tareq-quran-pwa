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
  const getSeasonIcon = (name: string, isSelected: boolean) => {
    const iconClass = "w-3.5 h-3.5 shrink-0";
    if (name.includes("صيف") || name.toLowerCase().includes("summer")) {
      return <Sun className={`${iconClass} ${isSelected ? "text-amber-300" : "text-amber-500"}`} />;
    }
    if (name.includes("شتو") || name.toLowerCase().includes("winter")) {
      return <Snowflake className={`${iconClass} ${isSelected ? "text-sky-200" : "text-sky-400"}`} />;
    }
    return <BookOpen className={`${iconClass} ${isSelected ? "text-islamicGold-300" : "text-islamicGold-600 dark:text-islamicGold-400"}`} />;
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
      className={`inline-flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/60 backdrop-blur-xs border border-slate-200/70 dark:border-slate-700/60 max-w-full overflow-x-auto no-scrollbar ${className}`}
      dir="rtl"
    >
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
        {/* Optional 'All Clubs' pill */}
        {showAllOption && (
          <button
            type="button"
            onClick={() => handleSelectSeason("all")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer select-none ${
              selectedSeasonId === "all"
                ? "bg-burgundy-900 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50"
            }`}
          >
            <Layers className={`w-3.5 h-3.5 shrink-0 ${selectedSeasonId === "all" ? "text-islamicGold-300" : "text-slate-400"}`} />
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer select-none ${
                isSelected
                  ? "bg-burgundy-900 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/50"
              }`}
            >
              {getSeasonIcon(season.name, isSelected)}
              <span>{season.name}</span>
              {season.is_active && (
                <span
                  title="النادي النشط حالياً"
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isSelected ? "bg-islamicGold-400" : "bg-emerald-500"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
