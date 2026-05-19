"use client";
import type { ReaderVerse } from "@/lib/types";
import type { ReadingMode } from "./useReaderPrefs";
import type { InsightTab } from "./insightTypes";
import { prefetchHadith, prefetchReflect, prefetchTafsir, prefetchTranslations } from "./insightApi";
import VerseTranslationLine from "./VerseTranslationLine";

interface VerseCardProps {
  verse: ReaderVerse;
  chapterId: number;
  translationId: string;
  readingMode: ReadingMode;
  showTransliteration: boolean;
  fontClasses: { arabic: string; translation: string };
  isBookmarked: boolean;
  hasNote: boolean;
  isActive: boolean;
  isAudioPlaying?: boolean;
  isSurahHighlight?: boolean;
  isCompleted?: boolean;
  isCopied?: boolean;
  isLoggedIn: boolean;
  onBookmark: () => void;
  onNote: () => void;
  onCopy: () => void;
  onPlay: () => void;
  onMarkComplete?: () => void;
  onUndoComplete?: () => void;
  onOpenInsights: (tab?: InsightTab) => void;
  /** Called with the article element once mounted — used by the reading tracker */
  onObserve?: (el: HTMLElement | null, verseKey: string) => void;
}

export default function VerseCard({
  verse,
  chapterId,
  translationId,
  readingMode,
  showTransliteration,
  fontClasses,
  isBookmarked,
  hasNote,
  isActive,
  isAudioPlaying = false,
  isSurahHighlight = false,
  isCompleted = false,
  isCopied = false,
  isLoggedIn,
  onBookmark,
  onNote,
  onCopy,
  onPlay,
  onMarkComplete,
  onUndoComplete,
  onOpenInsights,
  onObserve,
}: VerseCardProps) {
  const verseKey = verse.verseKey ?? `${chapterId}:${verse.verseNumber}`;
  const showArabic = readingMode !== "translation";
  const showTranslation = readingMode !== "arabic";
  const highlighted = isActive || isSurahHighlight;

  return (
    <article
      id={`verse-${verse.verseNumber}`}
      ref={(el) => onObserve?.(el, verseKey)}
      className={`verse-card group relative scroll-mt-32 transition-all duration-300 ${
        highlighted
          ? "verse-card--active"
          : isBookmarked
            ? "verse-card--bookmarked"
            : ""
      }`}
    >
      <div className="flex items-start gap-5">
        <div
          className={`verse-card__number flex items-center justify-center w-11 h-11 rounded-full text-[13px] font-bold shrink-0 tabular-nums transition-colors ${
            highlighted
              ? "bg-accent text-white shadow-[0_4px_14px_color-mix(in_srgb,var(--color-accent)_45%,transparent)]"
              : "bg-warm-subtle border border-warm/25 text-warm"
          }`}
          aria-hidden
        >
          {verse.verseNumber}
        </div>

        <div className="flex-1 min-w-0">
          {showArabic && (
            <p
              className={`text-ink ${fontClasses.arabic} text-right leading-[2.15] mb-0`}
              dir="rtl"
              style={{ fontFamily: "var(--font-arabic)" }}
            >
              {verse.arabicText}
            </p>
          )}

          {showTransliteration && verse.transliterationText && (
            <p
              className={`text-ink-secondary ${fontClasses.translation} italic leading-relaxed ${showArabic ? "mt-4" : ""}`}
              dir="ltr"
            >
              {verse.transliterationText}
            </p>
          )}

          {(showArabic || showTransliteration) && showTranslation && (
            <div className="my-6 flex items-center gap-3" aria-hidden>
              <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-warm/60 text-[10px]">✦</span>
              <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
          )}

          {showTranslation && (
            <VerseTranslationLine
              verseKey={verseKey}
              translationId={translationId}
              serverText={verse.translationText}
              fontClasses={fontClasses}
              translationOnly={readingMode === "translation"}
            />
          )}

          {/* Action buttons horizontally at bottom - single line for all devices */}
          <div className="verse-card__actions flex flex-wrap items-center gap-1.5 mt-6 pt-4 border-t border-border/70">
            <ActionChip
              onClick={onPlay}
              active={isAudioPlaying}
              disabled={!verse.audioUrl}
              label={isAudioPlaying ? "Pause" : "Play"}
              icon={
                isAudioPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
                    <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" />
                  </svg>
                )
              }
            />
            <ActionChip
              onPointerDown={() => {
                prefetchTranslations(verseKey, translationId);
                prefetchTafsir(verseKey);
              }}
              onClick={() => onOpenInsights("tafsir")}
              label="Tafsir"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                </svg>
              }
            />
            <ActionChip
              onPointerDown={() => {
                prefetchTranslations(verseKey, translationId);
                prefetchHadith(verseKey);
              }}
              onClick={() => onOpenInsights("hadith")}
              label="Related Hadith"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
              }
            />
            <ActionChip
              onClick={onCopy}
              active={isCopied}
              label={isCopied ? "Copied" : "Copy"}
              icon={
                isCopied ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                  </svg>
                )
              }
            />
            {isLoggedIn && (
              <>
                <ActionChip
                  onClick={onBookmark}
                  active={isBookmarked}
                  label={isBookmarked ? "Saved" : "Save"}
                  icon={
                    <svg viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} width={14} height={14}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
                    </svg>
                  }
                />
                <ActionChip
                  onClick={onNote}
                  active={hasNote}
                  label={hasNote ? "Note" : "Note"}
                  icon={
                    hasNote ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" width={14} height={14}>
                        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 0 1 .67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 1 1-.671-1.34l.041-.022ZM12 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                      </svg>
                    )
                  }
                />
                <ActionChip
                  onClick={() => isCompleted ? onUndoComplete?.() : onMarkComplete?.()}
                  active={isCompleted}
                  label={isCompleted ? "Completed ✓" : "Mark complete"}
                  icon={
                    <svg viewBox="0 0 24 24" fill={isCompleted ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} width={14} height={14}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>

      {isBookmarked && (
        <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warm-subtle text-warm text-[10px] font-bold uppercase tracking-wide">
          Saved
        </span>
      )}
    </article>
  );
}

function ActionChip({
  onClick,
  onPointerDown,
  label,
  icon,
  active = false,
  disabled = false,
}: {
  onClick: () => void;
  onPointerDown?: () => void;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`verse-chip ${active ? "verse-chip--active" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      aria-label={label}
      title={label}
    >
      <span className="verse-chip__icon">{icon}</span>
      <span className="verse-chip__label">{label}</span>
    </button>
  );
}
