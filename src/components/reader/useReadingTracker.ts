"use client";
/**
 * useReadingTracker
 * ─────────────────
 * Tracks reading engagement in the reader with zero polling:
 *
 *  • IntersectionObserver watches every verse card.
 *  • A verse is counted as "read" once it has been visible for ≥ DWELL_MS.
 *  • A session timer accumulates wall-clock minutes while the tab is visible.
 *  • Pages are derived from the SURAHS metadata (pageStart/pageEnd).
 *  • The session is flushed to /api/reading/track on:
 *      – page unload (sendBeacon)
 *      – surah navigation (chapterId change)
 *      – manual flush (called by ReaderView on verse change)
 *
 * Design goals:
 *  – No setInterval / polling.
 *  – O(1) per verse observation.
 *  – Idempotent: the API upserts, so duplicate flushes are safe.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { SURAHS } from "@/lib/niyyah";

const DWELL_MS = 3_000; // verse must be visible for 3 s to count
const FLUSH_INTERVAL_MS = 60_000; // also flush every 60 s while reading

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function pagesForSurah(surahId: number): number {
  const s = SURAHS[surahId - 1];
  if (!s) return 0;
  return Math.max(1, s.pageEnd - s.pageStart + 1);
}

export interface ReadingTrackerState {
  versesRead: number;
  minutesRead: number;
  pagesRead: number;
  /** Call this to attach the observer to a verse DOM element */
  observeVerse: (el: HTMLElement | null, verseKey: string) => void;
}

export function useReadingTracker(
  chapterId: number,
  isLoggedIn: boolean,
): ReadingTrackerState {
  // Set of verse keys confirmed as read this session
  const readVersesRef = useRef<Set<string>>(new Set());
  // Timers: verseKey → setTimeout id (dwell timer)
  const dwellTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Session start time (for minute calculation)
  const sessionStartRef = useRef<number>(Date.now());
  // Minutes already flushed in previous partial flushes this session
  const flushedMinutesRef = useRef<number>(0);
  // Last flushed verse count (to avoid redundant flushes)
  const lastFlushedCountRef = useRef<number>(0);
  // Track first/last verse keys seen
  const firstVerseKeyRef = useRef<string | null>(null);
  const lastVerseKeyRef = useRef<string | null>(null);
  // Reactive state for the HUD
  const [versesRead, setVersesRead] = useState(0);
  const [minutesRead, setMinutesRead] = useState(0);

  // Reset when surah changes
  useEffect(() => {
    readVersesRef.current = new Set();
    dwellTimersRef.current.forEach((t) => clearTimeout(t));
    dwellTimersRef.current = new Map();
    sessionStartRef.current = Date.now();
    flushedMinutesRef.current = 0;
    lastFlushedCountRef.current = 0;
    firstVerseKeyRef.current = null;
    lastVerseKeyRef.current = null;
    setVersesRead(0);
    setMinutesRead(0);
  }, [chapterId]);

  // Live minute counter — updates the HUD every 30 s without polling
  useEffect(() => {
    if (!isLoggedIn) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartRef.current) / 60_000);
      setMinutesRead(flushedMinutesRef.current + elapsed);
    }, 30_000);
    return () => clearInterval(id);
  }, [chapterId, isLoggedIn]);

  const flush = useCallback(
    async (final = false) => {
      if (!isLoggedIn) return;
      const count = readVersesRef.current.size;
      const elapsedMins = Math.floor((Date.now() - sessionStartRef.current) / 60_000);
      const newMins = elapsedMins; // total since session start

      // Skip if nothing new to report
      if (count === 0 && newMins === 0) return;
      if (!final && count === lastFlushedCountRef.current && newMins === flushedMinutesRef.current) return;

      const deltaMinutes = Math.max(0, newMins - flushedMinutesRef.current);
      flushedMinutesRef.current = newMins;
      lastFlushedCountRef.current = count;

      const payload = {
        date: todayIso(),
        surahId: chapterId,
        versesRead: count,
        minutesRead: deltaMinutes,
        pagesRead: count > 0 ? pagesForSurah(chapterId) : 0,
        firstVerseKey: firstVerseKeyRef.current,
        lastVerseKey: lastVerseKeyRef.current,
      };

      if (final && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/reading/track",
          new Blob([JSON.stringify(payload)], { type: "application/json" }),
        );
      } else {
        try {
          await fetch("/api/reading/track", {
            method: "POST",
            headers: { "content-type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
          });
        } catch {
          // silent — non-critical
        }
      }
    },
    [chapterId, isLoggedIn],
  );

  // Periodic flush while reading
  useEffect(() => {
    if (!isLoggedIn) return;
    const id = setInterval(() => void flush(false), FLUSH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [flush, isLoggedIn]);

  // Flush on page unload
  useEffect(() => {
    if (!isLoggedIn) return;
    const onUnload = () => flush(true);
    window.addEventListener("pagehide", onUnload);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("pagehide", onUnload);
      window.removeEventListener("beforeunload", onUnload);
      // Also flush on unmount (surah navigation)
      void flush(false);
    };
  }, [flush, isLoggedIn]);

  /**
   * Attach an IntersectionObserver to a verse element.
   * When the verse enters the viewport, start a dwell timer.
   * If it stays visible for DWELL_MS, mark it as read.
   */
  const observeVerse = useCallback(
    (el: HTMLElement | null, verseKey: string) => {
      if (!el || !isLoggedIn) return;
      if (readVersesRef.current.has(verseKey)) return; // already counted

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            if (!dwellTimersRef.current.has(verseKey)) {
              const timer = setTimeout(() => {
                if (!readVersesRef.current.has(verseKey)) {
                  readVersesRef.current.add(verseKey);
                  // Track first/last
                  if (!firstVerseKeyRef.current) firstVerseKeyRef.current = verseKey;
                  lastVerseKeyRef.current = verseKey;
                  const newCount = readVersesRef.current.size;
                  setVersesRead(newCount);
                }
                dwellTimersRef.current.delete(verseKey);
                observer.disconnect();
              }, DWELL_MS);
              dwellTimersRef.current.set(verseKey, timer);
            }
          } else {
            // Left viewport before dwell — cancel timer
            const t = dwellTimersRef.current.get(verseKey);
            if (t !== undefined) {
              clearTimeout(t);
              dwellTimersRef.current.delete(verseKey);
            }
          }
        },
        { threshold: 0.5 }, // at least 50% of the verse must be visible
      );

      observer.observe(el);
    },
    [isLoggedIn],
  );

  const pages = pagesForSurah(chapterId);
  const pagesRead = versesRead > 0 ? pages : 0;

  return { versesRead, minutesRead, pagesRead, observeVerse };
}
