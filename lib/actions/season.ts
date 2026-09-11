"use server";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { SeasonRow, CircleRow } from "@/types";
import { FALLBACK_SEASONS } from "@/lib/constants/seasons";

export interface GetSeasonsResult {
  success: boolean;
  data: SeasonRow[];
  activeSeason: SeasonRow | null;
  error?: string;
}

/**
 * Fetch all seasons ordered by created_at, identifying the active season
 */
export async function getSeasons(): Promise<GetSeasonsResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("Could not fetch seasons from database, using fallback:", error?.message);
      const active = FALLBACK_SEASONS.find((s) => s.is_active) || FALLBACK_SEASONS[0];
      return {
        success: true,
        data: FALLBACK_SEASONS,
        activeSeason: active,
      };
    }

    const seasons = data as SeasonRow[];
    // Ensure "النادي الدائم" comes first or sort predictably
    seasons.sort((a, b) => {
      if (a.is_active) return -1;
      if (b.is_active) return 1;
      return a.created_at.localeCompare(b.created_at);
    });

    const active = seasons.find((s) => s.is_active) || seasons[0] || null;

    return {
      success: true,
      data: seasons,
      activeSeason: active,
    };
  } catch (err) {
    console.error("Error fetching seasons:", err);
    const active = FALLBACK_SEASONS.find((s) => s.is_active) || FALLBACK_SEASONS[0];
    return {
      success: true,
      data: FALLBACK_SEASONS,
      activeSeason: active,
    };
  }
}

export const getSeasonsCached = cache(getSeasons);

/**
 * Helper to fetch circles for a specific season or all seasons
 */
export async function getCircles(seasonId?: string) {
  try {
    const supabase = createClient();
    let query = supabase.from("circles").select("*");

    if (seasonId && seasonId !== "all") {
      query = query.eq("season_id", seasonId);
    }

    const { data, error } = await query.order("name", { ascending: true });
    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: (data || []) as CircleRow[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "حدث خطأ غير متوقع",
      data: [],
    };
  }
}
