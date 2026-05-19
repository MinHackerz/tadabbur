"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getReadingEngagement,
  mercyAvailable,
  type ReadingEngagement,
} from "@/lib/readingEngagement";
import { getSurah } from "@/lib/niyyah";
import { ArrowRight } from "./icons";
import { GoldCorners } from "./Ornament";

interface Props {
  bookmarkCount: number;
  notesCount: number;
  isLoggedIn: boolean;
  onContinueReader: (surahId: number, hash?: string) => void;
  hasGoal: boolean;
  goalLabel?: string;
  goalPlanSummary?: string | null;
}

export default function RhythmStrip({
  bookmarkCount,
  notesCount,
  isLoggedIn,
  onContinueReader,
  hasGoal,
  goalLabel,
  goalPlanSummary,
}: Props) {
  const [eng, setEng] = useState<ReadingEngagement | null>(null);

  useEffect(() => {
    setEng(getReadingEngagement());
  }, []);

  const streak = eng?.streakDays ?? 0;
  const lastSurah = eng?.lastSurahId ? getSurah(eng.lastSurahId) : null;
  const lastVerse = eng?.lastVerseNumber ?? null;
  const mercyLeft = eng ? mercyAvailable(eng) : true;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
      {/* Continue */}
      <RhythmCard accent="gold" featured>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ny-gold m-0">
          Where you left off
        </p>
        {lastSurah ? (
          <>
            <p
              className="font-[var(--font-decorative)] text-[1.55rem] text-ny-ink m-0 mt-2 leading-tight text-right"
              dir="rtl"
              lang="ar"
            >
              {lastSurah.nameArabic}
            </p>
            <p className="text-[14px] font-semibold text-ny-ink m-0 mt-0.5">
              {lastSurah.nameSimple}
              {lastVerse && (
                <span className="text-ny-gold"> · ayah {lastVerse}</span>
              )}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-ny-charcoal/65 italic m-0 mt-2 leading-snug">
            No reading yet. Open the reader to begin your rhythm.
          </p>
        )}
        <button
          type="button"
          onClick={() =>
            onContinueReader(
              eng?.lastSurahId ?? 1,
              lastVerse ? `verse-${lastVerse}` : undefined,
            )
          }
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 bg-ny-forest text-white text-[13px] font-semibold hover:bg-ny-forest-deep transition-colors shadow-[0_8px_18px_rgba(20,48,40,0.28)] hover:shadow-[0_10px_22px_rgba(11,28,23,0.35)]"
        >
          Continue reading <ArrowRight />
        </button>
      </RhythmCard>

      {/* Streak */}
      <RhythmCard>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ny-gold m-0">
          Reading streak
        </p>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="font-[var(--font-niyyah-display)] text-[2.3rem] font-semibold text-ny-ink leading-none">
            {streak}
          </span>
          <span className="text-[14px] font-semibold text-ny-charcoal/65 ml-1">
            day{streak === 1 ? "" : "s"}
          </span>
        </div>
        <p className="text-[12px] text-ny-sage italic m-0 mt-2">
          {streak > 0
            ? "Return today to keep the rhythm alive."
            : "Read once today to begin a streak."}
        </p>
        <div
          className={[
            "mt-auto pt-3 border-t border-dashed border-ny-gold/25",
            "flex items-center gap-1.5 text-[11px] italic",
            mercyLeft ? "text-ny-gold" : "text-ny-charcoal/50",
          ].join(" ")}
        >
          <span className="text-base leading-none">✦</span>
          <span>
            {mercyLeft
              ? "Mercy day available this week"
              : "Mercy used — gentle return still welcome"}
          </span>
        </div>
      </RhythmCard>

      {/* Regular Goals */}
      <RhythmCard>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ny-gold m-0">
          Regular goals
        </p>
        {hasGoal && goalLabel ? (
          <>
            <div className="flex items-center gap-2 mt-2">
              <svg className="w-5 h-5 text-ny-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-[var(--font-niyyah-display)] text-[1.1rem] font-semibold text-ny-ink leading-none">
                Active
              </span>
            </div>
            <p className="text-[13px] text-ny-ink font-medium m-0 mt-1">
              {goalLabel}
            </p>
            {goalPlanSummary && (
              <p className="text-[12px] text-ny-sage italic m-0 mt-1">
                {goalPlanSummary}
              </p>
            )}
            <Link
              href="/goals"
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 border border-ny-gold/40 text-ny-ink bg-ny-cream-warm/60 text-[13px] font-semibold hover:bg-ny-cream-warm transition-colors"
            >
              Manage goal <ArrowRight />
            </Link>
          </>
        ) : (
          <>
            <p className="text-[13px] text-ny-charcoal/65 italic m-0 mt-2 leading-snug">
              Set a daily or weekly reading habit to build consistency.
            </p>
            <Link
              href="/goals"
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 bg-ny-forest text-white text-[13px] font-semibold hover:bg-ny-forest-deep transition-colors shadow-[0_8px_18px_rgba(20,48,40,0.28)] hover:shadow-[0_10px_22px_rgba(11,28,23,0.35)]"
            >
              Set a goal <ArrowRight />
            </Link>
          </>
        )}
      </RhythmCard>

      {/* Bookmarks + notes */}
      <RhythmCard>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ny-gold m-0">
          Your library
        </p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div>
            <p className="font-[var(--font-niyyah-display)] text-[2rem] font-semibold text-ny-ink leading-none m-0">
              {bookmarkCount}
            </p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ny-sage m-0 mt-1">
              bookmarks
            </p>
          </div>
          <div>
            <p className="font-[var(--font-niyyah-display)] text-[2rem] font-semibold text-ny-ink leading-none m-0">
              {notesCount}
            </p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-ny-sage m-0 mt-1">
              reflections
            </p>
          </div>
        </div>
        <Link
          href="/library"
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 border border-ny-gold/40 text-ny-ink bg-ny-cream-warm/60 text-[13px] font-semibold hover:bg-ny-cream-warm transition-colors"
        >
          {isLoggedIn ? "Open library" : "Sign in to save"} <ArrowRight />
        </Link>
      </RhythmCard>
    </div>
  );
}

function RhythmCard({
  children,
  accent = "default",
  featured = false,
}: {
  children: React.ReactNode;
  accent?: "default" | "gold";
  featured?: boolean;
}) {
  return (
    <article
      className={[
        "relative flex flex-col gap-2 p-5 rounded-2xl border parchment-bg overflow-hidden",
        featured
          ? "border-ny-gold/45 bg-gradient-to-br from-ny-cream-warm/40 to-ny-cream"
          : "border-ny-charcoal/10 bg-ny-ivory",
        "min-h-[180px]",
      ].join(" ")}
    >
      {accent === "gold" && (
        <span
          aria-hidden
          className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-ny-gold/55 to-transparent"
        />
      )}
      <GoldCorners inset="0.5rem" />
      <div className="relative flex flex-col gap-2 flex-1">{children}</div>
    </article>
  );
}
