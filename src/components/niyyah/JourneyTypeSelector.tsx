"use client";

import React from "react";
import { JOURNEY_TYPES, type JourneyType } from "@/lib/niyyah";
import { JourneyTypeIcon } from "./icons";
import { GoldCorners } from "./Ornament";
import Link from "next/link";
import NiyyahSetupModal from "./NiyyahSetupModal";

interface Props {
  onSelect: (type: JourneyType) => void;
}

const TONE: Record<
  JourneyType,
  {
    glyphBg: string;
    accent: string;
    hoverBorder: string;
    ribbon: string;
  }
> = {
  living: {
    glyphBg: "bg-gradient-to-br from-ny-gold-soft to-ny-gold/40 text-ny-forest",
    accent: "text-ny-gold",
    hoverBorder: "hover:border-ny-gold/70",
    ribbon: "from-ny-gold/0 via-ny-gold/40 to-ny-gold/0",
  },
  departed: {
    glyphBg: "bg-gradient-to-br from-ny-cream-warm to-ny-ember/15 text-ny-ember",
    accent: "text-ny-ember",
    hoverBorder: "hover:border-ny-ember/55",
    ribbon: "from-ny-ember/0 via-ny-ember/30 to-ny-ember/0",
  },
  personal: {
    glyphBg: "bg-gradient-to-br from-ny-cream to-ny-sage/15 text-ny-sage",
    accent: "text-ny-sage",
    hoverBorder: "hover:border-ny-sage/55",
    ribbon: "from-ny-sage/0 via-ny-sage/30 to-ny-sage/0",
  },
};

export default function JourneyTypeSelector({ onSelect }: Props) {
  const [showSetupModal, setShowSetupModal] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<JourneyType>("living");

  const handleCardClick = () => {
    // Default to "living" type and open setup modal directly
    setSelectedType("living");
    setShowSetupModal(true);
  };

  const handleTypeSelect = (type: JourneyType) => {
    setSelectedType(type);
    setShowSetupModal(true);
  };

  return (
    <>
      <div className="grid gap-5 md:grid-cols-3 max-w-6xl mx-auto">
        {/* Combined Niyyah System Card - Opens Setup Modal Directly */}
        <button
          type="button"
          onClick={handleCardClick}
          style={{ animationDelay: "100ms" }}
          className="group relative flex flex-col gap-4 animate-ny-fade-up text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ny-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ny-cream"
        >
          {/* Outer gold-ring + parchment-shadow frame */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-ny-gold/55 via-ny-gold-soft/50 to-ny-gold/30 shadow-[0_18px_40px_rgba(28,58,47,0.10)] transition-shadow duration-300 group-hover:shadow-[0_28px_56px_rgba(28,58,47,0.18)]"
          />
          <span
            aria-hidden
            className="absolute inset-[2px] rounded-[22px] bg-ny-cream parchment-bg border border-ny-charcoal/5 transition-all duration-300 group-hover:-translate-y-0.5 hover:border-ny-gold/70"
          />

          {/* Top ribbon */}
          <span
            aria-hidden
            className="absolute top-[2px] left-6 right-6 h-px bg-gradient-to-r from-ny-gold/0 via-ny-gold/40 to-ny-gold/0"
          />

          {/* Inner content */}
          <div className="relative px-7 pt-7 pb-7 flex flex-col gap-3">
            <GoldCorners inset="0.55rem" />

            <span
              aria-hidden
              className="absolute top-3 right-3 text-ny-gold/70 text-[15px]"
            >
              ✦
            </span>

            {/* Glyph */}
            <span
              aria-hidden
              className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-ny-gold/30 bg-gradient-to-br from-ny-gold-soft to-ny-gold/40 text-ny-forest shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(184,146,74,0.18)]"
            >
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </span>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-gold">
                Gift Your Reading
              </span>
              <span className="font-[var(--font-niyyah-display)] font-semibold text-[1.65rem] leading-tight text-ny-ink tracking-tight">
                Niyyah System
              </span>
            </div>

            <p className="text-[0.95rem] leading-[1.65] text-ny-charcoal/85">
              Dedicate your Quran reading to loved ones — living or departed — or mark a personal milestone. A gift of light shaped from your heart.
            </p>

            {/* Verse footer */}
            <div className="mt-auto pt-4 border-t border-dashed border-ny-gold/30">
              <p className="font-[var(--font-niyyah-display)] italic text-[0.92rem] leading-snug text-ny-sage m-0">
                &ldquo;So remember Me; I will remember you.&rdquo;
              </p>
              <p className="mt-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-ny-gold m-0">
                Qur&apos;an 2:152
              </p>
            </div>

            {/* CTA button */}
            <div className="mt-5">
              <span
                className={[
                  "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
                  "text-[13px] font-bold uppercase tracking-[0.08em]",
                  "bg-gradient-to-r from-ny-forest to-ny-forest/90 text-white",
                  "shadow-[0_4px_14px_rgba(28,58,47,0.25)]",
                  "transition-all duration-300",
                  "group-hover:shadow-[0_6px_20px_rgba(28,58,47,0.35)] group-hover:-translate-y-0.5",
                ].join(" ")}
              >
                Begin a journey
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-x-0.5">
                  <path
                    d="M4.5 12h15m0 0-6.75-6.75M19.5 12l-6.75 6.75"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        </button>

      {/* Tadabbur Circle Card */}
      <Link
        href="/tadabbur"
        style={{ animationDelay: "190ms" }}
        className={[
          "group relative flex flex-col gap-4 text-left cursor-pointer",
          "animate-ny-fade-up",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ny-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ny-cream",
        ].join(" ")}
      >
        {/* Outer gold-ring + parchment-shadow frame */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-3xl bg-gradient-to-br from-ny-gold/55 via-ny-gold-soft/50 to-ny-gold/30 shadow-[0_18px_40px_rgba(28,58,47,0.10)] transition-shadow duration-300 group-hover:shadow-[0_28px_56px_rgba(28,58,47,0.18)]"
        />
        <span
          aria-hidden
          className="absolute inset-[2px] rounded-[22px] bg-ny-cream parchment-bg border border-ny-charcoal/5 transition-all duration-300 group-hover:-translate-y-0.5 hover:border-ny-forest/55"
        />

        {/* Top ribbon */}
        <span
          aria-hidden
          className="absolute top-[2px] left-6 right-6 h-px bg-gradient-to-r from-ny-forest/0 via-ny-forest/30 to-ny-forest/0"
        />

        {/* Inner content */}
        <div className="relative px-7 pt-7 pb-7 flex flex-col gap-3 ">
          <GoldCorners inset="0.55rem" />

          <span
            aria-hidden
            className="absolute top-3 right-3 text-ny-gold/70 text-[15px]"
          >
            ✦
          </span>

          {/* Glyph */}
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-ny-gold/30 bg-gradient-to-br from-ny-forest/10 to-ny-forest/5 text-ny-forest shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(28,58,47,0.18)]"
          >
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </span>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-forest">
              Deep Contemplation
            </span>
            <span className="font-[var(--font-niyyah-display)] font-semibold text-[1.65rem] leading-tight text-ny-ink tracking-tight">
              Tadabbur Circle
            </span>
          </div>

          <p className="text-[0.95rem] leading-[1.65] text-ny-charcoal/85">
            15-day journey exploring a single verse through recitation, tafsir, history, and personal reflection.
          </p>

          {/* Verse footer */}
          <div className="mt-auto pt-4 border-t border-dashed border-ny-gold/30">
            <p className="font-[var(--font-niyyah-display)] italic text-[0.92rem] leading-snug text-ny-sage m-0">
              &ldquo;Do they not then reflect on the Qur&apos;an?&rdquo;
            </p>
            <p className="mt-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-ny-gold m-0">
              Qur&apos;an 4:82
            </p>
          </div>

          {/* Always-visible CTA button */}
          <div className="mt-5">
            <span
              className={[
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
                "text-[13px] font-bold uppercase tracking-[0.08em]",
                "bg-gradient-to-r from-ny-forest to-ny-forest/90 text-white",
                "shadow-[0_4px_14px_rgba(28,58,47,0.25)]",
                "transition-all duration-300",
                "group-hover:shadow-[0_6px_20px_rgba(28,58,47,0.35)] group-hover:-translate-y-0.5",
              ].join(" ")}
            >
              Begin Tadabbur
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-x-0.5">
                <path
                  d="M4.5 12h15m0 0-6.75-6.75M19.5 12l-6.75 6.75"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>
        </div>
      </Link>

      {/* Reading Goals Card */}
      <Link
        href="/goals"
        style={{ animationDelay: "280ms" }}
        className={[
          "group relative flex flex-col gap-4 text-left cursor-pointer",
          "animate-ny-fade-up",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ny-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ny-cream",
        ].join(" ")}
      >
        {/* Outer gold-ring + parchment-shadow frame */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-3xl bg-gradient-to-br from-ny-gold/55 via-ny-gold-soft/50 to-ny-gold/30 shadow-[0_18px_40px_rgba(28,58,47,0.10)] transition-shadow duration-300 group-hover:shadow-[0_28px_56px_rgba(28,58,47,0.18)]"
        />
        <span
          aria-hidden
          className="absolute inset-[2px] rounded-[22px] bg-ny-cream parchment-bg border border-ny-charcoal/5 transition-all duration-300 group-hover:-translate-y-0.5 hover:border-ny-ink/55"
        />

        {/* Top ribbon */}
        <span
          aria-hidden
          className="absolute top-[2px] left-6 right-6 h-px bg-gradient-to-r from-ny-ink/0 via-ny-ink/30 to-ny-ink/0"
        />

        {/* Inner content */}
        <div className="relative px-7 pt-7 pb-7 flex flex-col gap-3 ">
          <GoldCorners inset="0.55rem" />

          <span
            aria-hidden
            className="absolute top-3 right-3 text-ny-gold/70 text-[15px]"
          >
            ✦
          </span>

          {/* Glyph */}
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-ny-gold/30 bg-gradient-to-br from-ny-ink/10 to-ny-ink/5 text-ny-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(28,58,47,0.18)]"
          >
            <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </span>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-ink">
              Build Consistency
            </span>
            <span className="font-[var(--font-niyyah-display)] font-semibold text-[1.65rem] leading-tight text-ny-ink tracking-tight">
              Reading Goals
            </span>
          </div>

          <p className="text-[0.95rem] leading-[1.65] text-ny-charcoal/85">
            Set daily or weekly reading targets. Track your progress with pages, verses, or time-based goals.
          </p>

          {/* Verse footer */}
          <div className="mt-auto pt-4 border-t border-dashed border-ny-gold/30">
            <p className="font-[var(--font-niyyah-display)] italic text-[0.92rem] leading-snug text-ny-sage m-0">
              &ldquo;And recite the Qur&apos;an with measured recitation.&rdquo;
            </p>
            <p className="mt-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-ny-gold m-0">
              Qur&apos;an 73:4
            </p>
          </div>

          {/* Always-visible CTA button */}
          <div className="mt-5">
            <span
              className={[
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl",
                "text-[13px] font-bold uppercase tracking-[0.08em]",
                "bg-gradient-to-r from-ny-forest to-ny-forest/90 text-white",
                "shadow-[0_4px_14px_rgba(28,58,47,0.25)]",
                "transition-all duration-300",
                "group-hover:shadow-[0_6px_20px_rgba(28,58,47,0.35)] group-hover:-translate-y-0.5",
              ].join(" ")}
            >
              Set a goal
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-x-0.5">
                <path
                  d="M4.5 12h15m0 0-6.75-6.75M19.5 12l-6.75 6.75"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </div>

    {/* Niyyah Setup Modal - Opens directly with journey type selection inside */}
    {showSetupModal && (
      <NiyyahSetupModal
        open={showSetupModal}
        initialType={selectedType}
        onClose={() => setShowSetupModal(false)}
        onSeal={(journey) => {
          setShowSetupModal(false);
          onSelect(journey.type);
        }}
      />
    )}
  </>
  );
}
