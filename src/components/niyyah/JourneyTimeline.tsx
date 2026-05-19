"use client";

import type { Journey } from "@/lib/niyyah";
import { GoldCorners } from "./Ornament";

interface Props {
  journey: Journey;
}

export default function JourneyTimeline({ journey }: Props) {
  const total = journey.goalValue;
  const completed = journey.completedDays;

  return (
    <section className="relative my-4 p-5 sm:p-6 rounded-3xl border border-ny-gold/30 bg-ny-cream parchment-bg overflow-hidden shadow-[0_14px_30px_rgba(28,58,47,0.08)]">
      <GoldCorners inset="0.55rem" />

      <header className="relative flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-gold m-0">
            The path so far
          </p>
          <p className="font-[var(--font-niyyah-display)] italic text-ny-sage text-[14px] m-0 mt-0.5">
            Each lit dot is a day of remembrance.
          </p>
        </div>
        <p className="font-mono text-[12px] tracking-[0.12em] text-ny-charcoal/75 m-0">
          <strong className="text-ny-ink text-[14px]">{completed.length}</strong>
          <span className="mx-1 text-ny-gold/60">/</span>
          <span>{total} days lit</span>
        </p>
      </header>

      <div
        role="list"
        className="relative flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ny-gold/25"
        style={{ scrollSnapType: "x proximity" }}
      >
        {Array.from({ length: total }).map((_, idx) => {
          const dayNum = idx + 1;
          const day = completed[idx];
          const isLit = Boolean(day);
          const isToday = idx === completed.length;
          const isMercy = day?.isMercy;
          return (
            <div
              key={dayNum}
              role="listitem"
              style={{ scrollSnapAlign: "start" }}
              className="flex flex-col items-center gap-1.5 min-w-[3.4rem] py-1.5 px-1 rounded-lg shrink-0"
              title={
                isLit
                  ? `Day ${dayNum} · ${day.surahRange}`
                  : isToday
                    ? `Day ${dayNum} · today`
                    : `Day ${dayNum}`
              }
            >
              <span
                aria-hidden
                className={[
                  "w-3.5 h-3.5 rounded-full border transition-all duration-300",
                  isLit
                    ? "bg-[radial-gradient(circle,#FFF1B7_0%,var(--color-ny-gold)_70%)] border-ny-gold shadow-[0_0_14px_rgba(184,146,74,0.65)]"
                    : isToday
                      ? "bg-ny-cream-warm border-ny-gold ring-[3px] ring-ny-gold/25 scale-110"
                      : "bg-ny-charcoal/8 border-ny-charcoal/15",
                ].join(" ")}
              />
              <span className="font-mono text-[10px] text-ny-charcoal/70">{dayNum}</span>
              {isLit && (
                <span className="text-[10px] text-ny-sage text-center max-w-[4.5rem] truncate italic">
                  {day.surahRange}
                </span>
              )}
              {isMercy && <span className="text-[10px] text-ny-gold">✦</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
