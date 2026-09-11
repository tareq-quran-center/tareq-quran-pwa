import { MemorizationLogRow } from "@/types";
import { SURAHS } from "@/lib/constants/quran";

/**
 * Normalizes a raw database log row into a standard MemorizationLogRow.
 * Supports dual-schema columns (log_type vs type, surah_start vs surah_number, aya_start vs from_verse, etc.)
 */
export function normalizeMemorizationLogRow(row: any): MemorizationLogRow {
  if (!row) return row;

  // Determine surah start name
  let surahStart = row.surah_start;
  if (!surahStart && row.surah_number) {
    const found = SURAHS.find((s) => s.number === Number(row.surah_number));
    if (found) surahStart = found.name;
  }
  if (!surahStart) surahStart = "الفاتحة";

  // Determine surah end name
  const surahEnd = row.surah_end || surahStart;

  // Determine verses
  const ayaStart =
    typeof row.aya_start === "number"
      ? row.aya_start
      : typeof row.from_verse === "number"
      ? row.from_verse
      : 1;
  const ayaEnd =
    typeof row.aya_end === "number"
      ? row.aya_end
      : typeof row.to_verse === "number"
      ? row.to_verse
      : 7;

  // Determine type & grade
  const logType = row.log_type || row.type || "جديد";
  let grade = row.grade;
  if (!grade && row.rating !== undefined && row.rating !== null) {
    if (typeof row.rating === "number") {
      const NUM_TO_GRADE: Record<number, string> = {
        5: "ممتاز",
        4: "جيد_جدا",
        3: "جيد",
        2: "يحتاج_تحسين",
        1: "يحتاج_تحسين",
      };
      grade = NUM_TO_GRADE[row.rating] || "ممتاز";
    } else {
      grade = row.rating;
    }
  }
  if (!grade) grade = "ممتاز";

  return {
    ...row,
    log_type: logType,
    surah_start: surahStart,
    aya_start: ayaStart,
    surah_end: surahEnd,
    aya_end: ayaEnd,
    grade: grade,
    date:
      row.date ||
      (row.created_at ? row.created_at.substring(0, 10) : new Date().toISOString().substring(0, 10)),
    notes: row.notes || null,
    assistant_name: row.assistant_name || null,
    page_count:
      typeof row.page_count === "number"
        ? row.page_count
        : row.page_count
        ? Number(row.page_count)
        : null,
    surahs: Array.isArray(row.surahs) ? row.surahs : null,
    audio_url: row.audio_url || null,
    rating: grade,
  };
}
