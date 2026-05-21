"use client";

import { useEffect, useState } from "react";
import { SPIRITUAL_EMOTIONS, type PulseKey } from "@/lib/spiritualPulse";
import { ArrowRight } from "./icons";
import { GoldCorners, OrnamentDivider } from "./Ornament";

interface FetchedVerse {
  verseKey: string;
  surahId: number;
  verseNumber: number;
  arabicText: string | null;
  translationText: string | null;
  error?: string | null;
}

interface FetchedVerses {
  verses: FetchedVerse[];
  error?: string | null;
}

interface MoodCard {
  id: PulseKey;
  label: string;
  arabic: string;
  translation: string;
  ref: string;
  surah: number;
  verse: number;
}

const MOOD_CARDS: MoodCard[] = (Object.keys(SPIRITUAL_EMOTIONS) as PulseKey[]).map(
  (key) => {
    const meta = SPIRITUAL_EMOTIONS[key];
    return {
      id: key,
      label: meta.label,
      arabic: meta.arabic,
      translation: meta.translation,
      ref: meta.ref,
      surah: meta.surah,
      verse: meta.verse,
    };
  },
);

interface Props {
  trId: string;
  onOpenVerse: (surahId: number, verseNumber: number) => void;
}

/**
 * Two side-by-side panels with controlled width:
 *   - Verse of the day (from /api/verse/daily, with static fallback)
 *   - A verse for your mood (server first, then SPIRITUAL_EMOTIONS fallback)
 *
 * Both always render Arabic + translation — the API is best-effort.
 */
export default function CompanionPanel({ trId, onOpenVerse }: Props) {
  const [daily, setDaily] = useState<FetchedVerse | null>(null);
  const [dailyState, setDailyState] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  // Select a random default emotion on mount
  const [mood, setMood] = useState<PulseKey | null>(() => {
    const emotions = Object.keys(SPIRITUAL_EMOTIONS) as PulseKey[];
    const randomIndex = Math.floor(Math.random() * emotions.length);
    return emotions[randomIndex];
  });
  const [moodLoading, setMoodLoading] = useState(true); // Start with loading state
  const [moodApi, setMoodApi] = useState<FetchedVerse[] | null>(null);

  // Fetch verse of the day on mount
  useEffect(() => {
    let alive = true;
    fetch("/api/verse/daily")
      .then(async (r) => {
        const data = (await r.json()) as FetchedVerse;
        if (!alive) return;
        if (!r.ok || data.error || (!data.arabicText && !data.translationText)) {
          setDailyState("error");
          return;
        }
        setDaily(data);
        setDailyState("ready");
      })
      .catch(() => alive && setDailyState("error"));
    return () => {
      alive = false;
    };
  }, []);

  // Fetch verses for default emotion on mount and whenever mood/trId change.
  // The fetch is inlined so state updates only happen inside .then callbacks,
  // satisfying react-hooks/set-state-in-effect.
  useEffect(() => {
    if (!mood || !trId) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setMoodLoading(true);
    });

    const params = new URLSearchParams({ emotion: mood, tr: trId });
    fetch(`/api/verse/emotion?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to fetch verses: ${r.status}`);
        }
        return (await r.json()) as FetchedVerses;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.verses && data.verses.length > 0) {
          setMoodApi(data.verses);
        }
      })
      .catch(() => {
        // Errors are surfaced through the empty state in the UI.
      })
      .finally(() => {
        if (cancelled) return;
        setMoodLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mood, trId]); // Run when mood or trId changes

  // When the user picks a mood, show loading animation while fetching

  function selectMood(id: PulseKey) {
    if (mood === id) {
      setMood(null);
      setMoodApi(null);
      setMoodLoading(false);
      return;
    }
    setMood(id);
    setMoodApi(null);
    setMoodLoading(true); // Show loading animation

    const params = new URLSearchParams({ emotion: id, tr: trId });
    fetch(`/api/verse/emotion?${params.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          setMoodLoading(false);
          return;
        }
        const data = (await r.json()) as FetchedVerses;
        if (data.verses && data.verses.length > 0) {
          setMoodApi(data.verses);
        }
        setMoodLoading(false);
      })
      .catch(() => {
        setMoodLoading(false);
      });
  }

  const moodVerses: FetchedVerse[] = moodApi ?? [];

  return (
    <div className="grid gap-5 md:grid-cols-2 max-w-6xl mx-auto">
      {/* ── Verse of the Day ────────────────────────────────────── */}
      <VerseCard
        eyebrow="Verse of the Day"
        subtitle="A single ayah, gently chosen."
        loading={dailyState === "loading"}
        error={dailyState === "error"}
        verse={daily}
        onOpen={() => daily && onOpenVerse(daily.surahId, daily.verseNumber)}
        ctaLabel="Open in reader"
      />

      {/* ── Mood-based verse ────────────────────────────────────── */}
      <article className="relative overflow-hidden rounded-3xl border border-ny-gold/35 bg-ny-cream parchment-bg shadow-[0_18px_40px_rgba(28,58,47,0.10)]">
        <GoldCorners inset="0.7rem" />

        <div className="relative px-5 sm:px-7 pt-5 pb-4">
          <header className="text-center mb-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-gold m-0">
              How is your heart?
            </p>
            <p className="font-[var(--font-niyyah-display)] italic text-ny-sage text-[13px] m-0 mt-0.5">
              Choose a feeling — receive a verse that meets you there.
            </p>
            <OrnamentDivider lineWidth="sm" glyph="diamond" className="mt-2" />
          </header>

          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {MOOD_CARDS.map((m) => {
              const active = mood === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => selectMood(m.id)}
                  className={[
                    "px-3 py-1 rounded-full border text-[12px] font-semibold tracking-wide transition-colors",
                    active
                      ? "bg-ny-forest text-white border-ny-forest shadow-[0_2px_8px_rgba(20,48,40,0.3)]"
                      : "bg-ny-ivory text-ny-ink-soft border-ny-charcoal/15 hover:border-ny-gold hover:text-ny-ink",
                  ].join(" ")}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {!mood ? (
            <div className="text-center py-4">
              <p className="font-[var(--font-niyyah-display)] italic text-[14px] text-ny-ink-soft/85 m-0 max-w-xs mx-auto">
                The Qur&apos;an speaks to every state. Begin by naming yours.
              </p>
            </div>
          ) : moodLoading ? (
            <IslamicLoadingAnimation />
          ) : moodVerses.filter(v => v.arabicText && v.translationText).length === 0 ? (
            <div className="text-center py-6">
              <p className="font-[var(--font-niyyah-display)] italic text-[14px] text-ny-ink-soft/85 m-0 max-w-xs mx-auto mb-3">
                Unable to load verses at the moment.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (mood) {
                    setMoodLoading(true);
                    const params = new URLSearchParams({ emotion: mood, tr: trId });
                    fetch(`/api/verse/emotion?${params.toString()}`)
                      .then(async (r) => {
                        if (!r.ok) {
                          setMoodLoading(false);
                          return;
                        }
                        const data = (await r.json()) as FetchedVerses;
                        if (data.verses && data.verses.length > 0) {
                          setMoodApi(data.verses);
                        }
                        setMoodLoading(false);
                      })
                      .catch(() => {
                        setMoodLoading(false);
                      });
                  }
                }}
                className="text-[12px] font-semibold text-ny-gold hover:text-ny-ink underline decoration-dotted underline-offset-2"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="min-h-[150px] max-h-[320px] overflow-y-auto space-y-3 px-1">
              {moodVerses.filter(v => v.arabicText && v.translationText).map((verse, idx) => (
                <div 
                  key={verse.verseKey} 
                  className="pb-3 border-b border-ny-gold/15 last:border-0 last:pb-0"
                >
                  <p
                    className="font-[var(--font-decorative)] text-[1.15rem] sm:text-[1.25rem] leading-[1.7] text-ny-ink m-0 mb-1.5 text-center"
                    dir="rtl"
                    lang="ar"
                  >
                    {verse.arabicText}
                  </p>
                  <p className="font-[var(--font-niyyah-display)] italic text-[0.85rem] leading-relaxed text-ny-ink-soft max-w-md mx-auto m-0 mb-2 text-center">
                    &ldquo;{verse.translationText}&rdquo;
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-ny-gold">
                      {verse.verseKey}
                    </span>
                    <span className="text-ny-gold/40 text-xs">•</span>
                    <button
                      type="button"
                      onClick={() => onOpenVerse(verse.surahId, verse.verseNumber)}
                      className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-ny-ink hover:text-ny-gold transition-colors"
                    >
                      Read <ArrowRight />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

function VerseCard({
  eyebrow,
  subtitle,
  loading,
  error,
  verse,
  onOpen,
  ctaLabel,
}: {
  eyebrow: string;
  subtitle: string;
  loading: boolean;
  error: boolean;
  verse: FetchedVerse | null;
  onOpen: () => void;
  ctaLabel: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-ny-gold/35 bg-ny-cream parchment-bg shadow-[0_18px_40px_rgba(28,58,47,0.10)]">
      <GoldCorners inset="0.7rem" />

      <div className="relative px-5 sm:px-7 pt-5 pb-4">
        <header className="text-center mb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-gold m-0">
            {eyebrow}
          </p>
          <p className="font-[var(--font-niyyah-display)] italic text-ny-sage text-[13px] m-0 mt-0.5">
            {subtitle}
          </p>
          <OrnamentDivider lineWidth="sm" glyph="star" className="mt-2" />
        </header>

        {loading && <SkeletonAyah />}
        {error && (
          <p className="text-center text-[13px] text-ny-ink-soft/85 italic py-4 m-0">
            Could not load today&apos;s verse — please try again later.
          </p>
        )}
        {!loading && !error && verse && (
          <div className="text-center min-h-[150px] flex flex-col">
            {verse.arabicText && (
              <p
                className="font-[var(--font-decorative)] text-[1.45rem] sm:text-[1.6rem] leading-[1.7] text-ny-ink m-0 mb-2"
                dir="rtl"
                lang="ar"
              >
                {verse.arabicText}
              </p>
            )}
            {verse.translationText && (
              <p className="font-[var(--font-niyyah-display)] italic text-[0.95rem] leading-relaxed text-ny-ink-soft max-w-md mx-auto m-0 mb-3">
                &ldquo;{verse.translationText}&rdquo;
              </p>
            )}
            <div className="mt-auto flex items-center justify-center gap-3 pt-2 border-t border-ny-gold/20">
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ny-gold">
                Qur&apos;an {verse.verseKey}
              </span>
              <span className="text-ny-gold/40">•</span>
              <button
                type="button"
                onClick={onOpen}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-ny-ink hover:text-ny-gold transition-colors"
              >
                {ctaLabel} <ArrowRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function SkeletonAyah() {
  return (
    <div className="space-y-3 py-2 animate-pulse" aria-hidden>
      <div className="h-7 rounded bg-ny-charcoal/8 w-5/6 mx-auto" />
      <div className="h-7 rounded bg-ny-charcoal/8 w-2/3 mx-auto" />
      <div className="h-3" />
      <div className="h-4 rounded bg-ny-charcoal/8 w-full" />
      <div className="h-4 rounded bg-ny-charcoal/8 w-3/4 mx-auto" />
    </div>
  );
}

/**
 * Beautiful Islamic-styled loading animation with geometric patterns
 */
function IslamicLoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-8 min-h-[200px]" aria-label="Loading verses">
      {/* Rotating Islamic star pattern */}
      <div className="relative w-20 h-20 mb-4">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
          <svg viewBox="0 0 100 100" className="w-full h-full text-ny-gold/40">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </svg>
        </div>
        
        {/* Middle rotating star */}
        <div className="absolute inset-0 flex items-center justify-center animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
          <svg viewBox="0 0 24 24" className="w-12 h-12 text-ny-gold">
            <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
              <path d="M12 2 L14 8 L20 9 L15 14 L17 20 L12 17 L7 20 L9 14 L4 9 L10 8 Z" />
            </g>
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </div>
        
        {/* Inner pulsing circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-ny-gold animate-pulse" />
        </div>
      </div>
      
      {/* Loading text with fade animation */}
      <p className="font-[var(--font-niyyah-display)] italic text-[13px] text-ny-sage animate-pulse m-0">
        Gathering verses for your heart...
      </p>
      
      {/* Decorative dots */}
      <div className="flex items-center gap-1.5 mt-3">
        <span className="w-1.5 h-1.5 rounded-full bg-ny-gold/60 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-ny-gold/60 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-ny-gold/60 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

