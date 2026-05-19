"use client";

import { JOURNEY_TYPES, type Journey } from "@/lib/niyyah";
import { CandleFlame, FlowerBloom, JourneyTypeIcon } from "./icons";
import { OrnamentDivider } from "./Ornament";

interface Props {
  journey: Journey;
  daysCompleted: number;
}

export default function DedicationHero({ journey, daysCompleted }: Props) {
  const meta = JOURNEY_TYPES.find((t) => t.id === journey.type)!;
  const isDeparted = journey.type === "departed";

  return (
    <header className="relative max-w-6xl mx-auto rounded-3xl overflow-hidden mb-6 shadow-[0_24px_60px_rgba(11,28,23,0.22)]">
      {/* Outer gold ring */}
      <div className="absolute inset-0 bg-gradient-to-br from-ny-gold/45 via-ny-gold-soft/35 to-ny-gold/30" />
      <div
        className={[
          "relative m-[2px] rounded-[22px] overflow-hidden",
          isDeparted
            ? "bg-[radial-gradient(ellipse_at_top_right,rgba(255,196,90,0.18),transparent_55%),linear-gradient(140deg,#1a2b25_0%,#0a1410_100%)]"
            : "bg-[radial-gradient(ellipse_at_top_right,rgba(216,177,92,0.22),transparent_55%),linear-gradient(140deg,var(--color-ny-forest)_0%,var(--color-ny-forest-deep)_100%)]",
        ].join(" ")}
      >
        {/* Drifting mashrabiya pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[10%] mashrabiya-bg opacity-[0.08] animate-ny-drift text-ny-gold-soft"
        />

        {/* Top arch */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-ny-gold/55 to-transparent"
        />

        <div className="relative px-6 sm:px-12 py-9 sm:py-12 text-ny-gold-soft">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-ny-gold-soft/40 bg-ny-gold-soft/10 text-[10.5px] font-bold uppercase tracking-[0.18em] mb-5 backdrop-blur-sm">
            <JourneyTypeIcon type={journey.type} size={16} />
            <span>{meta.title}</span>
            <span className="opacity-50">·</span>
            <span>{journey.occasion}</span>
          </div>

          <h2 className="font-[var(--font-niyyah-display)] font-medium text-[2.1rem] sm:text-[3.2rem] leading-[1.05] tracking-tight m-0">
            <span className="italic font-normal text-ny-gold-soft/70">Reading for </span>
            <span className="text-ny-gold-pale">{journey.recipientName}</span>
          </h2>

          <p className="mt-3 font-mono text-[12px] tracking-[0.22em] uppercase text-ny-gold-soft/85 m-0">
            Day{" "}
            <strong className="text-ny-gold-pale tracking-normal text-[15px]">
              {daysCompleted}
            </strong>{" "}
            of{" "}
            <strong className="text-ny-gold-pale tracking-normal text-[15px]">
              {journey.goalValue}
            </strong>
          </p>

          {journey.personalDua && (
            <>
              <OrnamentDivider lineWidth="md" glyph="diamond" className="mt-5 mb-4 text-ny-gold-soft/70" />
              <p className="max-w-2xl font-[var(--font-niyyah-display)] italic text-[1.05rem] sm:text-[1.2rem] leading-relaxed text-ny-ivory/90 m-0">
                &ldquo;{journey.personalDua}&rdquo;
              </p>
            </>
          )}

          {/* Right-side decoration */}
          <span aria-hidden className="hidden md:block absolute top-8 right-8 text-ny-gold-soft">
            {isDeparted ? (
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-ny-gold-soft/30 bg-ny-gold-soft/10 backdrop-blur-sm">
                <span className="inline-block animate-ny-flicker drop-shadow-[0_0_14px_rgba(255,196,90,0.55)] text-[#FFD27A]">
                  <CandleFlame size={28} />
                </span>
              </span>
            ) : journey.type === "living" ? (
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-ny-gold-soft/30 bg-ny-gold-soft/10 backdrop-blur-sm">
                <span className="inline-block animate-ny-bloom text-ny-gold-soft">
                  <FlowerBloom size={30} />
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-ny-gold-soft/30 bg-ny-gold-soft/10 backdrop-blur-sm text-2xl text-ny-gold-soft">
                ☾
              </span>
            )}
          </span>
        </div>
      </div>
    </header>
  );
}
