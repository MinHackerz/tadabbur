"use client";

import { useState } from "react";
import { DAILY_ANGLES } from "@/lib/tadabbur-data";
import { PageContent } from "@/components/ui/primitives";
import Day1Recitation from "./days/Day1Recitation";
import Day2Translation from "./days/Day2Translation";
import Day3WordByWord from "./days/Day3WordByWord";
import Day4Revelation from "./days/Day4Revelation";
import Day5Sahabi from "./days/Day5Sahabi";
import Day6Tafsir from "./days/Day6Tafsir";
import Day7Reflection from "./days/Day7Reflection";
import Day8Natural from "./days/Day8Natural";
import Day9VerseToVerse from "./days/Day9VerseToVerse";
import Day10Dua from "./days/Day10Dua";
import Day11Historical from "./days/Day11Historical";
import Day12Scholar from "./days/Day12Scholar";
import Day13Constellation from "./days/Day13Constellation";
import Day14Calligraphy from "./days/Day14Calligraphy";
import Day15Certificate from "./days/Day15Certificate";
import TimerCountdown from "./TimerCountdown";

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
}

interface Props {
  day: number;
  verseKey: string;
  circleId: string;
  verse: VerseData;
  progress: any;
  onBack: () => void;
  onComplete: () => void;
  isReadOnly?: boolean;
}

export default function TadabburDayCard({ day, verseKey, circleId, verse, progress, onBack, onComplete, isReadOnly = false }: Props) {
  const angle = DAILY_ANGLES[day - 1];
  const [completing, setCompleting] = useState(false);
  const bypassTimer = process.env.NEXT_PUBLIC_BYPASS_TADABBUR_TIMER === "true";

  const isCompleted = progress?.completedDays?.includes(day);
  const isLastDay = day === 15;

  // Check if this day is locked (for showing timer)
  const isDayLocked = () => {
    if (bypassTimer) return false;
    if (day === 1) return false;
    if (!progress?.completedDays?.includes(day - 1)) return true;
    if (!progress?.lastCompletedAt) return false;
    
    const now = new Date().getTime();
    const lastCompleted = new Date(progress.lastCompletedAt).getTime();
    const hoursSinceCompletion = (now - lastCompleted) / (1000 * 60 * 60);
    
    return hoursSinceCompletion < 24;
  };

  // Calculate unlock time for timer
  const unlockTime = progress?.lastCompletedAt 
    ? new Date(new Date(progress.lastCompletedAt).getTime() + 24 * 60 * 60 * 1000)
    : new Date();

  async function handleJournalSave(content: string) {
    if (!content.trim() || !progress) return;
    
    try {
      await fetch("/api/tadabbur/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId: progress.id,
          day,
          content,
          isPublic: day === 7, // Day 7 is public reflection
        }),
      });
    } catch (error) {
      console.error("Failed to save journal:", error);
    }
  }

  async function handleReflectionPublish(content: string, isPublic: boolean, region?: string) {
    if (!content.trim() || !progress) return;
    
    try {
      await fetch("/api/tadabbur/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId: progress.id,
          day,
          content,
          isPublic,
          region,
        }),
      });
    } catch (error) {
      console.error("Failed to publish reflection:", error);
    }
  }

  async function handleDuaSave(dua: string) {
    if (!dua.trim() || !progress) return;
    
    try {
      await fetch("/api/tadabbur/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId: progress.id,
          day,
          content: dua,
          isPublic: false,
        }),
      });
    } catch (error) {
      console.error("Failed to save dua:", error);
    }
  }

  async function markComplete() {
    if (!progress) return;
    
    setCompleting(true);
    try {
      const response = await fetch("/api/tadabbur/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId: progress.id,
          day,
          action: "complete_day",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete day");
      }

      // Reload data
      await onComplete();
      
      // Navigate to next day if not last day
      if (!isLastDay) {
        // Small delay to ensure data is refreshed
        setTimeout(() => {
          window.location.href = `/tadabbur?circle=${circleId}&day=${day + 1}`;
        }, 300);
      } else {
        // Last day - go back to circle view
        setTimeout(() => {
          onBack();
        }, 300);
      }
    } catch (error) {
      console.error("Failed to mark complete:", error);
      setCompleting(false);
    }
  }

  function renderDayContent() {
    const existingJournal = progress?.journals?.find((j: any) => j.day === day);
    
    // Common props for all components
    const commonProps = {
      verseKey,
      verseText: verse.arabic,
      verseTranslation: verse.translation,
    };

    switch (day) {
      case 1:
        return (
          <Day1Recitation
            verseKey={verseKey}
            audioUrl={verse.audioUrl}
            onJournalSave={handleJournalSave}
            existingJournal={existingJournal?.content}
          />
        );
      case 2:
        return (
          <Day2Translation
            verseKey={verseKey}
            onReflectionSave={handleJournalSave}
            existingReflection={existingJournal?.content}
          />
        );
      case 3:
        return (
          <Day3WordByWord
            verseKey={verseKey}
          />
        );
      case 4:
        return <Day4Revelation circleId={circleId} {...commonProps} />;
      case 5:
        return <Day5Sahabi circleId={circleId} {...commonProps} />;
      case 6:
        return <Day6Tafsir verseKey={verseKey} />;
      case 7:
        return (
          <Day7Reflection
            onPublish={handleReflectionPublish}
            existingReflection={existingJournal ? {
              content: existingJournal.content,
              isPublic: existingJournal.isPublic,
              region: existingJournal.region,
            } : undefined}
          />
        );
      case 8:
        return <Day8Natural circleId={circleId} {...commonProps} />;
      case 9:
        return <Day9VerseToVerse verseTranslation={verse.translation} />;
      case 10:
        return (
          <Day10Dua
            verseKey={verseKey}
            verseText={verse.arabic}
            verseTranslation={verse.translation}
            onConfirm={(confirmed) => {
              if (confirmed) {
                handleDuaSave("Completed: Read verse as du'a in prayer");
              }
            }}
            existingConfirmation={Boolean(existingJournal?.content)}
          />
        );
      case 11:
        return <Day11Historical circleId={circleId} {...commonProps} />;
      case 12:
        return <Day12Scholar circleId={circleId} {...commonProps} />;
      case 13:
        return <Day13Constellation circleId={circleId} {...commonProps} />;
      case 14:
        return <Day14Calligraphy circleId={circleId} {...commonProps} />;
      case 15:
        return (
          <Day15Certificate 
            circleId={circleId}
            {...commonProps}
            progress={progress}
            onGenerateCertificate={async () => {
              // This is now handled internally in Day15Certificate
            }}
          />
        );
      default:
        return (
          <div className="text-center text-ink-secondary">
            Day {day} content coming soon...
          </div>
        );
    }
  }

  return (
    <PageContent>
      <div className="max-w-4xl mx-auto">
        {/* Read-Only Banner */}
        {isReadOnly && (
          <div className="bg-accent-subtle border border-accent/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <div className="text-[13px] font-medium text-ink">Viewing Completed Day</div>
              <div className="text-[11px] text-ink-tertiary">You're reviewing a day you've already completed</div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[14px] text-ink-secondary hover:text-accent transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>
          <div className="text-[13px] text-ink-tertiary font-mono">
            Day {day} of 15
          </div>
        </div>

        {/* The Verse - Always Visible */}
        <div className="bg-surface border border-border rounded-2xl p-8 mb-8 shadow-sm">
          <div className="text-[11px] uppercase tracking-wider text-ink-tertiary font-medium mb-4 text-center">
            The Verse
          </div>
          <div className="font-amiri text-[32px] leading-relaxed text-warm mb-4 text-right" dir="rtl">
            {verse.arabic}
          </div>
          <div className="font-niyyah-display italic text-[14px] text-ink-secondary mb-2 text-center">
            {verse.transliteration}
          </div>
          <div className="text-[13px] text-ink text-center">
            "{verse.translation}"
          </div>
        </div>

        {/* Decorative divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <div className="text-warm text-[20px]">✦</div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Today's Angle Header */}
        <div className="mb-6">
          <div className="text-[11px] uppercase tracking-wider text-accent font-medium mb-2">
            {angle.tag}
          </div>
          <h2 className="font-niyyah-display text-[28px] font-semibold text-ink mb-2">
            ✦ {angle.angleName}
          </h2>
          <p className="text-[13px] text-ink-tertiary">
            ~{angle.timeMinutes} minutes
          </p>
        </div>

        {/* Day-specific content */}
        <div className="mb-8">
          {renderDayContent()}
        </div>

        {/* Timer Display - Show when day is locked */}
        {!isReadOnly && isDayLocked() && (
          <div className="mb-6">
            <TimerCountdown 
              unlockTime={unlockTime}
              bypassTimer={false}
              onUnlock={() => {
                window.location.reload();
              }}
            />
          </div>
        )}

        {/* Complete button - minimal design matching website aesthetic */}
        {!isReadOnly && !isCompleted && !isDayLocked() && (
          <button
            onClick={markComplete}
            disabled={completing}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[13px] bg-accent text-white hover:bg-accent-hover transition-all active:scale-[0.98] cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {completing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Completing...</span>
              </>
            ) : (
              <>
                <span>Mark as Complete</span>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </>
            )}
          </button>
        )}

        {!isReadOnly && isCompleted && (
          <div className="text-center py-2.5 text-[13px] text-accent font-semibold flex items-center justify-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            <span>Day {day} completed</span>
          </div>
        )}
      </div>
    </PageContent>
  );
}
