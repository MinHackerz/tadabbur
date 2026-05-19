"use client";

import { useEffect, useState } from "react";
import { JOURNEY_TYPES, type AmanahWallItem } from "@/lib/niyyah";
import { JourneyTypeIcon } from "./icons";
import { GoldCorners, OrnamentDivider } from "./Ornament";

const messageFor = (item: AmanahWallItem): string => {
  if (item.isComplete) {
    if (item.type === "departed")
      return `Someone in ${item.region} completed a memorial Khatm today.`;
    if (item.type === "personal")
      return `A reader in ${item.region} completed their personal milestone today.`;
    return `Someone in ${item.region} completed a gift today.`;
  }
  if (item.type === "living") {
    return `Someone is reading for a loved one — ${item.occasion ?? "with love"} — Day ${item.day} of ${item.total}.`;
  }
  if (item.type === "departed") {
    return `Someone is reading in memory — Day ${item.day} of ${item.total}.`;
  }
  return `A reader in ${item.region} is on a personal milestone — Day ${item.day} of ${item.total}.`;
};

export default function AmanahWall() {
  const [index, setIndex] = useState(0);
  const [wallData, setWallData] = useState<{
    items: AmanahWallItem[];
    liveCount: number;
    completedToday: number;
  }>({
    items: [],
    liveCount: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch wall data from API
  useEffect(() => {
    async function fetchWallData() {
      try {
        const response = await fetch('/api/niyyah/wall');
        if (response.ok) {
          const data = await response.json();
          setWallData(data);
        }
      } catch (error) {
        console.error('Failed to fetch amanah wall:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchWallData();
    
    // Refresh every 5 minutes
    const refreshInterval = setInterval(fetchWallData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // Rotate through items
  useEffect(() => {
    if (wallData.items.length === 0) return;
    
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % wallData.items.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [wallData.items.length]);

  if (loading) {
    return (
      <section
        aria-label="Amanah Wall"
        className="relative p-5 sm:p-7 rounded-3xl border border-ny-gold/30 bg-ny-cream parchment-bg overflow-hidden shadow-[0_18px_40px_rgba(28,58,47,0.10)] animate-pulse"
      >
        <div className="h-48" />
      </section>
    );
  }

  if (wallData.items.length === 0) {
    return (
      <section
        aria-label="Amanah Wall"
        className="relative p-5 sm:p-7 rounded-3xl border border-ny-gold/30 bg-ny-cream parchment-bg overflow-hidden shadow-[0_18px_40px_rgba(28,58,47,0.10)]"
      >
        <GoldCorners inset="0.6rem" />
        <header className="text-center py-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-gold m-0">
            The Amanah Wall
          </p>
          <h3 className="font-[var(--font-niyyah-display)] text-[1.4rem] sm:text-[1.6rem] font-semibold text-ny-ink mt-0.5 mb-3 leading-tight">
            Silent companions on the path
          </h3>
          <p className="text-ny-sage text-sm italic">
            Be the first to begin a journey and inspire others.
          </p>
        </header>
      </section>
    );
  }

  return (
    <section
      aria-label="Amanah Wall"
      className="relative p-5 sm:p-7 rounded-3xl border border-ny-gold/30 bg-ny-cream parchment-bg overflow-hidden shadow-[0_18px_40px_rgba(28,58,47,0.10)]"
    >
      <GoldCorners inset="0.6rem" />

      <header className="relative flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 sm:gap-4 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-gold m-0">
            The Amanah Wall
          </p>
          <h3 className="font-[var(--font-niyyah-display)] text-[1.4rem] sm:text-[1.6rem] font-semibold text-ny-ink mt-0.5 m-0 leading-tight">
            Silent companions on the path
          </h3>
        </div>
        <p className="text-[12.5px] text-ny-sage italic m-0">
          <strong className="text-ny-ink not-italic font-mono text-[13.5px]">{wallData.liveCount}</strong>{" "}
          reading now
          <span className="mx-2 text-ny-gold/55">·</span>
          <strong className="text-ny-ink not-italic font-mono text-[13.5px]">
            {wallData.completedToday}
          </strong>{" "}
          completed today
        </p>
      </header>

      <OrnamentDivider lineWidth="md" glyph="diamond" className="mb-4" />

      <div className="grid gap-2" aria-live="polite">
        {wallData.items.map((item, i) => {
          const meta = JOURNEY_TYPES.find((t) => t.id === item.type)!;
          const active = i === index;
          const tone =
            item.type === "departed"
              ? "bg-gradient-to-br from-ny-cream-warm to-ny-ember/15 text-ny-ember border-ny-ember/30"
              : item.type === "personal"
                ? "bg-gradient-to-br from-ny-cream to-ny-sage/15 text-ny-sage border-ny-sage/30"
                : "bg-gradient-to-br from-ny-gold-soft/50 to-ny-gold/15 text-ny-gold border-ny-gold/40";
          return (
            <div
              key={i}
              className={[
                "flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl border transition-[opacity,transform,border-color,background] duration-500",
                active
                  ? "border-ny-gold/40 bg-gradient-to-r from-ny-gold-soft/40 to-ny-cream opacity-100 sm:translate-x-[2px] shadow-[0_4px_18px_rgba(184,146,74,0.18)]"
                  : "border-ny-charcoal/8 bg-ny-cream-warm/40 opacity-60",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "inline-flex items-center justify-center w-9 h-9 rounded-full border shrink-0",
                  tone,
                ].join(" ")}
              >
                <JourneyTypeIcon type={item.type} size={16} />
              </span>

              <div className="flex flex-col flex-1 min-w-0 sm:flex-row sm:items-center sm:gap-3">
                <p className="m-0 text-[14px] leading-snug text-ny-charcoal flex-1">
                  {messageFor(item)}
                </p>
                <span className="text-[10px] uppercase tracking-[0.12em] text-ny-sage whitespace-nowrap mt-1 sm:mt-0 font-bold">
                  {meta.title}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 mb-0 text-center font-[var(--font-niyyah-display)] italic text-[15px] text-ny-sage">
        No names. No profiles. Only quiet solidarity — you are not alone in your reading.
      </p>
    </section>
  );
}
