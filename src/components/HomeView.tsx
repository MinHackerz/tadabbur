"use client";

import NiyyahHomeSection from "@/components/niyyah/NiyyahHomeSection";

type Chapter = {
  id: number;
  nameSimple: string;
  nameArabic: string | null;
  versesCount: number | null;
  readerUrl: string;
};

type HomeViewReadingMode = "both" | "arabic" | "translation";

/**
 * Home page is intentionally minimal: the Niyyah Gift System sits at the
 * heart, surrounded by a contemplative companion strip — Verse of the Day,
 * a mood-based ayah, and a calm rhythm strip showing streak / library /
 * progress. The visual language is luxury Islamic manuscript.
 */
export interface HomeViewProps {
  chapters: Chapter[];
  chaptersError?: string | null;
  isLoggedIn: boolean;
  bookmarkCount: number;
  notesCount: number;
  hasGoal: boolean;
  goalLabel?: string;
  goalPlanSummary?: string | null;
  sessionHydrated: boolean;
  surahId: number;
  setSurahId: (n: number) => void;
  trId: string;
  setTrId: (v: string) => void;
  auId: string;
  setAuId: (v: string) => void;
  readingMode: HomeViewReadingMode;
  setReadingMode: (m: HomeViewReadingMode) => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  onOpenReader: (surah?: number, hash?: string) => void;
}

export default function HomeView({
  isLoggedIn,
  bookmarkCount,
  notesCount,
  trId,
  onOpenReader,
}: HomeViewProps) {
  return (
    <div className="relative pb-24 md:pb-12 niyyah-scope">
      <NiyyahHomeSection
        onOpenReader={(surah, hash) => onOpenReader(surah, hash)}
        trId={trId}
        bookmarkCount={bookmarkCount}
        notesCount={notesCount}
        isLoggedIn={isLoggedIn}
      />

      <footer className="flex justify-center mt-14 pt-8 border-t border-ny-gold/20 max-w-5xl mx-auto">
        <p className="text-[12px] text-ny-charcoal/55 italic">
          Powered by{" "}
          <a
            href="https://api-docs.quran.foundation"
            target="_blank"
            rel="noopener"
            className="text-ny-forest hover:text-ny-gold transition-colors not-italic font-semibold"
          >
            Quran Foundation
          </a>
        </p>
      </footer>
    </div>
  );
}
