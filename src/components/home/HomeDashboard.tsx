"use client";

import type React from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getReadingEngagement,
  mercyAvailable,
  type ReadingEngagement,
} from "@/lib/readingEngagement";
import { getReadingLevel } from "@/lib/readingLevels";
import { IconArrowRight } from "@/components/ui/primitives";

interface DailyVerse {
  verseKey: string;
  surahId: number;
  verseNumber: number;
  arabicText: string | null;
  translationText: string | null;
  error: string | null;
}

interface HomeDashboardProps {
  surahId: number;
  chapters: { id: number; nameSimple: string; nameArabic: string | null }[];
  isLoggedIn: boolean;
  bookmarkCount: number;
  notesCount: number;
  hasGoal: boolean;
  goalLabel?: string;
  goalPlanSummary?: string | null;
  onContinueReading: (surah: number, hash?: string) => void;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Assalamu alaikum";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeDashboard({
  surahId,
  chapters,
  isLoggedIn,
  bookmarkCount,
  notesCount,
  hasGoal,
  goalLabel,
  goalPlanSummary,
  onContinueReading,
}: HomeDashboardProps) {
  const [engagement, setEngagement] = useState<ReadingEngagement | null>(null);
  const [dailyVerse, setDailyVerse] = useState<DailyVerse | null>(null);
  const [dailyVerseStatus, setDailyVerseStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    setEngagement(getReadingEngagement());
    fetch("/api/verse/daily")
      .then(async (r) => {
        const data = (await r.json()) as DailyVerse;
        if (!r.ok || data.error) {
          setDailyVerseStatus("error");
          return;
        }
        if (data.arabicText || data.translationText) {
          setDailyVerse(data);
          setDailyVerseStatus("ready");
          return;
        }
        setDailyVerseStatus("error");
      })
      .catch(() => setDailyVerseStatus("error"));
  }, []);

  const continueSurah = chapters.find((c) => c.id === (engagement?.lastSurahId ?? surahId));
  const level = getReadingLevel(engagement?.streakDays ?? 0);
  const readToday = engagement?.lastReadDate === new Date().toISOString().slice(0, 10);
  const dailyPct = engagement
    ? Math.min(100, Math.round((engagement.todayAyahsMarked / engagement.dailyAyahGoal) * 100))
    : 0;
  const mercyLeft = engagement ? mercyAvailable(engagement) : true;

  const continueLabel = useMemo(() => {
    if (!engagement?.lastVerseNumber) return null;
    return `Ayah ${engagement.lastVerseNumber}`;
  }, [engagement?.lastVerseNumber]);

  return (
    <section className="home-dashboard mb-8 md:mb-10" style={{ animation: "fade-in .25s ease both" }}>
      <header className="home-dashboard__top mb-6">
        <div className="home-dashboard__greeting-block">
          <p className="home-dashboard__greeting">{greeting()}</p>
          <h2 className="home-dashboard__headline">
            {isLoggedIn ? "Welcome back to your Qur'an" : "Your Qur'an space"}
          </h2>
        </div>
        <div className="home-dashboard__level" title={level.subtitle}>
          <span className="home-dashboard__level-label">Your title</span>
          <span className="home-dashboard__level-title">{level.title}</span>
        </div>
      </header>

      {/* Where you left off */}
      <article className="home-continue">
        <div className="home-continue__body">
          <span className="home-continue__eyebrow">Where you left off</span>
          {continueSurah ? (
            <>
              <p
                className="home-continue__arabic"
                dir="rtl"
                style={{ fontFamily: "var(--font-arabic)" }}
              >
                {continueSurah.nameArabic ?? continueSurah.nameSimple}
              </p>
              <p className="home-continue__name">
                {continueSurah.nameSimple}
                {continueLabel ? (
                  <span className="home-continue__verse"> · {continueLabel}</span>
                ) : null}
              </p>
            </>
          ) : (
            <p className="home-continue__empty">Choose a surah below to begin your session.</p>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            onContinueReading(
              engagement?.lastSurahId ?? surahId,
              engagement?.lastVerseNumber ? `verse-${engagement.lastVerseNumber}` : undefined,
            )
          }
          className="home-continue__btn"
        >
          Continue from here
          <IconArrowRight />
        </button>
      </article>

      <div className="home-dashboard__grid">
        {/* Streak + mercy */}
        <article className="home-stat-card">
          <span className="home-stat-card__label">Reading streak</span>
          <p className="home-stat-card__value">
            {engagement?.streakDays ?? 0}
            <span className="home-stat-card__unit">days</span>
          </p>
          <p className="home-stat-card__hint">
            {readToday
              ? "You read today — barakallahu feek."
              : "Open the reader today to extend your rhythm."}
          </p>
          <p className="home-stat-card__mercy">
            {mercyLeft
              ? "1 mercy day left this week — a missed day won't break your streak."
              : "Mercy day used this week — still, return with intention."}
          </p>
          <div className="home-stat-card__progress-wrap">
            <div className="flex justify-between text-[11px] font-semibold text-ink-secondary mb-1.5">
              <span>Daily focus</span>
              <span className="tabular-nums">
                {engagement?.todayAyahsMarked ?? 0} / {engagement?.dailyAyahGoal ?? 10}
              </span>
            </div>
            <div className="home-stat-card__bar">
              <div className="home-stat-card__bar-fill" style={{ width: `${dailyPct}%` }} />
            </div>
          </div>
        </article>

        {/* Verse of the day from API */}
        <article className="home-stat-card home-stat-card--verse">
          <span className="home-stat-card__label">Verse of the day</span>
          {dailyVerseStatus === "loading" && (
            <p className="home-stat-card__hint">Loading today&apos;s verse…</p>
          )}
          {dailyVerseStatus === "error" && (
            <p className="home-stat-card__hint">Could not load today&apos;s verse. Try again later.</p>
          )}
          {dailyVerseStatus === "ready" && dailyVerse && (
            <>
              {dailyVerse.arabicText && (
                <p
                  className="home-stat-card__arabic"
                  dir="rtl"
                  style={{ fontFamily: "var(--font-arabic)" }}
                >
                  {dailyVerse.arabicText}
                </p>
              )}
              {dailyVerse.translationText && (
                <p className="home-stat-card__translation">
                  &ldquo;{dailyVerse.translationText}&rdquo;
                </p>
              )}
              <button
                type="button"
                onClick={() =>
                  onContinueReading(dailyVerse.surahId, `verse-${dailyVerse.verseNumber}`)
                }
                className="home-stat-card__link"
              >
                Open {dailyVerse.verseKey} →
              </button>
            </>
          )}
        </article>

        {/* Goals & journal */}
        <article className="home-stat-card home-stat-card--links">
          <span className="home-stat-card__label">Your path</span>
          {goalPlanSummary && (
            <p className="home-stat-card__plan">{goalPlanSummary}</p>
          )}
          <div className="home-stat-card__links">
            <DashLink
              href="/goals"
              label={hasGoal ? "Today's plan" : "Set a khatm goal"}
              sub={goalLabel ?? "Daily portions · auto-adjusted"}
            />
            <DashLink
              href="/library"
              label="Verse journal"
              sub={
                notesCount > 0
                  ? `${notesCount} reflection${notesCount === 1 ? "" : "s"} saved`
                  : `${bookmarkCount} bookmarks`
              }
            />
          </div>
        </article>
      </div>

      <div className="home-quick-actions">
        <HabitCard
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          }
          title="Read"
          desc="Resume your surah"
          onClick={() => onContinueReading(surahId)}
        />
        <HabitCard
          href="/search"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          }
          title="Search"
          desc="Find any ayah"
        />
        <HabitCard
          href="/reflect"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
            </svg>
          }
          title="Reflect"
          desc="Share insights"
        />
        <HabitCard
          href="/goals"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} width={22} height={22}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          }
          title="Goals"
          desc="Khatm planner"
        />
      </div>
    </section>
  );
}

function DashLink({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} className="home-dash-link">
      <span className="home-dash-link__label">{label}</span>
      <span className="home-dash-link__sub">{sub}</span>
    </Link>
  );
}

function HabitCard({
  href,
  icon,
  title,
  desc,
  onClick,
}: {
  href?: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="home-habit__icon">{icon}</span>
      <span className="home-habit__title">{title}</span>
      <span className="home-habit__desc">{desc}</span>
    </>
  );
  const className = "home-habit";
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return (
    <Link href={href ?? "/"} className={className}>
      {content}
    </Link>
  );
}
