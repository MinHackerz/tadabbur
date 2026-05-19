"use client";
import { useEffect, useRef, useState } from "react";

/** True once the element has entered (or neared) the viewport — stays true after. */
export function useInView(rootMargin = "240px 0px") {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
}
