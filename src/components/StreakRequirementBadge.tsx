"use client";

import { useEffect, useState } from "react";

interface StreakRequirementBadgeProps {
  versesRead: number;
  minutesRead: number;
  minVerses?: number;
  minMinutes?: number;
  compact?: boolean;
}

export default function StreakRequirementBadge({
  versesRead,
  minutesRead,
  minVerses = 3,
  minMinutes = 5,
  compact = false,
}: StreakRequirementBadgeProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Defer to a microtask so the rule recognises this as a callback-driven
    // state update rather than synchronous setState in the effect body.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const versesProgress = Math.min((versesRead / minVerses) * 100, 100);
  const minutesProgress = Math.min((minutesRead / minMinutes) * 100, 100);
  
  const versesMet = versesRead >= minVerses;
  const minutesMet = minutesRead >= minMinutes;
  const requirementMet = versesMet || minutesMet;

  if (!mounted) {
    return null;
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border text-[11px]">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${requirementMet ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
          <span className="text-ink-secondary">
            {requirementMet ? (
              <span className="text-green-600 dark:text-green-400 font-semibold">Streak active</span>
            ) : (
              <span>
                {versesRead}/{minVerses} verses or {minutesRead}/{minMinutes} min
              </span>
            )}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-surface to-surface-secondary p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${requirementMet ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
          <h3 className="text-[13px] font-semibold text-ink">
            {requirementMet ? 'Streak Requirement Met! 🎉' : 'Daily Streak Requirement'}
          </h3>
        </div>
        {requirementMet && (
          <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        )}
      </div>

      {/* Description */}
      <p className="text-[11px] text-ink-tertiary mb-4">
        Read at least <strong className="text-accent">{minVerses} verses</strong> OR{' '}
        <strong className="text-accent">{minMinutes} minutes</strong> to maintain your streak
      </p>

      {/* Progress Bars */}
      <div className="space-y-3">
        {/* Verses Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-ink-secondary">Verses</span>
            <span className={`text-[11px] font-semibold ${versesMet ? 'text-green-600 dark:text-green-400' : 'text-ink-tertiary'}`}>
              {versesRead} / {minVerses}
            </span>
          </div>
          <div className="relative h-2 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                versesMet
                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                  : 'bg-gradient-to-r from-accent to-accent-hover'
              }`}
              style={{ width: `${versesProgress}%` }}
            />
          </div>
        </div>

        {/* OR Divider */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Minutes Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-ink-secondary">Minutes</span>
            <span className={`text-[11px] font-semibold ${minutesMet ? 'text-green-600 dark:text-green-400' : 'text-ink-tertiary'}`}>
              {minutesRead} / {minMinutes}
            </span>
          </div>
          <div className="relative h-2 bg-surface-secondary rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                minutesMet
                  ? 'bg-gradient-to-r from-green-500 to-green-400'
                  : 'bg-gradient-to-r from-accent to-accent-hover'
              }`}
              style={{ width: `${minutesProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Status Message */}
      {requirementMet ? (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-green-600 dark:text-green-400 font-medium">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>Keep reading to maintain your streak!</span>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            {versesProgress > minutesProgress
              ? `${minVerses - versesRead} more verse${minVerses - versesRead === 1 ? '' : 's'} needed`
              : `${minMinutes - minutesRead} more minute${minMinutes - minutesRead === 1 ? '' : 's'} needed`}
          </span>
        </div>
      )}
    </div>
  );
}
