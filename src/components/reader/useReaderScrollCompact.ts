"use client";
import { useEffect, useState } from "react";

const COMPACT_THRESHOLD_PX = 60;

/** True when the reader has been scrolled past the surah header (more reading room). */
export function useReaderScrollCompact(resetKey?: string) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setCompact(false);
    const onScroll = () => {
      setCompact(window.scrollY > COMPACT_THRESHOLD_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [resetKey]);

  return compact;
}
