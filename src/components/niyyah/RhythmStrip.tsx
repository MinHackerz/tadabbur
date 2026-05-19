"use client";

import Link from "next/link";
import useSWR from "swr";
import { getSurah } from "@/lib/niyyah";
import { ArrowRight } from "./icons";
import { GoldCorners } from "./Ornament";
import type { TodayReadingStats } from "@/app/api/reading/today/route";

const fetchJson = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error("fetch failed");
  return r.json() as Promise<T>;
};

interface ReadingHistoryRow {
  id: string;
  date: string;
  surahId: number;
  versesRead: number;
  minutesRead: number;
  pagesRead: number;
  firstVerseKey: string | null;
  lastVerseKey: string | null;
}

interface Props {
  bookmarkCount: number;
  notesCount: number;
  isLoggedIn: boolean;
  onContinueReader: (surahId: number, hash?: string) => void;
  hasGoal: boolean;
  goalLabel?: string;
  goalPlanSummary?: string | null;
}

function computeStreak(sessions: ReadingHistoryRow[]): number {
  if (!sessions.length) return 0;
  const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  // Streak must include today or yesterday to be active.
  if (uniqueDates[0] !== today) {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (uniqueDates[0] !== yesterday) return 0;
  }
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]).getTime();
    const curr = new Date(uniqueDates[i]).getTime();
    if (prev - curr <= 86_400_000 * 1.5) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
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
  // Fetch today's real reading stats from the server (only when logged in)
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayStats } = useSWR<TodayReadingStats>(
    isLoggedIn ? `/api/reading/today?date=${today}` : null,
    fetchJson,
    { revalidateOnFocus: true, refreshInterval: 30_000 },
  );

  // Fetch reading history to compute streak and last position
  const { data: history } = useSWR<ReadingHistoryRow[]>(
    isLoggedIn ? "/api/reading/history" : null,
    fetchJson,
    { revalidateOnFocus: false },
  );

  const streak = history ? computeStreak(history) : 0;
  const lastSession = history?.[0] ?? null;
  const lastSurah = lastSession ? getSurah(lastSession.surahId) : null;
  const lastVerse = lastSession?.lastVerseKey?.split(":")[1] ?? null;
  const readToday = lastSession?.date === today;

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
              lastSession?.surahId ?? 1,
              lastVerse ? `verse-${lastVerse}` : undefined,
            )
          }
          className="rhythm-btn rhythm-btn--primary mt-auto"
        >
          Continue reading <ArrowRight />
        </button>
      </RhythmCard>

      {/* Today's reading stats */}
      <RhythmCard accent="gold">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-ny-gold m-0">
          Today&apos;s reading
        </p>
        {isLoggedIn && todayStats ? (
          <>
            <dl className="grid grid-cols-3 gap-2 mt-2">
              <div className="flex flex-col items-center">
                <dt className="text-[9px] uppercase tracking-[0.14em] text-ny-sage font-bold">Verses</dt>
                <dd className="m-0 font-[var(--font-niyyah-display)] text-[1.6rem] font-semibold text-ny-ink leading-none mt-0.5">
                  {todayStats.versesRead}
                </dd>
              </div>
              <div className="flex flex-col items-center">
                <dt className="text-[9px] uppercase tracking-[0.14em] text-ny-sage font-bold">Minutes</dt>
                <dd className="m-0 font-[var(--font-niyyah-display)] text-[1.6rem] font-semibold text-ny-ink leading-none mt-0.5">
                  {todayStats.minutesRead}
                </dd>
              </div>
              <div className="flex flex-col items-center">
                <dt className="text-[9px] uppercase tracking-[0.14em] text-ny-sage font-bold">Streak</dt>
                <dd className="m-0 font-[var(--font-niyyah-display)] text-[1.6rem] font-semibold text-ny-ink leading-none mt-0.5">
                  {streak}d
                </dd>
              </div>
            </dl>
            <p className="text-[11px] text-ny-sage italic m-0 mt-1.5">
              {readToday
                ? "You read today — barakallahu feek."
                : "Open the reader to extend your rhythm."}
            </p>
          </>
        ) : isLoggedIn ? (
          <p className="text-[13px] text-ny-charcoal/65 italic m-0 mt-2 leading-snug">
            Open the reader to start tracking today&apos;s session.
          </p>
        ) : (
          <p className="text-[13px] text-ny-charcoal/65 italic m-0 mt-2 leading-snug">
            Sign in to track verses, minutes, and pages read.
          </p>
        )}
        <Link
          href="/read/1"
          className="rhythm-btn rhythm-btn--primary mt-auto"
        >
          Open reader <ArrowRight />
        </Link>
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
              className="rhythm-btn rhythm-btn--secondary mt-auto"
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
              className="rhythm-btn rhythm-btn--primary mt-auto"
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
          className="rhythm-btn rhythm-btn--secondary mt-auto"
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
