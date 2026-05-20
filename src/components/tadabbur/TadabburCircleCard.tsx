"use client";

import { useVerseData } from "@/hooks/useVerseData";

interface Circle {
  id: string;
  verseKey: string;
  hijriMonth: string;
  hijriYear: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  participantCount: number;
  dayProgress: Record<number, number>;
  userProgress: any | null;
}

interface Props {
  circle: Circle;
  onJoin: (circleId: string) => void;
  onView: (circle: Circle) => void;
  onViewDay: (circle: Circle, day: number) => void;
  isLoggedIn?: boolean;
}

export default function TadabburCircleCard({ circle, onJoin, onView, onViewDay, isLoggedIn = true }: Props) {
  const { verse, loading } = useVerseData(circle.verseKey);
  const hasJoined = !!circle.userProgress;
  const completedDays = circle.userProgress?.completedDays || [];
  const currentDay = circle.userProgress?.currentDay || 1;
  const isComplete = circle.userProgress?.isComplete || false;

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 hover:border-accent/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-ink-tertiary font-medium mb-1">
            {circle.hijriMonth} {circle.hijriYear}
          </div>
          <div className="text-[15px] font-semibold text-ink">
            {circle.verseKey} · {circle.totalDays} Days
          </div>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-ink-tertiary">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {circle.participantCount}
        </div>
      </div>

      {/* Verse Preview */}
      {loading ? (
        <div className="bg-surface-secondary rounded-xl p-4 mb-4">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin mx-auto" />
        </div>
      ) : verse ? (
        <div className="bg-surface-secondary rounded-xl p-4 mb-4">
          <div className="font-amiri text-[20px] text-warm mb-2 text-right" dir="rtl">
            {verse.arabic.slice(0, 100)}...
          </div>
          <div className="text-[12px] text-ink-secondary italic">
            {verse.translation.slice(0, 150)}...
          </div>
        </div>
      ) : null}

      {/* Progress or Join Button */}
      {hasJoined ? (
        <div className="space-y-3">
          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-[12px] mb-2">
              <span className="text-ink-secondary">
                {isComplete ? "Completed!" : `Day ${currentDay} of ${circle.totalDays}`}
              </span>
              <span className="text-accent font-medium">
                {completedDays.length}/{circle.totalDays}
              </span>
            </div>
            <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${(completedDays.length / circle.totalDays) * 100}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => onView(circle)}
              className="flex-1 bg-accent hover:bg-accent-hover text-white py-2 px-4 rounded-lg text-[13px] font-medium transition-colors"
            >
              {isComplete ? "Review Journey" : "Continue"}
            </button>
            {completedDays.length > 0 && (
              <button
                onClick={() => onViewDay(circle, completedDays[completedDays.length - 1])}
                className="bg-surface-secondary hover:bg-surface border border-border text-ink-secondary hover:text-ink py-2 px-4 rounded-lg text-[13px] font-medium transition-colors"
              >
                View Last Day
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => onJoin(circle.id)}
          className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-xl font-medium text-[14px] transition-colors"
        >
          {isLoggedIn ? "Join This Circle" : "Sign in to Join"}
        </button>
      )}
    </div>
  );
}
