"use client";

import { useState, useEffect } from "react";

interface Props {
  unlockTime: Date;
  onUnlock?: () => void;
  bypassTimer?: boolean;
}

export default function TimerCountdown({ unlockTime, onUnlock, bypassTimer = false }: Props) {
  const [timeRemaining, setTimeRemaining] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    // If timer is bypassed, don't show countdown
    if (bypassTimer) {
      setTimeRemaining(null);
      return;
    }

    function calculateTimeRemaining() {
      const now = new Date().getTime();
      const unlock = new Date(unlockTime).getTime();
      const diff = unlock - now;

      if (diff <= 0) {
        setTimeRemaining(null);
        if (onUnlock) {
          onUnlock();
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining({ hours, minutes, seconds });
    }

    // Calculate immediately
    calculateTimeRemaining();

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [unlockTime, onUnlock, bypassTimer]);

  if (!timeRemaining || bypassTimer) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-accent-subtle/30 to-accent-subtle/10 border border-accent/20 rounded-2xl p-8 text-center backdrop-blur-sm">
      <div className="mb-4">
        <svg className="w-12 h-12 text-accent mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
        </svg>
      </div>
      
      <h3 className="text-[18px] font-semibold text-ink mb-2">
        Next Day Unlocks In
      </h3>
      
      <p className="text-[13px] text-ink-secondary mb-6">
        Take time to reflect on today's lesson before moving forward
      </p>

      <div className="flex items-center justify-center gap-3 mb-4">
        <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl px-5 py-4 min-w-[80px]">
          <div className="text-[32px] font-bold text-accent font-mono leading-none">
            {String(timeRemaining.hours).padStart(2, "0")}
          </div>
          <div className="text-[10px] text-ink-tertiary uppercase tracking-wider mt-2">
            Hours
          </div>
        </div>
        
        <div className="text-[24px] text-ink-tertiary font-bold">:</div>
        
        <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl px-5 py-4 min-w-[80px]">
          <div className="text-[32px] font-bold text-accent font-mono leading-none">
            {String(timeRemaining.minutes).padStart(2, "0")}
          </div>
          <div className="text-[10px] text-ink-tertiary uppercase tracking-wider mt-2">
            Minutes
          </div>
        </div>
        
        <div className="text-[24px] text-ink-tertiary font-bold">:</div>
        
        <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-xl px-5 py-4 min-w-[80px]">
          <div className="text-[32px] font-bold text-accent font-mono leading-none">
            {String(timeRemaining.seconds).padStart(2, "0")}
          </div>
          <div className="text-[10px] text-ink-tertiary uppercase tracking-wider mt-2">
            Seconds
          </div>
        </div>
      </div>

      <div className="text-[12px] text-ink-tertiary">
        Unlocks at {new Date(unlockTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
