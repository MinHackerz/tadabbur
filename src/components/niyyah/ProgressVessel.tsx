"use client";

import { progressPct, totalVersesRead, type Journey } from "@/lib/niyyah";
import { Lantern } from "./icons";
import { GoldCorners, OrnamentDivider } from "./Ornament";

interface Props {
  journey: Journey;
}

export default function ProgressVessel({ journey }: Props) {
  const pct = progressPct(journey);
  const verses = totalVersesRead(journey);
  const remaining = Math.max(0, journey.goalValue - journey.completedDays.length);

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
          <Stat label="Verses read" value={verses.toLocaleString()} />
          <Stat label="Days remaining" value={remaining.toString()} />
          <Stat
            label="Streak"
            value={journey.currentStreak.toString()}
            sub={
              !journey.mercyDayUsed
                ? "✦ mercy day available"
                : "mercy day used"
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
