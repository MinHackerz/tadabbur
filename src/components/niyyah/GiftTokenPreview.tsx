"use client";

import {
  formatLongDate,
  progressPct,
  totalVersesRead,
  type Journey,
} from "@/lib/niyyah";
import { GoldCorners, OrnamentDivider } from "./Ornament";

interface Props {
  journey: Journey;
  onOpenFull: () => void;
}

export default function GiftTokenPreview({ journey, onOpenFull }: Props) {
  const pct = progressPct(journey);
  const verses = totalVersesRead(journey);

  return (
    <section className="relative my-5 p-5 sm:p-7 rounded-3xl border border-ny-gold/30 bg-gradient-to-b from-ny-cream-warm/40 to-ny-cream parchment-bg overflow-hidden shadow-[0_18px_40px_rgba(28,58,47,0.10)]">
      <GoldCorners inset="0.6rem" />

      <header className="relative flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-gold m-0">
            Your gift, in waiting
          </p>
          <h3 className="font-[var(--font-niyyah-display)] text-[1.45rem] font-semibold text-ny-ink mt-0.5 m-0">
            A token of light, taking shape
          </h3>
          <p className="text-[12px] text-ny-charcoal/65 italic mt-1 m-0">
            {pct}% complete — every ayah brings it closer to light.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenFull}
          className="px-4 py-2 rounded-full border border-ny-gold/40 bg-ny-cream-warm/60 text-[12px] font-semibold text-ny-ink hover:bg-ny-cream-warm hover:border-ny-gold transition-colors"
        >
          See full preview
        </button>
      </header>

      <article className="relative rounded-2xl border-2 border-ny-gold/55 bg-ny-ivory parchment-bg shadow-[inset_0_0_0_4px_rgba(184,146,74,0.14)] text-center overflow-hidden">
        <GoldCorners inset="0.5rem" />

        <div className="relative z-[1] px-6 py-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-sage m-0">
            A reading dedicated to
          </p>
          <p className="font-[var(--font-decorative)] text-[2.1rem] sm:text-[2.5rem] text-ny-ink mt-1 mb-1 leading-tight">
            {journey.recipientName}
          </p>
          <p className="font-[var(--font-niyyah-display)] italic text-ny-gold mb-4 tracking-wide text-[15px] m-0">
            — {journey.occasion} —
          </p>

          <OrnamentDivider lineWidth="sm" glyph="diamond" className="mb-3" />

          <p className="font-[var(--font-niyyah-display)] italic text-[1.05rem] leading-relaxed text-ny-charcoal/85 max-w-md mx-auto mb-4 m-0">
            &ldquo;{journey.personalDua}&rdquo;
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-[12px] text-ny-sage italic">
            <span>
              <strong className="text-ny-ink text-[14px]">{journey.completedDays.length}</strong>{" "}
              days
            </span>
            <span>
              <strong className="text-ny-ink text-[14px]">{verses.toLocaleString()}</strong>{" "}
              verses
            </span>
            <span>
              by{" "}
              <strong className="text-ny-ink text-[14px]">
                {formatLongDate(journey.targetDate)}
              </strong>
            </span>
          </div>
          <div className="mt-3 text-2xl text-ny-gold">✦</div>
        </div>
      </article>
    </section>
  );
}
