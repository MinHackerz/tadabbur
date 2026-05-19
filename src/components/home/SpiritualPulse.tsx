"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  clearTodaySpiritualPulse,
  getSpiritualPulseState,
  pulseCheckInsThisWeek,
  recordSpiritualPulse,
  SPIRITUAL_EMOTIONS,
  type PulseKey,
} from "@/lib/spiritualPulse";
import { IconArrowRight } from "@/components/ui/primitives";

interface SpiritualPulseProps {
  trId?: string;
  onOpenVerse: (surah: number, verse: number) => void;
  onSelectSurah: (surah: number) => void;
}

interface FetchedVerse {
  verseKey: string;
  surahId: number;
  verseNumber: number;
  arabicText: string | null;
  translationText: string | null;
}

function pulseClassSuffix(key: PulseKey) {
  return key.replace(/_/g, "-");
}

export default function SpiritualPulse({ trId = "85", onOpenVerse, onSelectSurah }: SpiritualPulseProps) {
  const [pulse, setPulse] = useState<PulseKey | null>(null);
  const [weekCheckIns, setWeekCheckIns] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [fetchedVerse, setFetchedVerse] = useState<FetchedVerse | null>(null);
  const [verseStatus, setVerseStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    const state = getSpiritualPulseState();
    setPulse(state.todayPulse);
    setWeekCheckIns(pulseCheckInsThisWeek(state.checkInDates));
    setMounted(true);
  }, []);

  const fetchVerseForEmotion = useCallback(async (emotion: PulseKey) => {
    setVerseStatus("loading");
    setFetchedVerse(null);
    try {
      const params = new URLSearchParams({ emotion, tr: trId });
      const r = await fetch(`/api/verse/emotion?${params.toString()}`);
      const data = await r.json() as FetchedVerse & { error?: string };
      if (!r.ok || data.error) {
        setVerseStatus("error");
        return;
      }
      setFetchedVerse(data);
      setVerseStatus("ready");
    } catch {
      setVerseStatus("error");
    }
  }, [trId]);

  const selectPulse = (key: PulseKey) => {
    if (pulse === key) {
      const next = clearTodaySpiritualPulse();
      setPulse(null);
      setFetchedVerse(null);
      setVerseStatus("idle");
      setWeekCheckIns(pulseCheckInsThisWeek(next.checkInDates));
      return;
    }
    const next = recordSpiritualPulse(key);
    setPulse(key);
    setWeekCheckIns(pulseCheckInsThisWeek(next.checkInDates));
    void fetchVerseForEmotion(key);
  };

  const staticData = pulse ? SPIRITUAL_EMOTIONS[pulse] : null;
  const displayVerse = fetchedVerse ?? (staticData ? {
    verseKey: staticData.ref,
    surahId: staticData.surah,
    verseNumber: staticData.verse,
    arabicText: staticData.arabic,
    translationText: staticData.translation,
  } : null);

  return (
    <section
      id="spiritual-pulse"
      className="spiritual-pulse mb-10 md:mb-12 scroll-mt-24"
      style={{ animation: "fade-in .35s ease both" }}
      aria-labelledby="spiritual-pulse-heading"
    >
      <div className="spiritual-pulse__card">
        <div className="spiritual-pulse__glow" aria-hidden />

        <div className="spiritual-pulse__header">
          <div className="spiritual-pulse__heart-wrap" aria-hidden>
            <span className="spiritual-pulse__heart-ring" />
            <span className="spiritual-pulse__heart">♥</span>
          </div>
          <div className="spiritual-pulse__intro">
            <p className="spiritual-pulse__eyebrow">Spiritual pulse</p>
            <h2 id="spiritual-pulse-heading" className="spiritual-pulse__title">
              How is your heart today?
            </h2>
            <p className="spiritual-pulse__subtitle">
              Pause before you read. Choose what you feel—Allah&apos;s words meet you there.
            </p>
            {mounted && weekCheckIns > 0 && (
              <p className="spiritual-pulse__streak">
                {weekCheckIns} heart check-in{weekCheckIns === 1 ? "" : "s"} this week
              </p>
            )}
          </div>
        </div>

        <div className="spiritual-pulse__chips" role="group" aria-label="How you feel today">
          {(Object.keys(SPIRITUAL_EMOTIONS) as PulseKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => selectPulse(k)}
              aria-pressed={pulse === k}
              className={`spiritual-pulse__chip spiritual-pulse__chip--${pulseClassSuffix(k)} ${
                pulse === k ? "spiritual-pulse__chip--active" : ""
              }`}
            >
              {SPIRITUAL_EMOTIONS[k].label}
            </button>
          ))}
        </div>

        {pulse && staticData ? (
          <div className={`spiritual-pulse__reveal spiritual-pulse__reveal--${pulseClassSuffix(pulse)}`}>
            <p className="spiritual-pulse__prompt">{staticData.prompt}</p>

            {verseStatus === "loading" && (
              <div className="flex justify-center py-8">
                <div className="w-7 h-7 border-2 border-border border-t-accent rounded-full animate-spin" />
              </div>
            )}

            {verseStatus !== "loading" && displayVerse && (
              <>
                {displayVerse.arabicText && (
                  <blockquote
                    className="spiritual-pulse__arabic"
                    dir="rtl"
                    style={{ fontFamily: "var(--font-arabic)" }}
                  >
                    {displayVerse.arabicText}
                  </blockquote>
                )}
                {displayVerse.translationText && (
                  <p className="spiritual-pulse__translation">
                    &ldquo;{displayVerse.translationText}&rdquo;
                  </p>
                )}
                <p className="spiritual-pulse__ref">{displayVerse.verseKey}</p>
              </>
            )}

            <div className="spiritual-pulse__dhikr">
              <span className="spiritual-pulse__dhikr-label">A moment of remembrance</span>
              <span className="spiritual-pulse__dhikr-text" dir="rtl" style={{ fontFamily: "var(--font-arabic)" }}>
                {staticData.dhikr}
              </span>
            </div>

            <div className="spiritual-pulse__actions">
              <button
                type="button"
                onClick={() => {
                  const sid = displayVerse?.surahId ?? staticData.surah;
                  const vn  = displayVerse?.verseNumber ?? staticData.verse;
                  onSelectSurah(sid);
                  onOpenVerse(sid, vn);
                }}
                className="spiritual-pulse__btn spiritual-pulse__btn--primary"
              >
                Read {displayVerse?.verseKey ?? staticData.ref}
                <IconArrowRight />
              </button>
              <Link
                href={`/reflect?verse=${encodeURIComponent(displayVerse?.verseKey ?? staticData.ref)}`}
                className="spiritual-pulse__btn spiritual-pulse__btn--secondary"
              >
                Reflect on this verse
              </Link>
            </div>
          </div>
        ) : (
          <div className="spiritual-pulse__empty">
            <p>Tap a feeling above to receive a verse, a gentle prompt, and a short remembrance.</p>
          </div>
        )}
      </div>
    </section>
  );
}
