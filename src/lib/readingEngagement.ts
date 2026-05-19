const STORAGE_KEY = "tadabbur-engagement";

/**
 * IMPORTANT: Reading engagement should only be tracked for authenticated users.
 * This localStorage implementation is deprecated and should migrate to server-side storage.
 * 
 * TODO: Migrate to Quran Foundation Goals API
 */

export interface ReadingEngagement {
  streakDays: number;
  lastReadDate: string | null;
  lastSurahId: number;
  lastVerseNumber: number | null;
  dailyAyahGoal: number;
  todayAyahsMarked: number;
  todayDate: string | null;
  mercyWeekKey: string | null;
  mercyUsedThisWeek: boolean;
  _deprecated: boolean; // Flag to indicate this should not be used
}

const DEFAULTS: ReadingEngagement = {
  streakDays: 0,
  lastReadDate: null,
  lastSurahId: 1,
  lastVerseNumber: null,
  dailyAyahGoal: 10,
  todayAyahsMarked: 0,
  todayDate: null,
  mercyWeekKey: null,
  mercyUsedThisWeek: false,
  _deprecated: true,
};

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayKey() {
  return localDateKey();
}

/** ISO week key (Monday-based) for mercy-day tracking. */
export function weekKey(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return localDateKey(d);
}

function daysBetween(a: string, b: string) {
  const parse = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(b) - parse(a)) / 86_400_000);
}

function load(): ReadingEngagement {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

function save(data: ReadingEngagement) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function resetTodayIfNeeded(data: ReadingEngagement): ReadingEngagement {
  const today = todayKey();
  if (data.todayDate === today) return data;
  return { ...data, todayDate: today, todayAyahsMarked: 0 };
}

function syncMercyWeek(data: ReadingEngagement): ReadingEngagement {
  const currentWeek = weekKey();
  if (data.mercyWeekKey === currentWeek) return data;
  return {
    ...data,
    mercyWeekKey: currentWeek,
    mercyUsedThisWeek: false,
  };
}

/** One mercy day per week — streak continues after a single missed day. */
export function mercyAvailable(data: ReadingEngagement): boolean {
  const synced = syncMercyWeek(data);
  return !synced.mercyUsedThisWeek;
}

/**
 * @deprecated This function uses localStorage which should not be used for user data.
 * Reading engagement should only be tracked for authenticated users via the Goals API.
 * 
 * Call when the user opens the reader. Updates streak and last-read surah.
 * WARNING: This will be removed in a future version.
 */
export function recordReadingVisit(surahId: number, verseNumber?: number | null) {
  // Return empty data - do not track without authentication
  console.warn('[DEPRECATED] recordReadingVisit: Reading engagement should only be tracked for authenticated users');
  return DEFAULTS;
}

/**
 * @deprecated This function uses localStorage which should not be used for user data.
 */
export function markAyahsRead(count: number) {
  console.warn('[DEPRECATED] markAyahsRead: Reading engagement should only be tracked for authenticated users');
  return DEFAULTS;
}

/**
 * @deprecated Returns empty data. Use Goals API instead.
 */
export function getReadingEngagement(): ReadingEngagement {
  return DEFAULTS;
}

/**
 * @deprecated This function uses localStorage which should not be used for user data.
 */
export function setDailyAyahGoal(goal: number) {
  console.warn('[DEPRECATED] setDailyAyahGoal: Use Goals API instead');
  // Do nothing
}
