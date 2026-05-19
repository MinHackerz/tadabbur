"use client";
import { useCallback, useEffect, useState } from "react";
import type { ReadingMode } from "./useReaderPrefs";
import {
  clampSurah,
  loadReaderSession,
  saveReaderSession,
  SESSION_DEFAULTS,
  type ReaderSession,
} from "./readerSession";

export function useReaderSession() {
  const [session, setSession] = useState<ReaderSession>(SESSION_DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loaded = loadReaderSession();
    setSession(loaded);
    document.documentElement.dataset.theme = loaded.darkMode ? "dark" : "light";
    setHydrated(true);
  }, []);

  const patch = useCallback((partial: Partial<ReaderSession>) => {
    setSession((prev) => {
      const next: ReaderSession = {
        ...prev,
        ...partial,
        surahId: partial.surahId !== undefined ? clampSurah(partial.surahId) : prev.surahId,
        fontSize:
          partial.fontSize !== undefined
            ? Math.min(5, Math.max(1, partial.fontSize))
            : prev.fontSize,
      };
      if (
        next.surahId === prev.surahId &&
        next.trId === prev.trId &&
        next.auId === prev.auId &&
        next.readingMode === prev.readingMode &&
        next.fontSize === prev.fontSize &&
        next.darkMode === prev.darkMode
      ) {
        return prev;
      }
      if (hydrated) saveReaderSession(next);
      return next;
    });
  }, [hydrated]);

  const setSurahId = useCallback((surahId: number) => patch({ surahId }), [patch]);
  const setTrId = useCallback((trId: string) => patch({ trId }), [patch]);
  const setAuId = useCallback((auId: string) => patch({ auId }), [patch]);
  const setReadingMode = useCallback((readingMode: ReadingMode) => patch({ readingMode }), [patch]);
  const setFontSize = useCallback((fontSize: number) => patch({ fontSize }), [patch]);

  return {
    ...session,
    hydrated,
    setSurahId,
    setTrId,
    setAuId,
    setReadingMode,
    setFontSize,
    toggleDarkMode: () => {
      setSession((prev) => {
        const next = { ...prev, darkMode: !prev.darkMode };
        if (hydrated) saveReaderSession(next);
        return next;
      });
    },
    patch,
  };
}
