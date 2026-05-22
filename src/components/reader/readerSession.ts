import type { ReadingMode } from "./useReaderPrefs";

export const TRANSLATIONS = [
  { id: "85", label: "Abdul Haleem", lang: "English" },
  { id: "20", label: "Saheeh International", lang: "English" },
  { id: "203", label: "Hilali & Khan", lang: "English" },
  { id: "84", label: "T. Usmani", lang: "English" },
  { id: "22", label: "Yusuf Ali", lang: "English" },
  { id: "19", label: "Pickthall", lang: "English" },
  { id: "95", label: "Maududi (Tafhim)", lang: "English" },
] as const;

export const TAFSIRS = [
  { id: "168", label: "Ma'arif al-Quran (English)" },
  { id: "169", label: "Tafsir Ibn Kathir (English)" },
  { id: "14", label: "Al-Jalalayn (English)" },
] as const;

export const RECITERS = [
  { id: "7", label: "Mishary Rashid Alafasy" },
  { id: "1", label: "AbdulBaset AbdulSamad" },
  { id: "2", label: "Abdur-Rahman as-Sudais" },
  { id: "12", label: "Mahmoud Khalil Al-Husary" },
] as const;

export const READING_MODES: { id: ReadingMode; label: string; desc: string }[] = [
  { id: "both", label: "Arabic + Translation", desc: "See both texts together" },
  { id: "arabic", label: "Arabic only", desc: "Focus on the mushaf text" },
  { id: "translation", label: "Translation only", desc: "Study meaning without Arabic" },
];

export interface ReaderSession {
  surahId: number;
  trId: string;
  auId: string;
  readingMode: ReadingMode;
  fontSize: number;
  darkMode: boolean;
  showTransliteration: boolean;
}

const STORAGE_KEY = "tadabbur-reader-session";

export const SESSION_DEFAULTS: ReaderSession = {
  surahId: 1,
  trId: "85",
  auId: "7",
  readingMode: "both",
  fontSize: 3,
  darkMode: false,
  showTransliteration: false,
};

function migrateLegacyPrefs(): Partial<ReaderSession> | null {
  try {
    // Try new key first
    const legacy = localStorage.getItem("tadabbur-reader-prefs") || 
                   localStorage.getItem("quran-insight-reader-prefs");
    if (!legacy) return null;
    const p = JSON.parse(legacy) as Partial<ReaderSession>;
    // Clean up old keys
    localStorage.removeItem("quran-insight-reader-prefs");
    localStorage.removeItem("tadabbur-reader-prefs");
    return p;
  } catch {
    return null;
  }
}

export function loadReaderSession(): ReaderSession {
  if (typeof window === "undefined") return SESSION_DEFAULTS;
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = migrateLegacyPrefs();
      if (legacy) return { ...SESSION_DEFAULTS, ...legacy, surahId: clampSurah(legacy.surahId ?? 1) };
      return SESSION_DEFAULTS;
    }
    const p = JSON.parse(raw) as Partial<ReaderSession>;
    return {
      surahId: clampSurah(p.surahId ?? SESSION_DEFAULTS.surahId),
      trId: p.trId ?? SESSION_DEFAULTS.trId,
      auId: p.auId ?? SESSION_DEFAULTS.auId,
      readingMode: p.readingMode ?? SESSION_DEFAULTS.readingMode,
      fontSize: Math.min(5, Math.max(1, p.fontSize ?? SESSION_DEFAULTS.fontSize)),
      darkMode: p.darkMode ?? SESSION_DEFAULTS.darkMode,
      showTransliteration: p.showTransliteration ?? SESSION_DEFAULTS.showTransliteration,
    };
  } catch {
    return SESSION_DEFAULTS;
  }
}

export function saveReaderSession(session: ReaderSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    document.documentElement.dataset.theme = session.darkMode ? "dark" : "light";
  } catch {
    /* ignore */
  }
}

export function clampSurah(n: number) {
  return Math.min(114, Math.max(1, Math.floor(n) || 1));
}

export function buildReaderUrl(session: ReaderSession, hash?: string, source?: string) {
  let q = `?tr=${encodeURIComponent(session.trId)}&au=${encodeURIComponent(session.auId)}`;
  if (source) q += `&source=${encodeURIComponent(source)}`;
  const base = `/read/${session.surahId}${q}`;
  return hash ? `${base}${hash.startsWith("#") ? hash : `#${hash}`}` : base;
}

export function translationLabel(trId: string) {
  return TRANSLATIONS.find((t) => t.id === trId)?.label ?? "Translation";
}

export function reciterLabel(auId: string) {
  return RECITERS.find((r) => r.id === auId)?.label ?? "Reciter";
}
