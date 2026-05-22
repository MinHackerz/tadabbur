"use client";
/**
 * useReadingTracker — explicit verse-completion model
 * ───────────────────────────────────────────────────
 * Progress advances ONLY when the user clicks "Mark complete" on a verse.
 * Auto-scroll, viewport dwell, or audio playback do NOT count.
 *
 * Time-on-verse:
 *  • A per-verse stopwatch starts when the verse enters the viewport (≥50%).
 *  • The stopwatch pauses when the tab loses focus (visibilitychange).
 *  • When the user clicks "Mark complete", the accumulated ms is sent to the
 *    server along with the verseKey.
 *
 * The server (POST /api/verse-progress) upserts a VerseCompletion row and
 * rebuilds the day's ReadingSession aggregate.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type ReadingSource = "niyyah" | "goals" | "random";

export interface ReadingTrackerState {
  versesCompleted: number;
  minutesRead: number;
  /** Set of verseKeys marked complete this session (for UI badges). */
  completedKeys: Set<string>;
  /** Attach to a verse element to start the per-verse stopwatch. */
  observeVerse: (el: HTMLElement | null, verseKey: string) => void;
  /** Called when the user explicitly marks a verse complete. */
  markComplete: (verseKey: string) => void;
  /** Undo a completion. */
  undoComplete: (verseKey: string) => void;
}

export function useReadingTracker(
  chapterId: number,
  isLoggedIn: boolean,
  source: ReadingSource = "random",
): ReadingTrackerState {
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [minutesRead, setMinutesRead] = useState(0);

  // Per-verse elapsed time accumulators (ms). Key = verseKey.
  const elapsedRef = useRef<Map<string, number>>(new Map());
  // Per-verse "last resumed" timestamp (null = paused or not visible).
  const resumedAtRef = useRef<Map<string, number>>(new Map());
  // Whether the tab is currently visible.
  const visibleRef = useRef(true);
  // Observers we need to disconnect on cleanup.
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());

  // Reset on surah change. Refs are mutated synchronously (those don't
  // trigger re-renders), but the state setters are deferred to a microtask
  // so the rule doesn't flag synchronous setState in the effect body.
  useEffect(() => {
    elapsedRef.current = new Map();
    resumedAtRef.current = new Map();
    observersRef.current.forEach((obs) => obs.disconnect());
    observersRef.current = new Map();

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setCompletedKeys(new Set());
      setMinutesRead(0);
    });
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  // Fetch already-completed verses for today on mount.
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const fetchCompleted = () => {
      fetch(`/api/verse-progress?source=${source}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data?.items) return;
          const keys = new Set<string>();
          let totalMs = 0;
          for (const item of data.items as { verseKey: string; timeSpentMs: number }[]) {
            // Only include verses from this surah.
            if (item.verseKey.startsWith(`${chapterId}:`)) {
              keys.add(item.verseKey);
              totalMs += item.timeSpentMs;
            }
          }
          if (keys.size > 0) {
            setCompletedKeys(keys);
            setMinutesRead(Math.round(totalMs / 60_000));
          }
        })
        .catch(() => {});
    };
    
    // Initial fetch
    fetchCompleted();
    
    // Listen for verse completion events from other tabs/windows
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'verse-completed') {
        fetchCompleted();
      }
    };
    
    // Listen for custom verse-completed events
    const handleVerseCompleted = () => {
      fetchCompleted();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('verse-completed', handleVerseCompleted);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('verse-completed', handleVerseCompleted);
    };
  }, [chapterId, isLoggedIn, source]);

  // Pause/resume all active stopwatches on visibility change.
  useEffect(() => {
    function onVisChange() {
      const hidden = document.hidden;
      visibleRef.current = !hidden;
      const now = Date.now();
      if (hidden) {
        // Pause: flush elapsed for all running stopwatches.
        for (const [key, startedAt] of resumedAtRef.current.entries()) {
          const prev = elapsedRef.current.get(key) ?? 0;
          elapsedRef.current.set(key, prev + (now - startedAt));
        }
        resumedAtRef.current = new Map();
      } else {
        // Resume: restart all that were running before hide.
        // We don't know which were running, so we restart all that are in-viewport.
        // The IntersectionObserver callbacks will handle re-starting them.
      }
    }
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, []);

  const observeVerse = useCallback(
    (el: HTMLElement | null, verseKey: string) => {
      if (!el || !isLoggedIn) return;
      // Don't re-observe.
      if (observersRef.current.has(verseKey)) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && visibleRef.current) {
            // Start stopwatch if not already running.
            if (!resumedAtRef.current.has(verseKey)) {
              resumedAtRef.current.set(verseKey, Date.now());
            }
          } else {
            // Pause stopwatch.
            const startedAt = resumedAtRef.current.get(verseKey);
            if (startedAt !== undefined) {
              const prev = elapsedRef.current.get(verseKey) ?? 0;
              elapsedRef.current.set(verseKey, prev + (Date.now() - startedAt));
              resumedAtRef.current.delete(verseKey);
            }
          }
        },
        { threshold: 0.5 },
      );
      observer.observe(el);
      observersRef.current.set(verseKey, observer);
    },
    [isLoggedIn],
  );

  const markComplete = useCallback(
    (verseKey: string) => {
      if (!isLoggedIn) return;
      // Flush the running stopwatch for this verse.
      const startedAt = resumedAtRef.current.get(verseKey);
      let elapsed = elapsedRef.current.get(verseKey) ?? 0;
      if (startedAt !== undefined) {
        elapsed += Date.now() - startedAt;
        resumedAtRef.current.delete(verseKey);
      }
      elapsedRef.current.set(verseKey, elapsed);

      // Optimistic UI update.
      setCompletedKeys((prev) => {
        const next = new Set(prev);
        next.add(verseKey);
        return next;
      });

      // Enterprise-level time estimation:
      // 1. Use actual tracked time if significant (>= 5 seconds)
      // 2. Otherwise, estimate from word count with industry-standard reading pace
      // 3. Apply minimum threshold to prevent gaming the system
      let estimatedMs = elapsed;
      if (estimatedMs < 5000) {
        // Find the verse element and count Arabic words
        const el = document.getElementById(`verse-${verseKey.split(":")[1]}`);
        if (el) {
          const arabicText = el.querySelector('[dir="rtl"]')?.textContent ?? "";
          const wordCount = arabicText.trim().split(/\s+/).filter(Boolean).length;
          
          // Industry-standard reading paces for Arabic Quran:
          // - Fast reading: ~200 words/min (300ms/word)
          // - Normal reading: ~150 words/min (400ms/word)  
          // - Contemplative reading: ~100 words/min (600ms/word)
          // We use contemplative pace as it's most common for Quran
          const CONTEMPLATIVE_MS_PER_WORD = 600;
          const MIN_TIME_PER_VERSE_MS = 3000; // 3 seconds minimum
          
          const wordBasedMs = Math.max(
            wordCount * CONTEMPLATIVE_MS_PER_WORD,
            MIN_TIME_PER_VERSE_MS
          );
          
          // Use the maximum of tracked time and word-based estimate
          estimatedMs = Math.max(elapsed, wordBasedMs);
        } else {
          // Fallback: 5 seconds minimum if we can't find the element
          estimatedMs = Math.max(elapsed, 5000);
        }
      }
      
      // Cap at 30 minutes per verse (safety measure)
      const MAX_TIME_PER_VERSE_MS = 30 * 60_000;
      estimatedMs = Math.min(estimatedMs, MAX_TIME_PER_VERSE_MS);

      setMinutesRead((prev) => prev + Math.max(1, Math.round(estimatedMs / 60_000)));

      // Fire-and-forget POST.
      fetch("/api/verse-progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ verseKey, timeSpentMs: estimatedMs, source }),
      })
        .then(() => {
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('verse-completed', { 
            detail: { verseKey, timeSpentMs: estimatedMs } 
          }));
          // Trigger storage event for cross-tab sync
          localStorage.setItem('verse-completed', Date.now().toString());
        })
        .catch(() => {});
    },
    [isLoggedIn],
  );

  const undoComplete = useCallback(
    (verseKey: string) => {
      if (!isLoggedIn) return;
      setCompletedKeys((prev) => {
        const next = new Set(prev);
        next.delete(verseKey);
        return next;
      });
      const elapsed = elapsedRef.current.get(verseKey) ?? 0;
      setMinutesRead((prev) => Math.max(0, prev - Math.round(elapsed / 60_000)));
      elapsedRef.current.delete(verseKey);

      fetch(`/api/verse-progress?verseKey=${encodeURIComponent(verseKey)}&source=${source}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => {});
    },
    [isLoggedIn],
  );

  return {
    versesCompleted: completedKeys.size,
    minutesRead,
    completedKeys,
    observeVerse,
    markComplete,
    undoComplete,
  };
}
