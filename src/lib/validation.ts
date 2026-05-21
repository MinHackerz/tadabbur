/**
 * Small input-validation helpers for API route bodies.
 *
 * These are deliberately tiny — we don't pull in zod/yup. The goal is just to
 * reject pathological input before it hits Prisma (10MB strings, NaN goals,
 * negative counters, etc.) and to keep error messages user-friendly without
 * leaking internal stack info.
 */

export const MAX_SHORT_STRING = 200; // names, occasions, surah ranges, verse keys
export const MAX_MEDIUM_STRING = 2_000; // single dua / brief reflection / journal entry
export const MAX_LONG_STRING = 10_000; // long-form journal / personal dua

export const MAX_GOAL_VALUE = 6_236; // total Qur'anic verses; goal can't legitimately exceed this
export const MAX_VERSES_PER_DAY = 6_236;

/** Returns the trimmed string if it's a non-empty string within `max` chars, else null. */
export function asTrimmedString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return null;
  return trimmed;
}

/** Like `asTrimmedString` but allows null/undefined (for optional fields). */
export function asOptionalTrimmedString(value: unknown, max: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > max) return null;
  return trimmed;
}

/** Coerces to a finite integer in [min, max] or returns null. */
export function asBoundedInt(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < min || i > max) return null;
  return i;
}

/**
 * Parses a `YYYY-MM-DD` string into a UTC midnight Date, returning null on
 * any format issue. Accepting `new Date(input)` is unsafe because it silently
 * yields `Invalid Date` for many inputs and varies across locales/runtimes.
 */
export function asIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) return null;
  // Roundtrip check to reject e.g. 2024-02-30
  const back = date.toISOString().slice(0, 10);
  if (back !== `${y}-${mo}-${d}`) return null;
  return date;
}

/**
 * Parses "C:V" verse keys with bounds. Surah is 1..114, verse is 1..286
 * (longest surah). Returns null on malformed input.
 */
export function parseVerseKeyStrict(
  value: unknown,
): { verseKey: string; surahId: number; verseNumber: number } | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{1,3}):(\d{1,3})$/.exec(value.trim());
  if (!m) return null;
  const surahId = Number(m[1]);
  const verseNumber = Number(m[2]);
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) return null;
  if (!Number.isInteger(verseNumber) || verseNumber < 1 || verseNumber > 286) {
    return null;
  }
  return { verseKey: `${surahId}:${verseNumber}`, surahId, verseNumber };
}
