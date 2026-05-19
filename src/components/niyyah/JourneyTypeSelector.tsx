"use client";

import { JOURNEY_TYPES, type JourneyType } from "@/lib/niyyah";
import { JourneyTypeIcon } from "./icons";
import { GoldCorners } from "./Ornament";

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
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
      {JOURNEY_TYPES.map((t, i) => {
        const tone = TONE[t.id];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            style={{ animationDelay: `${100 + i * 90}ms` }}
            className={[
              "group relative flex flex-col gap-4 text-left",
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
              className={[
                "absolute inset-[2px] rounded-[22px] bg-ny-cream parchment-bg border border-ny-charcoal/5 transition-all duration-300 group-hover:-translate-y-0.5",
                tone.hoverBorder,
              ].join(" ")}
            />

            {/* Top ribbon */}
            <span
              aria-hidden
              className={`absolute top-[2px] left-6 right-6 h-px bg-gradient-to-r ${tone.ribbon}`}
            />

            {/* Inner content */}
            <div className="relative px-7 pt-7 pb-7 flex flex-col gap-3 min-h-[290px]">
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
                className={`inline-flex items-center justify-center w-14 h-14 rounded-full border border-ny-gold/30 ${tone.glyphBg} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(184,146,74,0.18)]`}
              >
                <JourneyTypeIcon type={t.id} size={28} />
              </span>

              <div className="flex flex-col gap-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-[0.22em] ${tone.accent}`}
                >
                  {t.subtitle}
                </span>
                <span className="font-[var(--font-niyyah-display)] font-semibold text-[1.65rem] leading-tight text-ny-ink tracking-tight">
                  {t.title}
                </span>
              </div>

              <p className="text-[0.95rem] leading-[1.65] text-ny-charcoal/85">
                {t.longDescription}
              </p>

              {/* Verse footer */}
              <div className="mt-auto pt-4 border-t border-dashed border-ny-gold/30">
                <p className="font-[var(--font-niyyah-display)] italic text-[0.92rem] leading-snug text-ny-sage m-0">
                  &ldquo;{t.verse}&rdquo;
                </p>
                <p className="mt-1.5 font-mono text-[10px] tracking-[0.16em] uppercase text-ny-gold m-0">
                  {t.verseRef}
                </p>
              </div>

              {/* Hover-revealed CTA */}
              <span
                aria-hidden
                className="absolute bottom-3 right-4 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.16em] text-ny-gold opacity-0 translate-x-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0"
              >
                Begin
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4.5 12h15m0 0-6.75-6.75M19.5 12l-6.75 6.75"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
