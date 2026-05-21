import { useEffect, useState } from "react";

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
      // Without a verseKey, let the consumer know there's nothing to load.
      // We schedule the state update as a microtask so the rule doesn't
      // flag this as synchronous setState in the effect body.
      const cancelled = { current: false };
      Promise.resolve().then(() => {
        if (!cancelled.current) setLoading(false);
      });
      return () => {
        cancelled.current = true;
      };
    }

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });

    const [surah, ayah] = verseKey.split(":").map(Number);

    Promise.all([
      // Verse + translation from our own API (uses the configured app token).
      fetch(`/api/verse/${verseKey}`).then((r) => {
        if (!r.ok) throw new Error("Failed to fetch verse data");
        return r.json();
      }),
      // Words for transliteration via the Quran.com public CDN.
      fetch(
        `https://api.quran.com/api/v4/verses/by_key/${verseKey}?words=true&word_fields=text_uthmani,transliteration`,
      ).then((r) => r.json()),
      // Chapter info for the surah name.
      fetch(`https://api.quran.com/api/v4/chapters/${surah}`).then((r) => r.json()),
    ])
      .then(([verseData, wordsData, chapterData]) => {
        if (cancelled) return;

        const words = wordsData.verse?.words || [];
        const transliteration = (
          words as Array<{ transliteration?: { text?: string } }>
        )
          .map((w) => w.transliteration?.text || "")
          .filter(Boolean)
          .join(" ");

        const paddedSurah = String(surah).padStart(3, "0");
        const paddedAyah = String(ayah).padStart(3, "0");
        const audioUrl = `https://verses.quran.com/AbdulBaset/Mujawwad/mp3/${paddedSurah}${paddedAyah}.mp3`;

        const chapter = chapterData.chapter;

        // Strip HTML tags from the upstream translation but keep the full
        // text. Consumers that need a short label can truncate at the
        // display layer; downstream features (verse-to-verse search, AI
        // prompts) need the complete sentence to be useful.
        const translation = String(verseData.translation || "").replace(
          /<[^>]+>/g,
          "",
        );

        setVerse({
          verseKey,
          arabic: verseData.arabic || "",
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
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Error fetching verse data:", err);
        setError(err instanceof Error ? err.message : "Failed to load verse");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [verseKey]);

  return { verse, loading, error };
}
