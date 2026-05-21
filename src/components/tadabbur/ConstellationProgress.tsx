"use client";

import { useState } from "react";

import { DAILY_ANGLES } from "@/lib/tadabbur-data";

interface Props {
  completedDays: number[];
  currentDay: number;
  onDayClick: (day: number) => void;
  lastCompletedAt?: Date | null;
  timerEnabled?: boolean;
}

export default function ConstellationProgress({ completedDays, currentDay, onDayClick, lastCompletedAt, timerEnabled = true }: Props) {
  const totalDays = 15;
  const stars = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Lazy state initialiser runs once. The react-hooks/purity rule allows
  // Math.random() inside useState initialisers but not in render or useMemo.
  const [starfield] = useState(() =>
    Array.from({ length: 30 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      opacity: Math.random() * 0.5 + 0.3,
    })),
  );

  // Check if a day is locked (24-hour timer)
  function isDayLocked(day: number): boolean {
    // If timer is disabled, no days are locked
    if (!timerEnabled) return false;
    
    if (day === 1) return false; // Day 1 is never locked
    if (!completedDays.includes(day - 1)) return true; // Previous day not completed
    if (!lastCompletedAt) return false;
    
    const now = new Date().getTime();
    const lastCompleted = new Date(lastCompletedAt).getTime();
    const hoursSinceCompletion = (now - lastCompleted) / (1000 * 60 * 60);
    
    return hoursSinceCompletion < 24;
  }

  return (
    <div className="bg-gradient-to-b from-[#0A1628] to-[#1C3A2F] dark:from-[#050a0f] dark:to-[#0d1a15] rounded-2xl p-8 relative overflow-hidden border border-border/50">
      {/* Starfield background */}
      <div className="absolute inset-0 opacity-20">
        {starfield.map((s, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: s.left,
              top: s.top,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>

      {/* Constellation */}
      <svg viewBox="0 0 1000 300" className="w-full h-auto relative z-10">
        {/* Draw connecting lines for completed days */}
        {stars.slice(0, -1).map((day, i) => {
          const isCompleted = completedDays.includes(day);
          const nextCompleted = completedDays.includes(day + 1);
          if (!isCompleted || !nextCompleted) return null;

          const x1 = 50 + (i * 900) / (totalDays - 1);
          const y1 = 150 + Math.sin((i * Math.PI) / (totalDays - 1)) * 80;
          const x2 = 50 + ((i + 1) * 900) / (totalDays - 1);
          const y2 = 150 + Math.sin(((i + 1) * Math.PI) / (totalDays - 1)) * 80;

          return (
            <line
              key={`line-${day}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#C9A84C"
              strokeWidth="1"
              opacity="0.4"
            />
          );
        })}

        {/* Draw stars */}
        {stars.map((day, i) => {
          const x = 50 + (i * 900) / (totalDays - 1);
          const y = 150 + Math.sin((i * Math.PI) / (totalDays - 1)) * 80;
          const isCompleted = completedDays.includes(day);
          const isCurrent = day === currentDay;
          const isLocked = isDayLocked(day);
          const isFuture = day > currentDay;
          const angle = DAILY_ANGLES[day - 1];

          return (
            <g key={day}>
              {/* Star circle */}
              <circle
                cx={x}
                cy={y}
                r={isCurrent ? 12 : 8}
                fill={isCompleted ? "#C9A84C" : isFuture ? "transparent" : "#8C7E6E"}
                stroke={isCurrent ? "#C9A84C" : isLocked ? "#6B7280" : "#8C7E6E"}
                strokeWidth={isCurrent ? 2 : 1}
                strokeDasharray={isLocked ? "2,2" : "none"}
                className={`cursor-pointer transition-all ${isCurrent ? "animate-pulse" : ""} ${isLocked ? "opacity-50" : ""}`}
                onClick={() => !isLocked && onDayClick(day)}
                style={{ filter: isCompleted ? "drop-shadow(0 0 8px #C9A84C)" : "none" }}
              />

              {/* Lock icon for locked days */}
              {isLocked && !isCompleted && (
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6B7280"
                  className="pointer-events-none"
                >
                  🔒
                </text>
              )}

              {/* Day number for unlocked days */}
              {!isLocked && (
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isCompleted || isCurrent ? "#1C1C1E" : "#F7F3EC"}
                  fontFamily="var(--font-space-mono)"
                  className="pointer-events-none"
                >
                  {day}
                </text>
              )}

              {/* Tooltip on hover */}
              <title>
                Day {day}: {angle.angleName}
                {isCompleted ? " ✓" : isCurrent ? " (Today)" : isLocked ? " 🔒 Locked" : ""}
              </title>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 text-[12px] text-white/70">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-tadabbur-gold" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border border-tadabbur-gold animate-pulse" />
          <span>Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border border-white/30" />
          <span>Upcoming</span>
        </div>
      </div>
    </div>
  );
}
