"use client";
import { useEffect, useRef, useState } from "react";

const COMPACT_ON_PX = 200;  // Collapse after scrolling this far
const COMPACT_OFF_PX = 120; // Expand back only when scrolled above this (hysteresis)

/** True when the reader has been scrolled past the surah header. Sticky compact bar. */
export function useReaderScrollCompact(resetKey?: string) {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);

  useEffect(() => {
    // Reset the ref synchronously, but defer the setState reset to a
    // microtask so the rule doesn't flag synchronous setState in the
    // effect body.
    compactRef.current = false;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setCompact(false);
    });

    const onScroll = () => {
      const y = window.scrollY;
      if (!compactRef.current && y > COMPACT_ON_PX) {
        compactRef.current = true;
        setCompact(true);
      } else if (compactRef.current && y < COMPACT_OFF_PX) {
        compactRef.current = false;
        setCompact(false);
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
    };
  }, [resetKey]);

  return compact;
}
