"use client";

import { useMemo } from "react";
import { getSacredMoment } from "@/lib/islamicMoments";
import { IconArrowRight } from "@/components/ui/primitives";

interface SacredMomentsProps {
  onOpenSurah: (surahId: number) => void;
}

export default function SacredMoments({ onOpenSurah }: SacredMomentsProps) {
  const moment = useMemo(() => getSacredMoment(), []);

  if (!moment) return null;

  return (
    <article className={`sacred-moment sacred-moment--${moment.tone}`}>
      <div className="sacred-moment__copy">
        <p className="sacred-moment__eyebrow">{moment.subtitle}</p>
        <h3 className="sacred-moment__title">{moment.title}</h3>
        <p className="sacred-moment__detail">{moment.detail}</p>
      </div>
      <button
        type="button"
        onClick={() => onOpenSurah(moment.surahId)}
        className="sacred-moment__cta"
      >
        {moment.cta}
        <IconArrowRight />
      </button>
    </article>
  );
}
