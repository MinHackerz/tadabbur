"use client";

import { useEffect, useState } from "react";

interface Reflection {
  day: number;
  content: string;
  region: string | null;
  createdAt: string;
}

interface Props {
  circleId: string;
}

export default function CommunityCircle({ circleId }: Props) {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline the fetch in the effect (with a cancellation flag) so state
  // updates only happen via .then callbacks — react-hooks/set-state-in-effect
  // flags synchronous setState in the effect body, but allows it inside
  // callbacks of microtasks/promises.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/tadabbur/journal?circleId=${circleId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setReflections(data.reflections || []);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load reflections:", error);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [circleId]);

  if (loading) {
    return (
      <div className="bg-white border border-border rounded-2xl p-8 text-center">
        <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (reflections.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
        <p className="text-[14px] text-ink-tertiary">
          No community reflections yet. Be the first to share your journey.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
      <div className="text-[13px] text-ink-tertiary mb-6">
        {reflections.length} readers sharing their reflections this month
      </div>
      <div className="space-y-4">
        {reflections.slice(0, 5).map((reflection, i) => (
          <div key={i} className="border-l-2 border-warm pl-4 py-2">
            <p className="text-[14px] text-ink mb-2 font-niyyah-display italic">
              &quot;{reflection.content}&quot;
            </p>
            <div className="text-[12px] text-ink-tertiary">
              {reflection.region && `${reflection.region} · `}Day {reflection.day}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
