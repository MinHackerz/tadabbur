"use client";

import { useEffect, useState } from "react";
import {
  HERO_VERSE,
  getTodayPortion,
  loadJourneyFromLocalStorage,
  clearLocalStorage,
  markTodayComplete,
  type Journey,
  type JourneyType,
} from "@/lib/niyyah";
import {
  fetchJourney,
  createJourney as apiCreateJourney,
  updateJourney,
  addJourneyDay,
  deleteJourney,
  migrateLocalStorageToDatabase,
} from "@/lib/niyyah-api";

import AmanahWall from "./AmanahWall";
import CompanionPanel from "./CompanionPanel";
import CompletionCeremony from "./CompletionCeremony";
import DedicationHero from "./DedicationHero";
import GiftTokenPreview from "./GiftTokenPreview";
import JourneyTimeline from "./JourneyTimeline";
import JourneyTypeSelector from "./JourneyTypeSelector";
import { OrnamentDivider } from "./Ornament";
import ProgressVessel from "./ProgressVessel";
import RhythmStrip from "./RhythmStrip";
import TodayReadingCard from "./TodayReadingCard";

interface Props {
  onOpenReader: (surahId: number, hash?: string, source?: string) => void;
  trId: string;
  bookmarkCount: number;
  notesCount: number;
  isLoggedIn: boolean;
  hasGoal: boolean;
  goalLabel?: string;
  goalPlanSummary?: string | null;
}

export default function NiyyahHomeSection({
  onOpenReader,
  trId,
  bookmarkCount,
  notesCount,
  isLoggedIn,
  hasGoal,
  goalLabel,
  goalPlanSummary,
}: Props) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [ceremonyOpen, setCeremonyOpen] = useState(false);
  const [migrating, setMigrating] = useState(false);

  // Refresh journey data when user returns to the page after reading
  useEffect(() => {
    if (!isLoggedIn) return;

    // Single source of truth for both sync paths so we don't fan out the
    // same POSTs from three independent effects.
    let inFlight = false;
    let pending = false;

    async function runSync(reason: string) {
      if (inFlight) {
        pending = true;
        return;
      }
      inFlight = true;
      try {
        const [niyyahSync, goalSync] = await Promise.allSettled([
          fetch("/api/niyyah/sync", { method: "POST", credentials: "include" }),
          fetch("/api/goals/sync", { method: "POST", credentials: "include" }),
        ]);

        let didChange = false;
        if (niyyahSync.status === "fulfilled" && niyyahSync.value.ok) {
          const data = (await niyyahSync.value.json()) as { synced?: boolean };
          if (data.synced) didChange = true;
        }
        if (goalSync.status === "fulfilled" && goalSync.value.ok) {
          await goalSync.value.json().catch(() => null);
        }

        // Always re-fetch journey after sync attempts. The niyyah sync may
        // have already been performed in-process by verse-progress, so even
        // when the endpoint reports "already marked" the journey state in the
        // DB may have changed since we last fetched.
        if (journey) {
          const updated = await fetchJourney();
          if (updated) setJourney(updated);
        }
      } catch {
        // Best-effort sync — ignore network/server hiccups.
      } finally {
        inFlight = false;
        if (pending) {
          pending = false;
          // Coalesce any sync requests that arrived while we were running.
          void runSync(`${reason}+queued`);
        }
      }
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      if (!document.hidden) void runSync("visibility");
    };

    const handleVerseCompleted = () => {
      // Wait for the verse-completed write storm to settle before syncing.
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void runSync("verse-completed"), 3000);
    };

    const intervalId = setInterval(() => {
      if (!document.hidden) void runSync("interval");
    }, 30_000);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("verse-completed", handleVerseCompleted);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("verse-completed", handleVerseCompleted);
      if (debounceTimer) clearTimeout(debounceTimer);
      clearInterval(intervalId);
    };
  }, [isLoggedIn, journey]);

  useEffect(() => {
    async function loadData() {
      // Check for a pending journey that was created before sign-in.
      // We wrap the JSON.parse in try/catch — a malformed value should not
      // wipe out the rest of this effect.
      const pendingRaw = localStorage.getItem("niyyah_pending_journey");

      if (pendingRaw && isLoggedIn) {
        // User just signed in after creating a journey — save it to the database
        // Small delay to ensure session cookie is fully established
        await new Promise((resolve) => setTimeout(resolve, 500));
        let pendingJourney: Journey | null = null;
        try {
          pendingJourney = JSON.parse(pendingRaw) as Journey;
        } catch {
          localStorage.removeItem("niyyah_pending_journey");
        }
        if (pendingJourney) {
          try {
            const created = await apiCreateJourney({
              type: pendingJourney.type,
              recipientName: pendingJourney.recipientName,
              occasion: pendingJourney.occasion,
              personalDua: pendingJourney.personalDua,
              goalType: pendingJourney.goalType,
              goalValue: pendingJourney.goalValue,
              dailyTarget: pendingJourney.dailyTarget,
              readerName: pendingJourney.readerName,
              startDate: pendingJourney.startDate,
              targetDate: pendingJourney.targetDate,
            });
            localStorage.removeItem("niyyah_pending_journey");
            if (created) {
              setJourney({
                ...pendingJourney,
                id: created.id ?? pendingJourney.id,
                completedDays:
                  created.completedDays ?? pendingJourney.completedDays ?? [],
                currentStreak: created.currentStreak ?? 0,
                longestStreak: created.longestStreak ?? 0,
                mercyDayUsed: created.mercyDayUsed ?? false,
                lastMercyWeek: created.lastMercyWeek ?? null,
                isComplete: created.isComplete ?? false,
                isActive: created.isActive ?? true,
              });
              setHydrated(true);
              return;
            }
          } catch (err) {
            // If it fails, keep the pending journey for next page load
            console.error("Failed to save pending journey:", err);
          }
        }
      }

      // Check for localStorage data (migration path)
      const localJourney = loadJourneyFromLocalStorage();
      
      if (localJourney && isLoggedIn) {
        // Migrate localStorage to database
        setMigrating(true);
        const migrated = await migrateLocalStorageToDatabase(localJourney);
        if (migrated) {
          clearLocalStorage();
          const dbJourney = await fetchJourney();
          setJourney(dbJourney);
        } else {
          setJourney(localJourney);
        }
        setMigrating(false);
      } else if (isLoggedIn) {
        // Load from database
        const dbJourney = await fetchJourney();
        setJourney(dbJourney);
      } else {
        // Not logged in, check localStorage only
        setJourney(localJourney);
      }
      
      setHydrated(true);
    }
    
    loadData();
  }, [isLoggedIn]);

  async function persist(next: Journey | null) {
    setJourney(next);
    
    if (!isLoggedIn) {
      // Save to localStorage for later migration after sign-in
      if (next) {
        localStorage.setItem("niyyah_journey", JSON.stringify(next));
      } else {
        localStorage.removeItem("niyyah_journey");
      }
      return;
    }

    if (!next) {
      // Delete journey
      if (journey?.id) {
        await deleteJourney(journey.id);
      }
      return;
    }

    // Update journey in database
    if (journey?.id) {
      await updateJourney(journey.id, {
        currentStreak: next.currentStreak,
        longestStreak: next.longestStreak,
        mercyDayUsed: next.mercyDayUsed,
        lastMercyWeek: next.lastMercyWeek,
        isComplete: next.isComplete,
      });
    }
  }

  function handleSelectType(j: Journey) {
    // The journey object is already created by the modal in JourneyTypeSelector.
    // Save it to the database via handleSeal.
    handleSeal(j);
  }

  async function handleSeal(j: Journey) {
    if (!isLoggedIn) {
      // Save journey data to localStorage so it persists through the sign-in redirect
      localStorage.setItem("niyyah_pending_journey", JSON.stringify(j));
      // Redirect to sign in — after auth, the useEffect will pick up the pending journey
      window.location.href = "/api/auth/start";
      return;
    }

    // Prevent duplicate creation when user lands here right after sign-in.
    if (journey && journey.id) {
      return;
    }

    try {
      const existingJourney = await fetchJourney();
      if (existingJourney) {
        setJourney(existingJourney);
        return;
      }
    } catch (error) {
      console.error("[NiyyahHomeSection] Error checking for existing journey:", error);
      // Continue with creation if check fails
    }

    // Create journey in database
    try {
      const created = await apiCreateJourney({
        type: j.type,
        recipientName: j.recipientName,
        occasion: j.occasion,
        personalDua: j.personalDua,
        goalType: j.goalType,
        goalValue: j.goalValue,
        dailyTarget: j.dailyTarget,
        readerName: j.readerName,
        startDate: j.startDate,
        targetDate: j.targetDate,
      });

      if (created) {
        // The API returns the raw DB row without completedDays — normalize it.
        const normalized: Journey = {
          v: 1,
          id: created.id ?? j.id,
          type: created.type ?? j.type,
          recipientName: created.recipientName ?? j.recipientName,
          occasion: created.occasion ?? j.occasion,
          personalDua: created.personalDua ?? j.personalDua,
          goalType: created.goalType ?? j.goalType,
          goalValue: created.goalValue ?? j.goalValue,
          dailyTarget: created.dailyTarget ?? j.dailyTarget,
          startDate: created.startDate ?? j.startDate,
          targetDate: created.targetDate ?? j.targetDate,
          completedDays: created.completedDays ?? [],
          currentStreak: created.currentStreak ?? 0,
          longestStreak: created.longestStreak ?? 0,
          mercyDayUsed: created.mercyDayUsed ?? false,
          lastMercyWeek: created.lastMercyWeek ?? null,
          isComplete: created.isComplete ?? false,
          isActive: created.isActive ?? true,
          readerName: created.readerName ?? j.readerName,
        };
        setJourney(normalized);
      } else {
        console.error("[NiyyahHomeSection] apiCreateJourney returned null");
        // The toast UI handles user-facing notification; no `alert()` here.
      }
    } catch (error) {
      console.error("[NiyyahHomeSection] Failed to create niyyah journey:", error);
    }
  }

  function handleBegin() {
    if (!journey) return;
    if (!isLoggedIn) {
      // Save journey to localStorage and redirect to sign in
      localStorage.setItem("niyyah_pending_journey", JSON.stringify(journey));
      window.location.href = "/api/auth/start";
      return;
    }
    const p = getTodayPortion(journey);
    // Store timestamp to track when reading started
    sessionStorage.setItem('niyyah_reading_started', Date.now().toString());

    // Fetch today's niyyah completions to resume from the last completed verse
    fetch(`/api/verse-progress?source=niyyah`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.items?.length) {
          // Find the last completed verse within today's portion range
          const portionKeys = new Set<string>();
          for (let s = p.start.surahId; s <= p.end.surahId; s++) {
            const startV = s === p.start.surahId ? p.start.verseNumber : 1;
            // Use a generous upper bound; the reader will handle bounds
            const endV = s === p.end.surahId ? p.end.verseNumber : 999;
            for (let v = startV; v <= endV; v++) {
              portionKeys.add(`${s}:${v}`);
            }
          }

          // Get the last completed verse that's within today's portion
          const completedInPortion = (data.items as { verseKey: string }[])
            .filter((item) => portionKeys.has(item.verseKey));

          if (completedInPortion.length > 0) {
            const lastKey = completedInPortion[completedInPortion.length - 1].verseKey;
            const [surahStr, verseStr] = lastKey.split(":");
            const surahId = Number(surahStr);
            const verseNumber = Number(verseStr);
            // Open at the next verse after the last completed one
            const nextVerse = verseNumber + 1;
            onOpenReader(surahId, `verse-${nextVerse}`, "niyyah");
            return;
          }
        }
        // No completions yet — start from the beginning of today's portion
        onOpenReader(p.start.surahId, `verse-${p.start.verseNumber}`, "niyyah");
      })
      .catch(() => {
        // Fallback: start from the beginning of today's portion
        onOpenReader(p.start.surahId, `verse-${p.start.verseNumber}`, "niyyah");
      });
  }

  async function handleMarkRead() {
    if (!journey) return;
    if (!isLoggedIn) {
      // Save journey to localStorage and redirect to sign in
      localStorage.setItem("niyyah_pending_journey", JSON.stringify(journey));
      window.location.href = "/api/auth/start";
      return;
    }
    
    const p = getTodayPortion(journey);
    const next = markTodayComplete(journey, p);
    
    // Add the new day to database
    const newDay = next.completedDays[next.completedDays.length - 1];
    if (newDay) {
      await addJourneyDay(journey.id, newDay);
    }
    
    // Update journey metadata
    await persist(next);
    
    if (next.isComplete) setCeremonyOpen(true);
  }

  async function handleResetJourney() {
    if (!journey) return;
    if (!isLoggedIn) {
      // Just clear localStorage
      localStorage.removeItem("niyyah_journey");
      localStorage.removeItem("niyyah_pending_journey");
      setJourney(null);
      return;
    }
    
    const confirmed = confirm('Are you sure you want to end this journey? It will be moved to your journey history.');
    if (confirmed && journey.id) {
      // Mark journey as inactive instead of deleting
      await updateJourney(journey.id, { isActive: false });
      setJourney(null);
    }
  }

  async function handleStartAnother() {
    setCeremonyOpen(false);
    if (journey?.id && isLoggedIn) {
      // Mark current journey as inactive before starting a new one
      await updateJourney(journey.id, { isActive: false });
    }
    setJourney(null);
  }

  return (
    <section className="niyyah-scope text-ny-charcoal">
      {/*
        Render decisions, in priority order:
        1) `migrating` — one-off localStorage→DB upgrade. Show a sync notice.
        2) `journey` exists — render the dashboard.
        3) Logged out OR hydration finished with no journey — render the
           empty hero + journey selector.
        4) Logged in but still hydrating — show a hero-shaped skeleton so
           the page top doesn't pop in seconds after the rest of the page.

        Importantly: the empty-hero CTA renders immediately for the most
        common case (logged-out users hitting a fresh tab) instead of being
        gated behind a database round-trip.
      */}
      {migrating ? (
        <div
          aria-hidden
          className="rounded-3xl border border-ny-charcoal/10 bg-ny-cream h-[18rem] animate-pulse mb-8 flex items-center justify-center"
        >
          <p className="text-ny-sage text-sm">Syncing your journey to the cloud…</p>
        </div>
      ) : journey ? (
        <>
          <DedicationHero journey={journey} daysCompleted={journey.completedDays?.length ?? 0} />

          <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr] mb-2 max-w-6xl mx-auto">
            <ProgressVessel journey={journey} />
            <TodayReadingCard
              journey={journey}
              onBegin={handleBegin}
              onMarkRead={handleMarkRead}
            />
          </div>

          <div className="max-w-6xl mx-auto">
            <JourneyTimeline journey={journey} />
            <GiftTokenPreview journey={journey} onOpenFull={() => setCeremonyOpen(true)} />
          </div>

          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <button
              type="button"
              onClick={() => setCeremonyOpen(true)}
              className="text-[13px] font-semibold text-ny-sage hover:text-ny-ink underline decoration-dotted underline-offset-4 tracking-wide"
            >
              Preview the completion ceremony
            </button>
            <button
              type="button"
              onClick={handleResetJourney}
              className="text-[13px] font-semibold text-ny-charcoal/55 hover:text-ny-ember underline decoration-dotted underline-offset-4 tracking-wide"
            >
              End this journey
            </button>
          </div>
        </>
      ) : !isLoggedIn || hydrated ? (
        <>
          <EmptyHero />
          <SectionTitle eyebrow="Set your niyyah" title="Choose your journey" />
          <JourneyTypeSelector onSelect={handleSelectType} />
        </>
      ) : (
        <div
          aria-hidden
          className="rounded-3xl border border-ny-charcoal/10 bg-ny-cream h-[18rem] animate-pulse mb-8"
        />
      )}

      {/* ── Companion verses (Verse of Day + Mood) ────────────── */}
      <SectionTitle eyebrow="Companions on the way" title="A verse for your heart" />
      <CompanionPanel
        trId={trId}
        onOpenVerse={(s, v) => onOpenReader(s, `verse-${v}`)}
      />

      {/* ── Rhythm strip — streak / library / progress ─────────── */}
      <SectionTitle eyebrow="Your rhythm" title="Where you stand today" />
      <RhythmStrip
        bookmarkCount={bookmarkCount}
        notesCount={notesCount}
        isLoggedIn={isLoggedIn}
        onContinueReader={(surah, hash, source) => onOpenReader(surah, hash, source)}
        hasGoal={hasGoal}
        goalLabel={goalLabel}
        goalPlanSummary={goalPlanSummary}
      />

      {/* ── The Wall ────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto mt-12">
        <AmanahWall />
      </div>

      {/* ── Closing du'a arch ─────────────────────────────────── */}
      <ClosingArch />

      {journey && (
        <CompletionCeremony
          journey={journey}
          open={ceremonyOpen}
          onClose={() => setCeremonyOpen(false)}
          onStartAnother={handleStartAnother}
        />
      )}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────── */
/*  Sub-blocks — pure composition, kept here for readability.         */
/* ────────────────────────────────────────────────────────────────── */

function ClosingArch() {
  return (
    <div className="relative text-center mt-14 mb-6">
      <OrnamentDivider lineWidth="lg" glyph="trefoil" className="mb-4" />

      <p
        className="font-[var(--font-decorative)] text-[1.5rem] sm:text-[1.85rem] text-ny-gold m-0 leading-tight"
        dir="rtl"
        lang="ar"
      >
        رَبَّنَا تَقَبَّلْ مِنَّا
      </p>
      <p className="font-[var(--font-niyyah-display)] italic text-ny-sage text-[14px] mt-2 m-0">
        &ldquo;Our Lord, accept this from us.&rdquo;
      </p>
      <p className="mt-1 font-mono text-[10px] tracking-[0.18em] uppercase text-ny-gold m-0">
        Qur&apos;an 2:127
      </p>

      <div className="flex items-center justify-center gap-3 mt-5 text-ny-gold/55" aria-hidden>
        <span>✦</span>
        <span>✦</span>
        <span>✦</span>
      </div>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="text-center mt-14 mb-6 px-4">
      <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.28em] text-ny-gold m-0">
        {eyebrow}
      </p>
      <h2 className="font-[var(--font-niyyah-display)] text-[1.85rem] sm:text-[2.25rem] font-semibold text-ny-ink mt-1 m-0 tracking-tight">
        {title}
      </h2>
      <OrnamentDivider lineWidth="md" glyph="diamond" className="mt-3" />
    </header>
  );
}

function EmptyHero() {
  return (
    <header className="relative overflow-hidden rounded-2xl mb-6 max-w-6xl mx-auto">
      {/* Outer gold border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-ny-gold/55 via-ny-gold-soft/40 to-ny-gold/30 shadow-[0_12px_32px_rgba(28,58,47,0.12)]" />
      {/* Inner parchment */}
      <div className="relative m-[2px] rounded-[14px] bg-ny-cream parchment-bg overflow-hidden">
        {/* Star tile decoration in corners */}
        <div
          aria-hidden
          className="absolute -top-6 -left-6 w-24 h-24 star-bg opacity-[0.15] rotate-12"
        />
        <div
          aria-hidden
          className="absolute -bottom-6 -right-6 w-24 h-24 star-bg opacity-[0.15] -rotate-12"
        />

        <div className="relative px-5 sm:px-8 py-5 sm:py-6 text-center">
          {/* Crowning glyph */}
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-ny-gold/45 bg-gradient-to-br from-ny-gold-soft to-ny-cream-warm text-ny-gold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45),0_4px_12px_rgba(184,146,74,0.15)] mb-2">
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
                <path d="M12 2 L14 8 L20 9 L15 14 L17 20 L12 17 L7 20 L9 14 L4 9 L10 8 Z" />
              </g>
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
            </svg>
          </div>

          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.26em] text-ny-gold m-0">
            The Niyyah Gift System
          </p>
          <h1 className="font-[var(--font-niyyah-display)] text-[1.5rem] sm:text-[2rem] font-semibold leading-[1.15] tracking-tight text-ny-ink mt-1 mb-1.5 m-0">
            Begin a reading journey
          </h1>
          <p className="mt-0.5 mx-auto max-w-2xl text-[0.88rem] leading-[1.5] text-ny-charcoal/85">
            Read the Qur&apos;an, gift the reward. Set your{" "}
            <em className="text-ny-ink font-semibold">niyyah</em> for
            someone you love — living or departed — or for a season of your
            own life. At the end, a token of light is yours to keep, or to
            give.
          </p>

          <OrnamentDivider lineWidth="md" glyph="diamond" className="mt-3 mb-2" />

          <p className="mx-auto max-w-xl font-[var(--font-niyyah-display)] italic text-[0.92rem] sm:text-[0.98rem] text-ny-sage m-0 leading-[1.5]">
            &ldquo;{HERO_VERSE.translation}&rdquo;
          </p>
          <p
            className="font-[var(--font-decorative)] text-[1.15rem] text-ny-gold mt-1 m-0 leading-snug"
            dir="rtl"
            lang="ar"
          >
            {HERO_VERSE.arabic}
          </p>
          <p className="mt-1 font-mono text-[9px] tracking-[0.16em] uppercase text-ny-gold m-0">
            {HERO_VERSE.ref}
          </p>
        </div>
      </div>
    </header>
  );
}
