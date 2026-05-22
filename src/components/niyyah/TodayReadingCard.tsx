"use client";

import { getTodayPortion, todayKey, type Journey } from "@/lib/niyyah";
import { ArrowRight } from "./icons";
import { GoldCorners, OrnamentDivider } from "./Ornament";

interface Props {
  journey: Journey;
  onBegin: () => void;
  onMarkRead: () => void;
}

export default function TodayReadingCard({ journey, onBegin, onMarkRead }: Props) {
  const portion = getTodayPortion(journey);
  const alreadyRead = journey.completedDays.some((d) => d.date === todayKey());
  const dailyTarget = journey.dailyTarget || 5;

  return (
    <article className="relative flex flex-col gap-2 p-6 sm:p-7 rounded-3xl border border-ny-gold/35 bg-gradient-to-b from-ny-cream-warm/40 to-ny-cream parchment-bg overflow-hidden shadow-[0_18px_40px_rgba(28,58,47,0.10)]">
      <GoldCorners inset="0.6rem" />

      {/* Niyyah reminder */}
      <p className="text-[13px] text-ny-sage italic pb-3 mb-1 m-0 border-b border-dashed border-ny-gold/30">
        Remember your intention —{" "}
        <span className="text-ny-ink font-semibold not-italic">
          reading for {journey.recipientName}
        </span>
        .
      </p>

      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-gold mt-1 m-0">
        Today&apos;s target — {dailyTarget} verses
      </p>
      <h3 className="font-[var(--font-niyyah-display)] text-[1.7rem] sm:text-[2rem] font-semibold text-ny-ink leading-tight m-0">
        {portion.label}
      </h3>
      <p className="text-[14px] text-ny-charcoal/75 m-0">
        Juz {portion.juzNumber}
        <span className="mx-2 text-ny-gold/60">•</span>
        {portion.versesCount.toLocaleString()} verses
        <span className="mx-2 text-ny-gold/60">•</span>~{portion.estMinutes} minutes
      </p>

      {/* Streak warning */}
      {!alreadyRead && journey.currentStreak > 0 && (
        <p className="text-[12px] text-ny-ember font-medium m-0 mt-1">
          ⚡ Complete {dailyTarget} verses today to keep your {journey.currentStreak}-day streak!
        </p>
      )}

      <OrnamentDivider lineWidth="sm" glyph="diamond" className="my-2" />

      <p
        className="font-[var(--font-decorative)] text-[1.65rem] sm:text-[1.85rem] text-ny-gold m-0 text-center leading-snug tracking-wide"
        dir="rtl"
        lang="ar"
      >
        بِسْمِ اللَّهِ
      </p>

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          onClick={onBegin}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-ny-forest bg-gradient-to-br from-ny-gold-soft via-ny-gold-bright to-ny-gold border border-ny-gold shadow-[0_10px_22px_rgba(184,146,74,0.32),inset_0_1px_0_rgba(255,255,255,0.45)] hover:shadow-[0_14px_28px_rgba(184,146,74,0.42),inset_0_1px_0_rgba(255,255,255,0.5)] transition-shadow"
        >
          Begin today&apos;s reading <ArrowRight />
        </button>
        <button
          type="button"
          onClick={onMarkRead}
          disabled={alreadyRead}
          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-ny-ink bg-transparent border border-ny-charcoal/20 hover:bg-ny-charcoal/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={alreadyRead ? "Already marked for today" : "Mark today as completed"}
        >
          {alreadyRead ? "Marked for today ✓" : "Mark today complete"}
        </button>
      </div>
    </article>
  );
}
