"use client";

import { useEffect, useState } from "react";
import { progressPct, type Journey } from "@/lib/niyyah";
import { Lantern } from "./icons";
import { GoldCorners, OrnamentDivider } from "./Ornament";

interface Props {
  journey: Journey;
}

interface TodayStats {
  versesRead: number;
  minutesRead: number;
  pagesRead: number;
}

export default function ProgressVessel({ journey }: Props) {
  const pct = progressPct(journey);
  
  // Get real-time stats from today's reading
  const [todayStats, setTodayStats] = useState<TodayStats>({ versesRead: 0, minutesRead: 0, pagesRead: 0 });
  const [totalVerses, setTotalVerses] = useState(0);

  useEffect(() => {
    async function loadStats() {
      try {
        // Get today's reading stats (niyyah source only)
        const todayRes = await fetch('/api/reading/today?source=niyyah');
        if (todayRes.ok) {
          const data = await todayRes.json();
          setTodayStats({
            versesRead: data.versesRead || 0,
            minutesRead: data.minutesRead || 0,
            pagesRead: data.pagesRead || 0,
          });
        }
      } catch (error) {
        console.error('Failed to load reading stats:', error);
      }
    }

    loadStats();
    
    // Refresh stats when user returns to page
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadStats();
      }
    };
    
    // Refresh stats when a verse is completed
    const handleVerseCompleted = () => {
      loadStats();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('verse-completed', handleVerseCompleted);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('verse-completed', handleVerseCompleted);
    };
  }, [journey.completedDays.length]);

  // Compute total verses: journey days + today's uncounted verses
  useEffect(() => {
    const journeyVerses = journey.completedDays.reduce((sum, d) => sum + d.versesRead, 0);
    const today = new Date().toISOString().slice(0, 10);
    const todayAlreadyCounted = journey.completedDays.some(d => d.date.startsWith(today));
    setTotalVerses(journeyVerses + (todayAlreadyCounted ? 0 : todayStats.versesRead));
  }, [journey.completedDays, todayStats.versesRead]);

  return (
    <article className="relative grid grid-cols-[minmax(7rem,9.5rem)_1fr] gap-6 items-center p-6 sm:p-7 rounded-3xl border border-ny-gold/30 bg-ny-cream parchment-bg overflow-hidden shadow-[0_18px_40px_rgba(28,58,47,0.10)]">
      <GoldCorners inset="0.6rem" />

      <div className="relative w-full" style={{ aspectRatio: "0.7 / 1" }}>
        <Lantern filledPct={pct} />
      </div>

      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-gold m-0">
          Lantern of your reading
        </p>
        <p className="font-[var(--font-niyyah-display)] text-[2.6rem] sm:text-[2.9rem] leading-none font-semibold text-ny-ink m-0 mt-2 mb-3 tracking-tight">
          {pct}
          <span className="text-[1.4rem] text-ny-gold ml-1">%</span>
        </p>

        <OrnamentDivider lineWidth="sm" glyph="diamond" className="mb-3 max-w-[12rem]" />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 m-0">
          <Stat
            label="Days completed"
            value={`${journey.completedDays.length} / ${journey.goalValue}`}
          />
          <Stat label="Verses read" value={totalVerses.toLocaleString()} />
          <Stat label="Daily target" value={`${journey.dailyTarget || 5} verses`} />
          <Stat
            label="Streak"
            value={journey.currentStreak.toString()}
            sub={
              journey.currentStreak > 0
                ? "✦ keep it going!"
                : "complete today's target to start"
            }
          />
        </dl>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-[9.5px] uppercase tracking-[0.16em] text-ny-sage font-bold">
        {label}
      </dt>
      <dd className="m-0 mt-0.5">
        <span className="font-[var(--font-niyyah-display)] text-[1.4rem] font-semibold text-ny-ink">
          {value}
        </span>
        {sub && (
          <span className="block text-[11px] italic text-ny-gold mt-0.5">{sub}</span>
        )}
      </dd>
    </div>
  );
}
