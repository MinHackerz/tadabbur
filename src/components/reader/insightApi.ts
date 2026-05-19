import { preload } from "swr";

const DEFAULT_TAFSIR_ID = "168";

export const fetchInsight = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url, { credentials: "include" });
  const p = (await r.json().catch(() => ({}))) as T & { message?: string };
  if (!r.ok) throw new Error((p as { message?: string }).message ?? "Request failed.");
  return p;
};

export function tafsirInsightUrl(verseKey: string, tafsirId = DEFAULT_TAFSIR_ID) {
  const encodedKey = encodeURIComponent(verseKey);
  return `/api/ayah/${encodedKey}/insights?type=tafsir&tafsirId=${encodeURIComponent(tafsirId)}`;
}

export function prefetchTafsir(verseKey: string, tafsirId = DEFAULT_TAFSIR_ID) {
  void preload(tafsirInsightUrl(verseKey, tafsirId), fetchInsight);
}

export function hadithInsightUrl(verseKey: string) {
  const encodedKey = encodeURIComponent(verseKey);
  return `/api/ayah/${encodedKey}/insights?type=hadith`;
}

export function prefetchHadith(verseKey: string) {
  void preload(hadithInsightUrl(verseKey), fetchInsight);
}

export function translationsInsightUrl(verseKey: string, translationId: string) {
  const encodedKey = encodeURIComponent(verseKey);
  return `/api/ayah/${encodedKey}/insights?type=translations&tr=${encodeURIComponent(translationId)}`;
}

const prefetchedKeys = new Set<string>();

export function prefetchTranslations(verseKey: string, translationId: string) {
  const key = `${verseKey}:${translationId}`;
  if (prefetchedKeys.has(key)) return;
  prefetchedKeys.add(key);
  void preload(translationsInsightUrl(verseKey, translationId), fetchInsight);
}

export function reflectInsightUrl(verseKey: string) {
  const encodedKey = encodeURIComponent(verseKey);
  return `/api/ayah/${encodedKey}/insights?type=reflect`;
}

export function prefetchReflect(verseKey: string) {
  void preload(reflectInsightUrl(verseKey), fetchInsight);
}
