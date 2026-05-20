import { useState, useEffect } from "react";

interface VerseData {
  verseKey: string;
  arabic: string;
  transliteration: string;
  translation: string;
  audioUrl: string;
  surahName: string;
  surahNameArabic: string;
  verseNumber: number;
  surahNumber: number;
  juzNumber: number;
  pageNumber: number;
}

interface UseVerseDataResult {
  verse: VerseData | null;
  loading: boolean;
  error: string | null;
}

export function useVerseData(verseKey: string): UseVerseDataResult {
  const [verse, setVerse] = useState<VerseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!verseKey) {
      setLoading(false);
      return;
    }

    fetchVerseData();
  }, [verseKey]);

  async function fetchVerseData() {
    try {
      setLoading(true);
      setError(null);

      const [surah, ayah] = verseKey.split(":").map(Number);

      // Fetch verse text (Arabic) and metadata
      const verseTextRes = await fetch(
        `https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=${verseKey}`
      );
      const verseTextData = await verseTextRes.json();
      const verseText = verseTextData.verses?.[0];

      if (!verseText) {
        throw new Error("Verse not found");
      }

      // Fetch verse with word fields for transliteration
      const wordsRes = await fetch(
        `https://api.quran.com/api/v4/verses/by_key/${verseKey}?words=true&word_fields=text_uthmani,transliteration`
      );
      const wordsData = await wordsRes.json();
      const words = wordsData.verse?.words || [];

      // Extract transliteration from words
      const transliteration = words
        .map((w: any) => w.transliteration?.text || "")
        .filter(Boolean)
        .join(" ");

      // Construct audio URL - Quran.com format with reciter
      const paddedSurah = String(surah).padStart(3, "0");
      const paddedAyah = String(ayah).padStart(3, "0");
      const audioUrl = `https://verses.quran.com/AbdulBaset/Mujawwad/mp3/${paddedSurah}${paddedAyah}.mp3`;

      // Fetch chapter info for surah name
      const chapterRes = await fetch(
        `https://api.quran.com/api/v4/chapters/${surah}`
      );
      const chapterData = await chapterRes.json();
      const chapter = chapterData.chapter;

      // Fetch English translation (using Dr. Mustafa Khattab - The Clear Quran, translation ID: 131)
      const translationRes = await fetch(
        `https://api.quran.com/api/v4/quran/translations/131?verse_key=${verseKey}`
      );
      const translationData = await translationRes.json();
      const translation = translationData.translations?.[0]?.text || "";

      setVerse({
        verseKey,
        arabic: verseText.text_uthmani,
        transliteration,
        translation,
        audioUrl,
        surahName: chapter?.name_simple || "",
        surahNameArabic: chapter?.name_arabic || "",
        verseNumber: ayah,
        surahNumber: surah,
        juzNumber: wordsData.verse?.juz_number || 0,
        pageNumber: wordsData.verse?.page_number || 0,
      });
    } catch (err) {
      console.error("Error fetching verse data:", err);
      setError(err instanceof Error ? err.message : "Failed to load verse");
    } finally {
      setLoading(false);
    }
  }

  return { verse, loading, error };
}
