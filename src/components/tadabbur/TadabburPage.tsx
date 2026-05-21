"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DAILY_ANGLES } from "@/lib/tadabbur-data";
import { useVerseData } from "@/hooks/useVerseData";
import TadabburCircleCard from "./TadabburCircleCard";
import ConstellationProgress from "./ConstellationProgress";
import TadabburDayCard from "./TadabburDayCard";
import CommunityCircle from "./CommunityCircle";
import { PageContent, PageHero, SectionTitle, SignInBanner } from "@/components/ui/primitives";

interface TadabburCircle {
  id: string;
  verseKey: string;
  hijriMonth: string;
  hijriYear: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  participantCount: number;
  dayProgress: Record<number, number>;
  userProgress: TadabburProgress | null;
}

interface TadabburProgress {
  id: string;
  currentDay: number;
  completedDays: number[];
  lastCompletedAt: string | null;
  startedDate: string;
  isComplete: boolean;
  completedAt: string | null;
  personalStatement: string | null;
  verseMemorised: boolean;
  duaLearned: boolean;
  timerEnabled: boolean;
  journals: Array<{ day: number; content: string; isPublic: boolean; region: string | null }>;
  actions: Array<{ day: number; completed: boolean; note: string | null }>;
}

interface Props {
  isLoggedIn: boolean;
}

/**
 * Loading skeleton that matches the rough shape of the active view, so
 * navigating between days/circles doesn't flash the home/list view while
 * the per-verse data is fetched.
 */
function ViewSkeleton() {
  return (
    <PageContent>
      <div className="max-w-5xl mx-auto animate-pulse">
        <div className="h-8 w-32 bg-border/50 rounded mb-6" />
        <div className="h-20 bg-border/30 rounded-xl mb-6" />
        <div className="h-48 bg-border/30 rounded-2xl mb-8" />
        <div className="h-32 bg-border/30 rounded-2xl mb-8" />
        <div className="h-40 bg-border/30 rounded-2xl" />
      </div>
    </PageContent>
  );
}

export default function TadabburPage({ isLoggedIn }: Props) {
  const [circles, setCircles] = useState<TadabburCircle[]>([]);
  const [selectedCircle, setSelectedCircle] = useState<TadabburCircle | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  // useSearchParams() makes URL→state reactive. Clicking the "Tadabbur" nav
  // link from a deep-link URL (e.g. /tadabbur?circle=…&day=…) navigates to
  // /tadabbur with no params; this effect picks that up and resets the view.
  const searchParams = useSearchParams();
  const urlCircleId = searchParams.get("circle");
  const urlDayParam = searchParams.get("day");

  const { verse, loading: verseLoading } = useVerseData(selectedCircle?.verseKey || "");

  useEffect(() => {
    loadTadabburData();
  }, [isLoggedIn]);

  // Sync component state with URL search params. Reacts to Next.js navigation
  // (Link clicks, browser back/forward) instead of only firing when our own
  // setState triggers a re-render.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;

      // Both empty: top-level /tadabbur — clear any deep-link selection.
      if (!urlCircleId && !urlDayParam) {
        if (selectedCircle !== null || selectedDay !== null) {
          setSelectedCircle(null);
          setSelectedDay(null);
          setIsReadOnly(false);
        }
        return;
      }

      // Wait until we've loaded the circles before resolving the deep link.
      if (!urlCircleId || circles.length === 0) return;

      const circle = circles.find((c) => c.id === urlCircleId);
      if (!circle) return;

      if (urlDayParam) {
        const day = parseInt(urlDayParam, 10);
        if (!Number.isFinite(day) || day < 1 || day > 15) return;
        if (selectedCircle?.id !== urlCircleId || selectedDay !== day) {
          setSelectedCircle(circle);
          setSelectedDay(day);
          setIsReadOnly(false);
        }
      } else if (selectedCircle?.id !== urlCircleId || selectedDay !== null) {
        setSelectedCircle(circle);
        setSelectedDay(null);
        setIsReadOnly(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [circles, urlCircleId, urlDayParam, selectedCircle, selectedDay]);

  async function loadTadabburData() {
    try {
      const res = await fetch("/api/tadabbur");
      const data = await res.json();
      setCircles(data.circles || []);
    } catch (error) {
      console.error("Failed to load tadabbur data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function joinCircle(circleId: string) {
    // Redirect to sign-in if not authenticated
    if (!isLoggedIn) {
      window.location.href = "/api/auth/start";
      return;
    }

    try {
      // Get timer preference from localStorage (set by the join buttons)
      const timerPref = localStorage.getItem('tadabbur-timer-preference');
      const timerEnabled = timerPref === null ? true : timerPref === 'true';
      
      await fetch("/api/tadabbur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          circleId,
          timerEnabled 
        }),
      });
      
      // Clear the preference after using it
      localStorage.removeItem('tadabbur-timer-preference');
      
      await loadTadabburData();
    } catch (error) {
      console.error("Failed to join circle:", error);
    }
  }

  function handleViewCircle(circle: TadabburCircle) {
    // Update URL to reflect circle view
    window.history.pushState({}, '', `/tadabbur?circle=${circle.id}`);
    setSelectedCircle(circle);
    setSelectedDay(null);
    setIsReadOnly(false);
  }

  function handleViewDay(circle: TadabburCircle, day: number) {
    // Update URL to reflect day view
    window.history.pushState({}, '', `/tadabbur?circle=${circle.id}&day=${day}`);
    setSelectedCircle(circle);
    setSelectedDay(day);
    setIsReadOnly(true);
  }

  async function handleToggleTimer(progressId: string) {
    try {
      await fetch("/api/tadabbur/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressId,
          action: "toggle_timer",
        }),
      });
      await loadTadabburData();
    } catch (error) {
      console.error("Failed to toggle timer:", error);
    }
  }

  if (loading) {
    return (
      <PageContent>
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      </PageContent>
    );
  }

  // While the user has selected a circle/day but the per-verse data is still
  // loading, show a structural skeleton instead of falling through to the
  // "all circles" home list. The previous behaviour briefly flashed the home
  // page during navigation.
  if (selectedCircle && (verseLoading || !verse)) {
    return <ViewSkeleton />;
  }

  // Show day view
  if (selectedDay !== null && selectedCircle && verse) {
    return (
      <TadabburDayCard
        day={selectedDay}
        verseKey={selectedCircle.verseKey}
        circleId={selectedCircle.id}
        verse={verse}
        progress={selectedCircle.userProgress}
        onBack={async () => {
          // Update URL to circle view
          window.history.pushState({}, '', `/tadabbur?circle=${selectedCircle.id}`);
          // Reload data to get updated progress
          await loadTadabburData();
          setSelectedDay(null);
          setIsReadOnly(false);
        }}
        onComplete={async () => {
          // Reload data to get updated progress
          await loadTadabburData();
          // Don't navigate away - let the component show the next day prompt
        }}
        isReadOnly={isReadOnly}
      />
    );
  }

  // Show circle detail view
  if (selectedCircle && verse) {
    const progress = selectedCircle.userProgress;
    const currentDay = progress?.currentDay ?? 1;
    const completedDays = progress?.completedDays ?? [];
    const todayAngle = DAILY_ANGLES[currentDay - 1];

    return (
      <PageContent>
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => {
              // Clear URL params to go back to home
              window.history.pushState({}, '', '/tadabbur');
              setSelectedCircle(null);
            }}
            className="flex items-center gap-2 text-[14px] text-ink-secondary hover:text-accent transition-colors mb-6"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            All Circles
          </button>

          {/* Participant Stats */}
          <div className="bg-accent-subtle border border-accent/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-medium text-ink">
                  {selectedCircle.participantCount} {selectedCircle.participantCount === 1 ? "reader" : "readers"}
                </div>
                <div className="text-[11px] text-ink-tertiary">
                  Reflecting together
                </div>
              </div>
            </div>
          </div>

          {/* Verse Display */}
          <div className="bg-surface border border-border rounded-2xl p-8 mb-8 text-center shadow-sm">
            <div className="text-[11px] uppercase tracking-wider text-ink-tertiary font-medium mb-4">
              The Verse of the Month
            </div>
            <div className="font-amiri text-[36px] leading-relaxed text-warm mb-4 text-right" dir="rtl">
              {verse.arabic}
            </div>
            <div className="font-niyyah-display italic text-[15px] text-ink-secondary mb-2">
              {verse.transliteration}
            </div>
            <div className="text-[14px] text-ink mb-6 max-w-2xl mx-auto">
              {verse.translation}
            </div>
            <div className="text-[13px] text-ink-tertiary">
              {verse.surahName} {verse.verseNumber} · {selectedCircle.hijriMonth} {selectedCircle.hijriYear}
            </div>
          </div>

          {progress && (
            <>
              {/* Progress Constellation */}
              <div className="mb-8">
                <SectionTitle>Your Progress</SectionTitle>
                <ConstellationProgress
                  completedDays={completedDays}
                  currentDay={currentDay}
                  lastCompletedAt={progress.lastCompletedAt ? new Date(progress.lastCompletedAt) : null}
                  timerEnabled={progress.timerEnabled}
                  onDayClick={(day) => {
                    // Update URL to reflect day view
                    window.history.pushState({}, '', `/tadabbur?circle=${selectedCircle.id}&day=${day}`);
                    setSelectedDay(day);
                    setIsReadOnly(!completedDays.includes(day) && day !== currentDay);
                  }}
                />
                <div className="flex items-center justify-center gap-4 text-[13px] text-ink-tertiary mt-4">
                  <span>Day {currentDay} of 15 · {completedDays.length} days complete</span>
                  <span className="text-border">|</span>
                  <button
                    onClick={async () => {
                      try {
                        await fetch("/api/tadabbur/progress", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            progressId: progress.id,
                            action: "toggle_timer",
                          }),
                        });
                        await loadTadabburData();
                      } catch (error) {
                        console.error("Failed to toggle timer:", error);
                      }
                    }}
                    className="flex items-center gap-2 text-accent hover:text-accent-hover transition-colors"
                  >
                    <span className="text-[16px]">{progress.timerEnabled ? "⏱️" : "🚀"}</span>
                    <span>{progress.timerEnabled ? "15-Day Mode" : "Self-Paced"}</span>
                  </button>
                </div>
              </div>

              {/* Today's Angle */}
              {!progress.isComplete && (
                <div className="mb-8">
                  <SectionTitle>Today&apos;s Angle — Day {currentDay}</SectionTitle>
                  <button
                    onClick={() => {
                      // Update URL to reflect day view
                      window.history.pushState({}, '', `/tadabbur?circle=${selectedCircle.id}&day=${currentDay}`);
                      setSelectedDay(currentDay);
                    }}
                    className="w-full bg-surface border border-border rounded-2xl p-6 hover:border-accent hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-accent font-medium mb-2">
                          {todayAngle.tag}
                        </div>
                        <h3 className="text-[20px] font-semibold text-ink group-hover:text-accent transition-colors">
                          ★ {todayAngle.angleName}
                        </h3>
                      </div>
                      <div className="text-[12px] text-ink-tertiary">
                        {todayAngle.timeMinutes} min
                      </div>
                    </div>
                    <p className="text-[14px] text-ink-secondary mb-4">
                      {todayAngle.prompt}
                    </p>
                    <div className="flex items-center text-accent text-[14px] font-medium">
                      Open today&apos;s experience
                      <svg className="ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                  </button>
                </div>
              )}

              {/* Community Circle */}
              <div className="mb-8">
                <SectionTitle>Community This Month</SectionTitle>
                <CommunityCircle circleId={selectedCircle.id} />
              </div>
            </>
          )}

          {!progress && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto mb-6">
                <p className="text-[14px] text-ink-secondary mb-4">
                  Choose your journey style:
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => {
                      localStorage.setItem('tadabbur-timer-preference', 'true');
                      joinCircle(selectedCircle.id);
                    }}
                    className="bg-surface border-2 border-accent hover:bg-accent/5 p-4 rounded-xl text-left transition-all group"
                  >
                    <div className="text-[20px] mb-2">⏱️</div>
                    <div className="text-[14px] font-medium text-ink mb-1">15-Day Mode</div>
                    <div className="text-[12px] text-ink-tertiary">
                      One day unlocks every 24 hours
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem('tadabbur-timer-preference', 'false');
                      joinCircle(selectedCircle.id);
                    }}
                    className="bg-surface border-2 border-border hover:border-accent hover:bg-accent/5 p-4 rounded-xl text-left transition-all group"
                  >
                    <div className="text-[20px] mb-2">🚀</div>
                    <div className="text-[14px] font-medium text-ink mb-1">Self-Paced</div>
                    <div className="text-[12px] text-ink-tertiary">
                      Complete at your own speed
                    </div>
                  </button>
                </div>
              </div>
              {!isLoggedIn && (
                <p className="text-[13px] text-ink-tertiary mt-4">
                  You need to sign in to join this circle and track your progress
                </p>
              )}
            </div>
          )}
        </div>
      </PageContent>
    );
  }

  // Show all circles list
  return (
    <PageContent>
      <div className="max-w-6xl mx-auto">
        <PageHero
          title="The Tadabbur Circle"
          subtitle="15 Days. One Verse. Infinite Depth."
        />

        {!isLoggedIn && (
          <div className="mb-8">
            <SignInBanner message="Sign in to join The Tadabbur Circle and begin your 15-day journey of deep Quranic reflection." />
          </div>
        )}

        {circles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[14px] text-ink-secondary">
              No active circles at the moment. Check back soon!
            </p>
          </div>
        ) : (
          <>
            {/* My Circles */}
            {circles.some(c => c.userProgress) && (
              <div className="mb-12">
                <SectionTitle>My Circles</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {circles
                    .filter(c => c.userProgress)
                    .map(circle => (
                      <TadabburCircleCard
                        key={circle.id}
                        circle={circle}
                        onJoin={joinCircle}
                        onView={handleViewCircle}
                        onViewDay={handleViewDay}
                        isLoggedIn={isLoggedIn}
                        onToggleTimer={handleToggleTimer}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Available Circles */}
            {circles.some(c => !c.userProgress) && (
              <div className="mb-12">
                <SectionTitle>Available Circles</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {circles
                    .filter(c => !c.userProgress)
                    .map(circle => (
                      <TadabburCircleCard
                        key={circle.id}
                        circle={circle}
                        onJoin={joinCircle}
                        onView={handleViewCircle}
                        onViewDay={handleViewDay}
                        isLoggedIn={isLoggedIn}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageContent>
  );
}
