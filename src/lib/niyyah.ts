/**
 * Niyyah Gift System — complete domain logic.
 *
 * Database-backed feature with API sync.
 *
 * Includes:
 *  - Full 114-surah index (id, names, verse counts, page ranges, revelation place)
 *  - 30-Juz boundary table
 *  - Deterministic global-ayah ↔ surah:verse conversion
 *  - Per-day reading-portion math (days plan, Khatm plan, Juz/week plan)
 *  - Authentic Qur'anic verses bank (with sura:ayah refs) used in copy
 *  - Streak / mercy-day computation
 *  - Hijri & Gregorian formatting
 *  - Database persistence via API (see niyyah-api.ts)
 */

/* ───────── Types ─────────────────────────────────────────────────── */

export type JourneyType = "living" | "departed" | "personal";

/**
 * `days`  → user picks a fixed number of days; we split the Qur'an evenly.
 * `khatm` → complete Qur'an in 30 days (~1 juz/day).
 * `juz`   → 1 juz per week (30 weeks).
 * `custom`→ free-form day count.
 */
export type GoalType = "days" | "khatm" | "juz" | "custom";

export interface VerseRef {
  /** "S:A" e.g. "2:255". */
  key: string;
  surahId: number;
  verseNumber: number;
}

export interface JourneyDay {
  date: string; // ISO yyyy-mm-dd
  versesRead: number;
  surahRange: string;
  startKey: string;
  endKey: string;
  reflection?: string | null;
  isMercy?: boolean;
}

export interface Journey {
  /** Schema version — bump when shape changes to invalidate old data. */
  v: number;
  id: string;
  type: JourneyType;
  recipientName: string;
  occasion: string;
  personalDua: string;
  goalType: GoalType;
  /** Number of days the journey spans. For Khatm = 30, for Juz/week = 210. */
  goalValue: number;
  /** Daily target: how many verses the user wants to read per day. */
  dailyTarget: number;
  startDate: string;
  targetDate: string;
  completedDays: JourneyDay[];
  currentStreak: number;
  longestStreak: number;
  mercyDayUsed: boolean;
  lastMercyWeek: string | null;
  isComplete: boolean;
  isActive?: boolean;
  readerName?: string;
}

export interface AmanahWallItem {
  type: JourneyType;
  occasion?: string;
  day: number;
  total: number;
  region: string;
  isComplete?: boolean;
}

export interface NewJourneyInput {
  type: JourneyType;
  recipientName: string;
  occasion: string;
  personalDua: string;
  goalType: GoalType;
  goalValue: number;
  /** Daily target: how many verses the user wants to read per day. */
  dailyTarget: number;
  readerName?: string;
}

/* ───────── Schema constants ──────────────────────────────────────── */

// Legacy localStorage key - kept for migration purposes only
const STORAGE_KEY = "tadabbur-niyyah-journey";
const SCHEMA_VERSION = 1;

export const TOTAL_AYAHS = 6236;
export const TOTAL_PAGES = 604;
export const TOTAL_JUZ = 30;

/* ───────── Journey type metadata ─────────────────────────────────── */

export const JOURNEY_TYPES: {
  id: JourneyType;
  title: string;
  subtitle: string;
  longDescription: string;
  /** Authentic Qur'anic verse used as the card's poem. */
  verse: string;
  verseRef: string;
}[] = [
  {
    id: "living",
    title: "Gift to the Living",
    subtitle: "For someone you love",
    longDescription:
      "Dedicate your reading to a parent, spouse, child, or friend — a gift of light shaped from your tongue and heart.",
    verse:
      "And lower to them the wing of humility out of mercy, and say: My Lord, have mercy upon them as they brought me up when I was small.",
    verseRef: "Qur'an 17:24",
  },
  {
    id: "departed",
    title: "Memorial Read",
    subtitle: "For the departed",
    longDescription:
      "Remember someone who has returned to Allah. Renew your intention before each session — that the reward may reach them.",
    verse:
      "Our Lord, forgive us and our brothers who preceded us in faith, and put no hatred in our hearts toward those who have believed.",
    verseRef: "Qur'an 59:10",
  },
  {
    id: "personal",
    title: "Personal Milestone",
    subtitle: "A chapter of your own life",
    longDescription:
      "Mark a season — recovery, gratitude, exam, hardship, Ramadan — with the steady company of the Qur'an.",
    verse: "So verily, with hardship there is ease. Verily, with hardship there is ease.",
    verseRef: "Qur'an 94:5–6",
  },
];

export const OCCASIONS_BY_TYPE: Record<JourneyType, string[]> = {
  living: [
    "Birthday",
    "Recovery from illness",
    "Marriage",
    "New baby",
    "Graduation",
    "Ramadan gift",
    "With love",
    "Custom",
  ],
  departed: [
    "Memorial",
    "Anniversary of passing",
    "For mercy",
    "Sadaqah Jariyah",
    "Custom",
  ],
  personal: [
    "Recovery",
    "Ramadan",
    "Tawakkul",
    "Gratitude",
    "Hardship",
    "New chapter",
    "Custom",
  ],
};

export const GOAL_PRESETS: { value: number; label: string; note: string }[] = [
  { value: 7, label: "7 days", note: "One week of devotion" },
  { value: 30, label: "30 days", note: "A month of return" },
  { value: 40, label: "40 days", note: "A traditional sacred span" },
  { value: 100, label: "100 days", note: "A great commitment" },
];

/** Hero verse shown on the empty-state hero. */
export const HERO_VERSE = {
  arabic: "وَقُلْ رَبِّ زِدْنِي عِلْمًا",
  translation: "And say: My Lord, increase me in knowledge.",
  ref: "Qur'an 20:114",
};

/** Verses used inside the dashboard as quiet companionship. */
export const COMPANION_VERSES: { translation: string; ref: string }[] = [
  {
    translation: "Indeed, in the remembrance of Allah hearts find rest.",
    ref: "Qur'an 13:28",
  },
  {
    translation:
      "Allah does not burden a soul beyond that it can bear.",
    ref: "Qur'an 2:286",
  },
  {
    translation: "And He found you lost and guided you.",
    ref: "Qur'an 93:7",
  },
  {
    translation: "So remember Me; I will remember you.",
    ref: "Qur'an 2:152",
  },
];

/* ───────── 114-Surah index ───────────────────────────────────────── */

export interface SurahMeta {
  id: number;
  nameSimple: string;
  nameArabic: string;
  versesCount: number;
  /** First Madani page in the standard 604-page mushaf. */
  pageStart: number;
  pageEnd: number;
  revelation: "Meccan" | "Medinan";
}

/**
 * Verse counts per the Hafs reading. Page numbers follow the standard
 * 15-line Madani mushaf (604 pages). These are well-established static facts
 * used widely across reference apps; we encode them here so the UI can compute
 * portions without an API round-trip.
 */
export const SURAHS: SurahMeta[] = [
  { id: 1, nameSimple: "Al-Fatihah", nameArabic: "ٱلْفَاتِحَة", versesCount: 7, pageStart: 1, pageEnd: 1, revelation: "Meccan" },
  { id: 2, nameSimple: "Al-Baqarah", nameArabic: "ٱلْبَقَرَة", versesCount: 286, pageStart: 2, pageEnd: 49, revelation: "Medinan" },
  { id: 3, nameSimple: "Ali 'Imran", nameArabic: "آلِ عِمْرَان", versesCount: 200, pageStart: 50, pageEnd: 76, revelation: "Medinan" },
  { id: 4, nameSimple: "An-Nisa'", nameArabic: "ٱلنِّسَاء", versesCount: 176, pageStart: 77, pageEnd: 106, revelation: "Medinan" },
  { id: 5, nameSimple: "Al-Ma'idah", nameArabic: "ٱلْمَائِدَة", versesCount: 120, pageStart: 106, pageEnd: 127, revelation: "Medinan" },
  { id: 6, nameSimple: "Al-An'am", nameArabic: "ٱلْأَنْعَام", versesCount: 165, pageStart: 128, pageEnd: 150, revelation: "Meccan" },
  { id: 7, nameSimple: "Al-A'raf", nameArabic: "ٱلْأَعْرَاف", versesCount: 206, pageStart: 151, pageEnd: 176, revelation: "Meccan" },
  { id: 8, nameSimple: "Al-Anfal", nameArabic: "ٱلْأَنْفَال", versesCount: 75, pageStart: 177, pageEnd: 186, revelation: "Medinan" },
  { id: 9, nameSimple: "At-Tawbah", nameArabic: "ٱلتَّوْبَة", versesCount: 129, pageStart: 187, pageEnd: 207, revelation: "Medinan" },
  { id: 10, nameSimple: "Yunus", nameArabic: "يُونُس", versesCount: 109, pageStart: 208, pageEnd: 221, revelation: "Meccan" },
  { id: 11, nameSimple: "Hud", nameArabic: "هُود", versesCount: 123, pageStart: 221, pageEnd: 235, revelation: "Meccan" },
  { id: 12, nameSimple: "Yusuf", nameArabic: "يُوسُف", versesCount: 111, pageStart: 235, pageEnd: 248, revelation: "Meccan" },
  { id: 13, nameSimple: "Ar-Ra'd", nameArabic: "ٱلرَّعْد", versesCount: 43, pageStart: 249, pageEnd: 255, revelation: "Medinan" },
  { id: 14, nameSimple: "Ibrahim", nameArabic: "إِبْرَاهِيم", versesCount: 52, pageStart: 255, pageEnd: 261, revelation: "Meccan" },
  { id: 15, nameSimple: "Al-Hijr", nameArabic: "ٱلْحِجْر", versesCount: 99, pageStart: 262, pageEnd: 267, revelation: "Meccan" },
  { id: 16, nameSimple: "An-Nahl", nameArabic: "ٱلنَّحْل", versesCount: 128, pageStart: 267, pageEnd: 281, revelation: "Meccan" },
  { id: 17, nameSimple: "Al-Isra'", nameArabic: "ٱلْإِسْرَاء", versesCount: 111, pageStart: 282, pageEnd: 293, revelation: "Meccan" },
  { id: 18, nameSimple: "Al-Kahf", nameArabic: "ٱلْكَهْف", versesCount: 110, pageStart: 293, pageEnd: 304, revelation: "Meccan" },
  { id: 19, nameSimple: "Maryam", nameArabic: "مَرْيَم", versesCount: 98, pageStart: 305, pageEnd: 312, revelation: "Meccan" },
  { id: 20, nameSimple: "Ta-Ha", nameArabic: "طه", versesCount: 135, pageStart: 312, pageEnd: 321, revelation: "Meccan" },
  { id: 21, nameSimple: "Al-Anbiya'", nameArabic: "ٱلْأَنْبِيَاء", versesCount: 112, pageStart: 322, pageEnd: 331, revelation: "Meccan" },
  { id: 22, nameSimple: "Al-Hajj", nameArabic: "ٱلْحَجّ", versesCount: 78, pageStart: 332, pageEnd: 341, revelation: "Medinan" },
  { id: 23, nameSimple: "Al-Mu'minun", nameArabic: "ٱلْمُؤْمِنُون", versesCount: 118, pageStart: 342, pageEnd: 349, revelation: "Meccan" },
  { id: 24, nameSimple: "An-Nur", nameArabic: "ٱلنُّور", versesCount: 64, pageStart: 350, pageEnd: 359, revelation: "Medinan" },
  { id: 25, nameSimple: "Al-Furqan", nameArabic: "ٱلْفُرْقَان", versesCount: 77, pageStart: 359, pageEnd: 366, revelation: "Meccan" },
  { id: 26, nameSimple: "Ash-Shu'ara'", nameArabic: "ٱلشُّعَرَاء", versesCount: 227, pageStart: 367, pageEnd: 376, revelation: "Meccan" },
  { id: 27, nameSimple: "An-Naml", nameArabic: "ٱلنَّمْل", versesCount: 93, pageStart: 377, pageEnd: 385, revelation: "Meccan" },
  { id: 28, nameSimple: "Al-Qasas", nameArabic: "ٱلْقَصَص", versesCount: 88, pageStart: 385, pageEnd: 396, revelation: "Meccan" },
  { id: 29, nameSimple: "Al-'Ankabut", nameArabic: "ٱلْعَنْكَبُوت", versesCount: 69, pageStart: 396, pageEnd: 404, revelation: "Meccan" },
  { id: 30, nameSimple: "Ar-Rum", nameArabic: "ٱلرُّوم", versesCount: 60, pageStart: 404, pageEnd: 410, revelation: "Meccan" },
  { id: 31, nameSimple: "Luqman", nameArabic: "لُقْمَان", versesCount: 34, pageStart: 411, pageEnd: 414, revelation: "Meccan" },
  { id: 32, nameSimple: "As-Sajdah", nameArabic: "ٱلسَّجْدَة", versesCount: 30, pageStart: 415, pageEnd: 417, revelation: "Meccan" },
  { id: 33, nameSimple: "Al-Ahzab", nameArabic: "ٱلْأَحْزَاب", versesCount: 73, pageStart: 418, pageEnd: 427, revelation: "Medinan" },
  { id: 34, nameSimple: "Saba'", nameArabic: "سَبَأ", versesCount: 54, pageStart: 428, pageEnd: 433, revelation: "Meccan" },
  { id: 35, nameSimple: "Fatir", nameArabic: "فَاطِر", versesCount: 45, pageStart: 434, pageEnd: 440, revelation: "Meccan" },
  { id: 36, nameSimple: "Ya-Sin", nameArabic: "يس", versesCount: 83, pageStart: 440, pageEnd: 445, revelation: "Meccan" },
  { id: 37, nameSimple: "As-Saffat", nameArabic: "ٱلصَّافَّات", versesCount: 182, pageStart: 446, pageEnd: 452, revelation: "Meccan" },
  { id: 38, nameSimple: "Sad", nameArabic: "ص", versesCount: 88, pageStart: 453, pageEnd: 458, revelation: "Meccan" },
  { id: 39, nameSimple: "Az-Zumar", nameArabic: "ٱلزُّمَر", versesCount: 75, pageStart: 458, pageEnd: 467, revelation: "Meccan" },
  { id: 40, nameSimple: "Ghafir", nameArabic: "غَافِر", versesCount: 85, pageStart: 467, pageEnd: 476, revelation: "Meccan" },
  { id: 41, nameSimple: "Fussilat", nameArabic: "فُصِّلَت", versesCount: 54, pageStart: 477, pageEnd: 482, revelation: "Meccan" },
  { id: 42, nameSimple: "Ash-Shura", nameArabic: "ٱلشُّورَىٰ", versesCount: 53, pageStart: 483, pageEnd: 489, revelation: "Meccan" },
  { id: 43, nameSimple: "Az-Zukhruf", nameArabic: "ٱلزُّخْرُف", versesCount: 89, pageStart: 489, pageEnd: 495, revelation: "Meccan" },
  { id: 44, nameSimple: "Ad-Dukhan", nameArabic: "ٱلدُّخَان", versesCount: 59, pageStart: 496, pageEnd: 498, revelation: "Meccan" },
  { id: 45, nameSimple: "Al-Jathiyah", nameArabic: "ٱلْجَاثِيَة", versesCount: 37, pageStart: 499, pageEnd: 502, revelation: "Meccan" },
  { id: 46, nameSimple: "Al-Ahqaf", nameArabic: "ٱلْأَحْقَاف", versesCount: 35, pageStart: 502, pageEnd: 506, revelation: "Meccan" },
  { id: 47, nameSimple: "Muhammad", nameArabic: "مُحَمَّد", versesCount: 38, pageStart: 507, pageEnd: 510, revelation: "Medinan" },
  { id: 48, nameSimple: "Al-Fath", nameArabic: "ٱلْفَتْح", versesCount: 29, pageStart: 511, pageEnd: 515, revelation: "Medinan" },
  { id: 49, nameSimple: "Al-Hujurat", nameArabic: "ٱلْحُجُرَات", versesCount: 18, pageStart: 515, pageEnd: 517, revelation: "Medinan" },
  { id: 50, nameSimple: "Qaf", nameArabic: "ق", versesCount: 45, pageStart: 518, pageEnd: 520, revelation: "Meccan" },
  { id: 51, nameSimple: "Adh-Dhariyat", nameArabic: "ٱلذَّارِيَات", versesCount: 60, pageStart: 520, pageEnd: 523, revelation: "Meccan" },
  { id: 52, nameSimple: "At-Tur", nameArabic: "ٱلطُّور", versesCount: 49, pageStart: 523, pageEnd: 525, revelation: "Meccan" },
  { id: 53, nameSimple: "An-Najm", nameArabic: "ٱلنَّجْم", versesCount: 62, pageStart: 526, pageEnd: 528, revelation: "Meccan" },
  { id: 54, nameSimple: "Al-Qamar", nameArabic: "ٱلْقَمَر", versesCount: 55, pageStart: 528, pageEnd: 531, revelation: "Meccan" },
  { id: 55, nameSimple: "Ar-Rahman", nameArabic: "ٱلرَّحْمَٰن", versesCount: 78, pageStart: 531, pageEnd: 534, revelation: "Medinan" },
  { id: 56, nameSimple: "Al-Waqi'ah", nameArabic: "ٱلْوَاقِعَة", versesCount: 96, pageStart: 534, pageEnd: 537, revelation: "Meccan" },
  { id: 57, nameSimple: "Al-Hadid", nameArabic: "ٱلْحَدِيد", versesCount: 29, pageStart: 537, pageEnd: 541, revelation: "Medinan" },
  { id: 58, nameSimple: "Al-Mujadilah", nameArabic: "ٱلْمُجَادِلَة", versesCount: 22, pageStart: 542, pageEnd: 545, revelation: "Medinan" },
  { id: 59, nameSimple: "Al-Hashr", nameArabic: "ٱلْحَشْر", versesCount: 24, pageStart: 545, pageEnd: 548, revelation: "Medinan" },
  { id: 60, nameSimple: "Al-Mumtahanah", nameArabic: "ٱلْمُمْتَحَنَة", versesCount: 13, pageStart: 549, pageEnd: 551, revelation: "Medinan" },
  { id: 61, nameSimple: "As-Saff", nameArabic: "ٱلصَّفّ", versesCount: 14, pageStart: 551, pageEnd: 552, revelation: "Medinan" },
  { id: 62, nameSimple: "Al-Jumu'ah", nameArabic: "ٱلْجُمُعَة", versesCount: 11, pageStart: 553, pageEnd: 554, revelation: "Medinan" },
  { id: 63, nameSimple: "Al-Munafiqun", nameArabic: "ٱلْمُنَافِقُون", versesCount: 11, pageStart: 554, pageEnd: 555, revelation: "Medinan" },
  { id: 64, nameSimple: "At-Taghabun", nameArabic: "ٱلتَّغَابُن", versesCount: 18, pageStart: 556, pageEnd: 557, revelation: "Medinan" },
  { id: 65, nameSimple: "At-Talaq", nameArabic: "ٱلطَّلَاق", versesCount: 12, pageStart: 558, pageEnd: 559, revelation: "Medinan" },
  { id: 66, nameSimple: "At-Tahrim", nameArabic: "ٱلتَّحْرِيم", versesCount: 12, pageStart: 560, pageEnd: 561, revelation: "Medinan" },
  { id: 67, nameSimple: "Al-Mulk", nameArabic: "ٱلْمُلْك", versesCount: 30, pageStart: 562, pageEnd: 564, revelation: "Meccan" },
  { id: 68, nameSimple: "Al-Qalam", nameArabic: "ٱلْقَلَم", versesCount: 52, pageStart: 564, pageEnd: 566, revelation: "Meccan" },
  { id: 69, nameSimple: "Al-Haqqah", nameArabic: "ٱلْحَاقَّة", versesCount: 52, pageStart: 566, pageEnd: 568, revelation: "Meccan" },
  { id: 70, nameSimple: "Al-Ma'arij", nameArabic: "ٱلْمَعَارِج", versesCount: 44, pageStart: 568, pageEnd: 570, revelation: "Meccan" },
  { id: 71, nameSimple: "Nuh", nameArabic: "نُوح", versesCount: 28, pageStart: 570, pageEnd: 571, revelation: "Meccan" },
  { id: 72, nameSimple: "Al-Jinn", nameArabic: "ٱلْجِنّ", versesCount: 28, pageStart: 572, pageEnd: 573, revelation: "Meccan" },
  { id: 73, nameSimple: "Al-Muzzammil", nameArabic: "ٱلْمُزَّمِّل", versesCount: 20, pageStart: 574, pageEnd: 575, revelation: "Meccan" },
  { id: 74, nameSimple: "Al-Muddaththir", nameArabic: "ٱلْمُدَّثِّر", versesCount: 56, pageStart: 575, pageEnd: 577, revelation: "Meccan" },
  { id: 75, nameSimple: "Al-Qiyamah", nameArabic: "ٱلْقِيَامَة", versesCount: 40, pageStart: 577, pageEnd: 578, revelation: "Meccan" },
  { id: 76, nameSimple: "Al-Insan", nameArabic: "ٱلْإِنْسَان", versesCount: 31, pageStart: 578, pageEnd: 580, revelation: "Medinan" },
  { id: 77, nameSimple: "Al-Mursalat", nameArabic: "ٱلْمُرْسَلَات", versesCount: 50, pageStart: 580, pageEnd: 581, revelation: "Meccan" },
  { id: 78, nameSimple: "An-Naba'", nameArabic: "ٱلنَّبَأ", versesCount: 40, pageStart: 582, pageEnd: 583, revelation: "Meccan" },
  { id: 79, nameSimple: "An-Nazi'at", nameArabic: "ٱلنَّازِعَات", versesCount: 46, pageStart: 583, pageEnd: 584, revelation: "Meccan" },
  { id: 80, nameSimple: "'Abasa", nameArabic: "عَبَسَ", versesCount: 42, pageStart: 585, pageEnd: 585, revelation: "Meccan" },
  { id: 81, nameSimple: "At-Takwir", nameArabic: "ٱلتَّكْوِير", versesCount: 29, pageStart: 586, pageEnd: 586, revelation: "Meccan" },
  { id: 82, nameSimple: "Al-Infitar", nameArabic: "ٱلْإِنْفِطَار", versesCount: 19, pageStart: 587, pageEnd: 587, revelation: "Meccan" },
  { id: 83, nameSimple: "Al-Mutaffifin", nameArabic: "ٱلْمُطَفِّفِين", versesCount: 36, pageStart: 587, pageEnd: 589, revelation: "Meccan" },
  { id: 84, nameSimple: "Al-Inshiqaq", nameArabic: "ٱلْإِنْشِقَاق", versesCount: 25, pageStart: 589, pageEnd: 590, revelation: "Meccan" },
  { id: 85, nameSimple: "Al-Buruj", nameArabic: "ٱلْبُرُوج", versesCount: 22, pageStart: 590, pageEnd: 591, revelation: "Meccan" },
  { id: 86, nameSimple: "At-Tariq", nameArabic: "ٱلطَّارِق", versesCount: 17, pageStart: 591, pageEnd: 591, revelation: "Meccan" },
  { id: 87, nameSimple: "Al-A'la", nameArabic: "ٱلْأَعْلَىٰ", versesCount: 19, pageStart: 591, pageEnd: 592, revelation: "Meccan" },
  { id: 88, nameSimple: "Al-Ghashiyah", nameArabic: "ٱلْغَاشِيَة", versesCount: 26, pageStart: 592, pageEnd: 593, revelation: "Meccan" },
  { id: 89, nameSimple: "Al-Fajr", nameArabic: "ٱلْفَجْر", versesCount: 30, pageStart: 593, pageEnd: 594, revelation: "Meccan" },
  { id: 90, nameSimple: "Al-Balad", nameArabic: "ٱلْبَلَد", versesCount: 20, pageStart: 594, pageEnd: 595, revelation: "Meccan" },
  { id: 91, nameSimple: "Ash-Shams", nameArabic: "ٱلشَّمْس", versesCount: 15, pageStart: 595, pageEnd: 595, revelation: "Meccan" },
  { id: 92, nameSimple: "Al-Layl", nameArabic: "ٱللَّيْل", versesCount: 21, pageStart: 595, pageEnd: 596, revelation: "Meccan" },
  { id: 93, nameSimple: "Ad-Duha", nameArabic: "ٱلضُّحَىٰ", versesCount: 11, pageStart: 596, pageEnd: 596, revelation: "Meccan" },
  { id: 94, nameSimple: "Ash-Sharh", nameArabic: "ٱلشَّرْح", versesCount: 8, pageStart: 596, pageEnd: 596, revelation: "Meccan" },
  { id: 95, nameSimple: "At-Tin", nameArabic: "ٱلتِّين", versesCount: 8, pageStart: 597, pageEnd: 597, revelation: "Meccan" },
  { id: 96, nameSimple: "Al-'Alaq", nameArabic: "ٱلْعَلَق", versesCount: 19, pageStart: 597, pageEnd: 597, revelation: "Meccan" },
  { id: 97, nameSimple: "Al-Qadr", nameArabic: "ٱلْقَدْر", versesCount: 5, pageStart: 598, pageEnd: 598, revelation: "Meccan" },
  { id: 98, nameSimple: "Al-Bayyinah", nameArabic: "ٱلْبَيِّنَة", versesCount: 8, pageStart: 598, pageEnd: 599, revelation: "Medinan" },
  { id: 99, nameSimple: "Az-Zalzalah", nameArabic: "ٱلزَّلْزَلَة", versesCount: 8, pageStart: 599, pageEnd: 599, revelation: "Medinan" },
  { id: 100, nameSimple: "Al-'Adiyat", nameArabic: "ٱلْعَادِيَات", versesCount: 11, pageStart: 599, pageEnd: 600, revelation: "Meccan" },
  { id: 101, nameSimple: "Al-Qari'ah", nameArabic: "ٱلْقَارِعَة", versesCount: 11, pageStart: 600, pageEnd: 600, revelation: "Meccan" },
  { id: 102, nameSimple: "At-Takathur", nameArabic: "ٱلتَّكَاثُر", versesCount: 8, pageStart: 600, pageEnd: 600, revelation: "Meccan" },
  { id: 103, nameSimple: "Al-'Asr", nameArabic: "ٱلْعَصْر", versesCount: 3, pageStart: 601, pageEnd: 601, revelation: "Meccan" },
  { id: 104, nameSimple: "Al-Humazah", nameArabic: "ٱلْهُمَزَة", versesCount: 9, pageStart: 601, pageEnd: 601, revelation: "Meccan" },
  { id: 105, nameSimple: "Al-Fil", nameArabic: "ٱلْفِيل", versesCount: 5, pageStart: 601, pageEnd: 601, revelation: "Meccan" },
  { id: 106, nameSimple: "Quraysh", nameArabic: "قُرَيْش", versesCount: 4, pageStart: 602, pageEnd: 602, revelation: "Meccan" },
  { id: 107, nameSimple: "Al-Ma'un", nameArabic: "ٱلْمَاعُون", versesCount: 7, pageStart: 602, pageEnd: 602, revelation: "Meccan" },
  { id: 108, nameSimple: "Al-Kawthar", nameArabic: "ٱلْكَوْثَر", versesCount: 3, pageStart: 602, pageEnd: 602, revelation: "Meccan" },
  { id: 109, nameSimple: "Al-Kafirun", nameArabic: "ٱلْكَافِرُون", versesCount: 6, pageStart: 603, pageEnd: 603, revelation: "Meccan" },
  { id: 110, nameSimple: "An-Nasr", nameArabic: "ٱلنَّصْر", versesCount: 3, pageStart: 603, pageEnd: 603, revelation: "Medinan" },
  { id: 111, nameSimple: "Al-Masad", nameArabic: "ٱلْمَسَد", versesCount: 5, pageStart: 603, pageEnd: 603, revelation: "Meccan" },
  { id: 112, nameSimple: "Al-Ikhlas", nameArabic: "ٱلْإِخْلَاص", versesCount: 4, pageStart: 604, pageEnd: 604, revelation: "Meccan" },
  { id: 113, nameSimple: "Al-Falaq", nameArabic: "ٱلْفَلَق", versesCount: 5, pageStart: 604, pageEnd: 604, revelation: "Meccan" },
  { id: 114, nameSimple: "An-Nas", nameArabic: "ٱلنَّاس", versesCount: 6, pageStart: 604, pageEnd: 604, revelation: "Meccan" },
];

/**
 * Cumulative ayah count up to (but not including) each surah.
 * `cumulativeAyahsBeforeSurah[1] = 0`, `[2] = 7`, etc.
 */
const CUMULATIVE_AYAHS_BEFORE_SURAH: number[] = (() => {
  const out: number[] = [0, 0]; // index 0 unused, index 1 = 0
  let total = 0;
  for (const s of SURAHS) {
    total += s.versesCount;
    out[s.id + 1] = total;
  }
  return out;
})();

/* ───────── 30-Juz boundary table ─────────────────────────────────── */

/** Start of each Juz (1-based). Juz 1 starts at 1:1, Juz 2 at 2:142, etc. */
export const JUZ_STARTS: { juz: number; surahId: number; verseNumber: number }[] = [
  { juz: 1, surahId: 1, verseNumber: 1 },
  { juz: 2, surahId: 2, verseNumber: 142 },
  { juz: 3, surahId: 2, verseNumber: 253 },
  { juz: 4, surahId: 3, verseNumber: 93 },
  { juz: 5, surahId: 4, verseNumber: 24 },
  { juz: 6, surahId: 4, verseNumber: 148 },
  { juz: 7, surahId: 5, verseNumber: 82 },
  { juz: 8, surahId: 6, verseNumber: 111 },
  { juz: 9, surahId: 7, verseNumber: 88 },
  { juz: 10, surahId: 8, verseNumber: 41 },
  { juz: 11, surahId: 9, verseNumber: 93 },
  { juz: 12, surahId: 11, verseNumber: 6 },
  { juz: 13, surahId: 12, verseNumber: 53 },
  { juz: 14, surahId: 15, verseNumber: 1 },
  { juz: 15, surahId: 17, verseNumber: 1 },
  { juz: 16, surahId: 18, verseNumber: 75 },
  { juz: 17, surahId: 21, verseNumber: 1 },
  { juz: 18, surahId: 23, verseNumber: 1 },
  { juz: 19, surahId: 25, verseNumber: 21 },
  { juz: 20, surahId: 27, verseNumber: 56 },
  { juz: 21, surahId: 29, verseNumber: 46 },
  { juz: 22, surahId: 33, verseNumber: 31 },
  { juz: 23, surahId: 36, verseNumber: 28 },
  { juz: 24, surahId: 39, verseNumber: 32 },
  { juz: 25, surahId: 41, verseNumber: 47 },
  { juz: 26, surahId: 46, verseNumber: 1 },
  { juz: 27, surahId: 51, verseNumber: 31 },
  { juz: 28, surahId: 58, verseNumber: 1 },
  { juz: 29, surahId: 67, verseNumber: 1 },
  { juz: 30, surahId: 78, verseNumber: 1 },
];

/* ───────── Storage (Legacy - for migration only) ────────────────── */

/**
 * @deprecated Use fetchJourney() from niyyah-api.ts instead
 * This function is kept only for migrating existing localStorage data
 */
export function loadJourneyFromLocalStorage(): Journey | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Journey> & { v?: number };
    if (parsed.v !== SCHEMA_VERSION) {
      // Future-proofing: drop incompatible old data instead of crashing.
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as Journey;
  } catch {
    return null;
  }
}

/**
 * @deprecated Database persistence is now handled via API
 * This function is kept only for backward compatibility
 */
export function clearLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore errors
  }
}

/* ───────── Date helpers ──────────────────────────────────────────── */

export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function targetDateFor(startIso: string, days: number): string {
  return addDays(startIso, Math.max(0, days - 1));
}

export function daysBetween(aIso: string, bIso: string): number {
  const parse = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(bIso) - parse(aIso)) / 86_400_000);
}

export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatHijri(iso: string): string {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(dt);
  } catch {
    return "";
  }
}

/** ISO Monday-week key, used for mercy-day ledger. */
export function weekKey(date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return todayKey(d);
}

/* ───────── Reference conversions ─────────────────────────────────── */

/** "S:A" → { surahId, verseNumber }. Returns null on malformed input. */
export function parseRef(key: string): VerseRef | null {
  const m = key.match(/^(\d+):(\d+)$/);
  if (!m) return null;
  const surahId = Number(m[1]);
  const verseNumber = Number(m[2]);
  if (!Number.isFinite(surahId) || !Number.isFinite(verseNumber)) return null;
  if (surahId < 1 || surahId > 114) return null;
  return { key, surahId, verseNumber };
}

export function makeRef(surahId: number, verseNumber: number): VerseRef {
  return { key: `${surahId}:${verseNumber}`, surahId, verseNumber };
}

export function getSurah(id: number): SurahMeta | null {
  return SURAHS[id - 1] ?? null;
}

/**
 * Convert a 1-based global ayah number (1..6236) into a (surah, verse) ref.
 * Uses the prebuilt cumulative table — O(log n) via binary search.
 */
export function globalAyahToRef(globalAyah: number): VerseRef {
  const clamped = Math.min(TOTAL_AYAHS, Math.max(1, Math.floor(globalAyah)));
  // binary search across surah boundaries
  let lo = 1;
  let hi = 114;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (CUMULATIVE_AYAHS_BEFORE_SURAH[mid] < clamped) lo = mid;
    else hi = mid - 1;
  }
  const surahId = lo;
  const verseNumber = clamped - CUMULATIVE_AYAHS_BEFORE_SURAH[surahId];
  return { key: `${surahId}:${verseNumber}`, surahId, verseNumber };
}

/** Convert a (surah, verse) ref back to a 1-based global ayah index. */
export function refToGlobalAyah(ref: VerseRef): number {
  const surah = getSurah(ref.surahId);
  if (!surah) return 1;
  const v = Math.min(surah.versesCount, Math.max(1, ref.verseNumber));
  return CUMULATIVE_AYAHS_BEFORE_SURAH[ref.surahId] + v;
}

/* ───────── Reading-portion math ──────────────────────────────────── */

export interface TodayPortion {
  /** 0-based index of the day about to be read. */
  dayIndex: number;
  totalDays: number;
  start: VerseRef;
  end: VerseRef;
  startSurah: SurahMeta;
  endSurah: SurahMeta;
  versesCount: number;
  pagesCount: number;
  estMinutes: number;
  /** Friendly label e.g. "Al-Baqarah 1 → Ali 'Imran 92". */
  label: string;
  juzNumber: number;
}

/** Average reading pace ≈ 0.6 minutes per ayah (gentle, contemplative pace). */
const MINUTES_PER_AYAH = 0.6;

function juzForRef(ref: VerseRef): number {
  const target = refToGlobalAyah(ref);
  for (let i = JUZ_STARTS.length - 1; i >= 0; i--) {
    const start = refToGlobalAyah(makeRef(JUZ_STARTS[i].surahId, JUZ_STARTS[i].verseNumber));
    if (target >= start) return JUZ_STARTS[i].juz;
  }
  return 1;
}

export function getTodayPortion(j: Journey): TodayPortion {
  const totalDays = Math.max(1, j.goalValue);
  const dayIndex = Math.min(j.completedDays.length, totalDays - 1);
  const dailyTarget = Math.max(1, j.dailyTarget || 5);

  // Sequential reading: each day starts where the previous day left off.
  // Day 0 starts at verse 1. Day N starts at (N * dailyTarget) + 1.
  // If the user read more than their target on a previous day, we still
  // advance by exactly `dailyTarget` per completed day so the schedule
  // stays predictable and consistent.
  const startGlobal = Math.min(TOTAL_AYAHS, dayIndex * dailyTarget + 1);
  const endGlobal = Math.min(TOTAL_AYAHS, startGlobal + dailyTarget - 1);

  const start = globalAyahToRef(startGlobal);
  const end = globalAyahToRef(endGlobal);
  const startSurah = getSurah(start.surahId)!;
  const endSurah = getSurah(end.surahId)!;
  const versesCount = endGlobal - startGlobal + 1;
  const pagesCount = Math.max(1, Math.ceil(versesCount / 10)); // ~10 verses per page average
  const estMinutes = Math.max(5, Math.round(versesCount * MINUTES_PER_AYAH));
  const label =
    start.surahId === end.surahId
      ? `${startSurah.nameSimple} ${start.verseNumber}–${end.verseNumber}`
      : `${startSurah.nameSimple} ${start.verseNumber} → ${endSurah.nameSimple} ${end.verseNumber}`;
  return {
    dayIndex,
    totalDays,
    start,
    end,
    startSurah,
    endSurah,
    versesCount,
    pagesCount,
    estMinutes,
    label,
    juzNumber: juzForRef(start),
  };
}

/* ───────── Streak / mercy ────────────────────────────────────────── */

/**
 * Recompute niyyah streak from completed days. The niyyah streak is strict:
 * each consecutive calendar-day where the daily target was met extends the
 * streak. A single missed day resets the streak to 0. No mercy days.
 *
 * A day "counts" only if the user completed at least their dailyTarget
 * verses for that day (tracked by the presence of a JourneyDay entry —
 * the sync logic only creates one when the target is met).
 */
export function recomputeStreak(j: Journey): {
  currentStreak: number;
  longestStreak: number;
  mercyDayUsed: boolean;
  lastMercyWeek: string | null;
} {
  if (j.completedDays.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: j.longestStreak ?? 0,
      mercyDayUsed: false,
      lastMercyWeek: null,
    };
  }
  const dates = [...j.completedDays].map((d) => d.date).sort();
  let current = 1;
  let longest = 1;

  for (let i = 1; i < dates.length; i++) {
    const gap = daysBetween(dates[i - 1], dates[i]);
    if (gap === 1) {
      current++;
    } else {
      // Any gap > 1 day breaks the streak (strict, no mercy)
      current = 1;
    }
    if (current > longest) longest = current;
  }

  // Check if the streak is still active (last completed day must be today
  // or yesterday for the streak to be "current")
  const today = todayKey();
  const lastDate = dates[dates.length - 1];
  const gapFromToday = daysBetween(lastDate, today);
  if (gapFromToday > 1) {
    // Streak is broken — more than 1 day since last completion
    current = 0;
  }

  return {
    currentStreak: current,
    longestStreak: Math.max(longest, j.longestStreak ?? 0),
    mercyDayUsed: false,
    lastMercyWeek: null,
  };
}

/* ───────── Journey lifecycle ─────────────────────────────────────── */

function genId(): string {
  return `nyy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Resolve `goalValue` for the chosen `goalType`. */
export function resolveGoalValue(goalType: GoalType, requested: number): number {
  if (goalType === "khatm") return 30;
  if (goalType === "juz") return 30 * 7; // 30 juz, one per week
  return Math.max(1, Math.floor(requested));
}

export function createJourney(input: NewJourneyInput): Journey {
  const start = todayKey();
  const goalValue = resolveGoalValue(input.goalType, input.goalValue);
  const dailyTarget = Math.max(1, input.dailyTarget || 5);
  return {
    v: SCHEMA_VERSION,
    id: genId(),
    type: input.type,
    recipientName: input.recipientName.trim() || "Anonymous",
    occasion: input.occasion,
    personalDua: input.personalDua.trim(),
    goalType: input.goalType,
    goalValue,
    dailyTarget,
    startDate: start,
    targetDate: targetDateFor(start, goalValue),
    completedDays: [],
    currentStreak: 0,
    longestStreak: 0,
    mercyDayUsed: false,
    lastMercyWeek: null,
    isComplete: false,
    isActive: true,
    readerName: input.readerName?.trim() || undefined,
  };
}

export function markTodayComplete(j: Journey, portion: TodayPortion): Journey {
  const today = todayKey();
  if (j.completedDays.some((d) => d.date === today)) return j;
  const completedDays: JourneyDay[] = [
    ...j.completedDays,
    {
      date: today,
      versesRead: portion.versesCount,
      surahRange: portion.label,
      startKey: portion.start.key,
      endKey: portion.end.key,
    },
  ];
  const next: Journey = { ...j, completedDays };
  const streak = recomputeStreak(next);
  return {
    ...next,
    ...streak,
    isComplete: completedDays.length >= j.goalValue,
  };
}

export function totalVersesRead(j: Journey): number {
  return j.completedDays.reduce((sum, d) => sum + d.versesRead, 0);
}

export function progressPct(j: Journey): number {
  if (j.goalValue <= 0) return 0;
  return Math.min(100, Math.round((j.completedDays.length / j.goalValue) * 100));
}

/** Distinct surahs touched across all completed days. */
export function surahsTouched(j: Journey): number {
  const set = new Set<number>();
  for (const d of j.completedDays) {
    const s = parseRef(d.startKey);
    const e = parseRef(d.endKey);
    if (!s || !e) continue;
    for (let id = s.surahId; id <= e.surahId; id++) set.add(id);
  }
  return set.size;
}

/* ───────── Mock community data (anonymous wall) ──────────────────── */

export const MOCK_AMANAH_WALL: AmanahWallItem[] = [
  { type: "living", occasion: "Recovery", day: 23, total: 40, region: "Lahore" },
  { type: "departed", day: 40, total: 40, region: "London", isComplete: true },
  { type: "living", occasion: "Birthday", day: 7, total: 30, region: "Cairo" },
  { type: "personal", occasion: "Ramadan", day: 15, total: 30, region: "Jakarta" },
  { type: "departed", day: 1, total: 100, region: "Karachi" },
  { type: "living", occasion: "New baby", day: 4, total: 7, region: "Istanbul" },
  { type: "personal", occasion: "Tawakkul", day: 12, total: 30, region: "Toronto" },
  { type: "departed", occasion: "Sadaqah Jariyah", day: 60, total: 100, region: "Dubai" },
];

/* ───────── Achievements ──────────────────────────────────────────── */

export interface Achievement {
  id: string;
  /** A short, lyrical title — never gamified. */
  title: string;
  /** A one-line description of what was achieved. */
  description: string;
  /** Optional Quranic verse that resonates with this achievement. */
  verseRef?: string;
}

/**
 * Compute achievements from a (presumably completed) journey. The list is
 * deterministic and ordered from most-significant first so the UI can
 * render them as a scroll-friendly seal column.
 */
export function getAchievements(j: Journey): Achievement[] {
  const list: Achievement[] = [];
  const days = j.completedDays.length;
  const verses = totalVersesRead(j);
  const surahs = surahsTouched(j);
  const longest = j.longestStreak || j.currentStreak;

  if (j.isComplete) {
    list.push({
      id: "journey-complete",
      title: "Journey of Light, complete",
      description: `${days} days of reading, gifted with intention.`,
      verseRef: "Qur'an 2:201",
    });
  }

  // Khatm-class milestone (full Qur'an touched)
  if (verses >= TOTAL_AYAHS - 50 || surahs === 114) {
    list.push({
      id: "khatm",
      title: "A complete Khatm",
      description: `All ${TOTAL_AYAHS} verses, all 114 surahs.`,
      verseRef: "Qur'an 17:9",
    });
  } else if (surahs >= 30) {
    list.push({
      id: "wide-arc",
      title: "A wide arc of the Qur'an",
      description: `${surahs} surahs, ${verses} verses.`,
    });
  } else if (surahs >= 5) {
    list.push({
      id: "deep-passages",
      title: "Deep passages",
      description: `${surahs} surahs traveled with care.`,
    });
  }

  // Streak milestones (each tier is its own seal — never stack badges)
  if (longest >= 100) {
    list.push({
      id: "streak-100",
      title: "One hundred dawns",
      description: "A hundred consecutive days of reading. Steady and sure.",
    });
  } else if (longest >= 40) {
    list.push({
      id: "streak-40",
      title: "Forty dawns",
      description: "Forty consecutive days. The traditional span of devotion.",
    });
  } else if (longest >= 30) {
    list.push({
      id: "streak-30",
      title: "Thirty dawns",
      description: "A full lunar cycle of consistent return.",
    });
  } else if (longest >= 7) {
    list.push({
      id: "streak-7",
      title: "Seven dawns",
      description: "A week of unbroken rhythm.",
    });
  }

  if (j.mercyDayUsed) {
    list.push({
      id: "mercy",
      title: "Carried by mercy",
      description: "One day was missed, and mercy carried the journey forward.",
      verseRef: "Qur'an 2:286",
    });
  }

  // Verse-volume milestones (use only the highest tier reached)
  if (verses >= 1000) {
    list.push({
      id: "verses-1000",
      title: "A thousand verses",
      description: `${verses.toLocaleString()} verses gifted with niyyah.`,
    });
  } else if (verses >= 500) {
    list.push({
      id: "verses-500",
      title: "Five hundred verses",
      description: `${verses.toLocaleString()} verses gifted with niyyah.`,
    });
  } else if (verses >= 100) {
    list.push({
      id: "verses-100",
      title: "One hundred verses",
      description: `${verses.toLocaleString()} verses gifted with niyyah.`,
    });
  }

  // Always include the gift-itself seal so the certificate has at least one.
  if (list.length === 0) {
    list.push({
      id: "intention",
      title: "An intention sealed",
      description: "A reading dedicated with love and du'a.",
      verseRef: "Qur'an 2:201",
    });
  }

  return list;
}
