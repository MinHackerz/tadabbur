"use client";
import type { ReaderPayload } from "@/lib/types";
import { IconArrowLeft, IconArrowRight } from "@/components/ui/primitives";

interface ReaderSurahHeroProps {
  chapter: ReaderPayload["chapter"];
  onNavigateSurah: (id: number) => void;
  compact?: boolean;
}

export default function ReaderSurahHero({ chapter, onNavigateSurah, compact = false }: ReaderSurahHeroProps) {
  return (
    <header className={`reader-surah-hero ${compact ? "reader-surah-hero--compact" : ""}`}>
      <div className="reader-surah-hero__card">
        <div className="reader-surah-hero__banner" aria-hidden />
        <div className="reader-surah-hero__body">
          <div className="reader-surah-hero__meta">
            <span className="reader-surah-hero__badge reader-surah-hero__badge--accent">
              Surah {chapter.id}
            </span>
            <span className="reader-surah-hero__badge">
              {chapter.versesCount ?? "–"} ayahs
            </span>
            <span className="reader-surah-hero__badge reader-surah-hero__badge--muted hidden sm:inline-flex">
              {chapter.id} of 114
            </span>
          </div>

          <div className="reader-surah-hero__titles">
            <p
              className="reader-surah-hero__arabic"
              dir="rtl"
              style={{ fontFamily: "var(--font-decorative)" }}
            >
              {chapter.nameArabic}
            </p>
            <h1 className="reader-surah-hero__name">{chapter.nameSimple}</h1>
            {chapter.translatedName && (
              <p className="reader-surah-hero__translated" dir="auto">
                {chapter.translatedName}
              </p>
            )}
          </div>

          <div className="reader-surah-hero__nav">
            <button
              type="button"
              disabled={chapter.id <= 1}
              onClick={() => onNavigateSurah(chapter.id - 1)}
              className="reader-surah-hero__nav-btn"
              aria-label="Previous surah"
            >
              <IconArrowLeft />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={chapter.id >= 114}
              onClick={() => onNavigateSurah(chapter.id + 1)}
              className="reader-surah-hero__nav-btn"
              aria-label="Next surah"
            >
              <span>Next</span>
              <IconArrowRight />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
