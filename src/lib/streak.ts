/**
 * Streak calculation with industry-standard logic:
 * - Minimum threshold: 5 verses OR 5 minutes to count as a valid day
 * - Mercy day: 1 missed day allowed per streak without breaking it
 * - Streak breaks after 2 consecutive missed days
 */

export interface ReadingDay {
  date: string; // ISO date string (YYYY-MM-DD)
  versesRead: number;
  minutesRead: number;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  mercyDayUsed: boolean;
  lastMercyDate: string | null;
}

// Minimum thresholds to count as a valid reading day
const MIN_VERSES = 5;
const MIN_MINUTES = 5;

/**
 * Check if a day meets the minimum threshold to count toward streak
 */
function isValidReadingDay(day: ReadingDay): boolean {
  return day.versesRead >= MIN_VERSES || day.minutesRead >= MIN_MINUTES;
}

/**
 * Get date string for N days ago
 */
function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Calculate streak with mercy day logic
 * 
 * Rules:
 * 1. Only days meeting minimum threshold count
 * 2. Streak must include today or yesterday to be active
 * 3. One mercy day allowed (1 missed day doesn't break streak)
 * 4. Two consecutive missed days break the streak
 * 5. Mercy day resets after a successful reading day
 */
export function calculateStreak(sessions: ReadingDay[]): StreakResult {
  if (!sessions.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      mercyDayUsed: false,
      lastMercyDate: null,
    };
  }

  // Group sessions by date and sum up verses/minutes
  const dayMap = new Map<string, ReadingDay>();
  for (const session of sessions) {
    const existing = dayMap.get(session.date);
    if (existing) {
      existing.versesRead += session.versesRead;
      existing.minutesRead += session.minutesRead;
    } else {
      dayMap.set(session.date, { ...session });
    }
  }

  // Filter only valid reading days and sort by date (newest first)
  const validDays = Array.from(dayMap.values())
    .filter(isValidReadingDay)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!validDays.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      mercyDayUsed: false,
      lastMercyDate: null,
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = getDaysAgo(1);

  // Check if streak is active (must include today or yesterday)
  const mostRecentDay = validDays[0].date;
  const isActive = mostRecentDay === today || mostRecentDay === yesterday;

  if (!isActive) {
    // Streak is broken, but calculate longest streak from history
    const longestStreak = calculateLongestStreak(validDays);
    return {
      currentStreak: 0,
      longestStreak,
      mercyDayUsed: false,
      lastMercyDate: null,
    };
  }

  // Calculate current streak with mercy day logic
  let currentStreak = 1;
  let mercyDayUsed = false;
  let lastMercyDate: string | null = null;
  let expectedDate = new Date(validDays[0].date);
  expectedDate.setDate(expectedDate.getDate() - 1);

  for (let i = 1; i < validDays.length; i++) {
    const currentDay = validDays[i];
    const currentDate = new Date(currentDay.date);
    const expectedDateStr = expectedDate.toISOString().slice(0, 10);

    if (currentDay.date === expectedDateStr) {
      // Perfect streak continuation
      currentStreak++;
      mercyDayUsed = false; // Reset mercy day after successful read
      lastMercyDate = null;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      // Check if there's a gap
      const daysBetween = Math.floor(
        (expectedDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysBetween === 1 && !mercyDayUsed) {
        // One day gap - use mercy day
        currentStreak++;
        mercyDayUsed = true;
        lastMercyDate = expectedDateStr;
        expectedDate = new Date(currentDay.date);
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        // Gap is too large or mercy already used - streak breaks here
        break;
      }
    }
  }

  const longestStreak = Math.max(currentStreak, calculateLongestStreak(validDays));

  return {
    currentStreak,
    longestStreak,
    mercyDayUsed,
    lastMercyDate,
  };
}

/**
 * Calculate the longest streak in history (without mercy days for simplicity)
 */
function calculateLongestStreak(validDays: ReadingDay[]): number {
  if (!validDays.length) return 0;

  let longest = 1;
  let current = 1;
  let expectedDate = new Date(validDays[0].date);
  expectedDate.setDate(expectedDate.getDate() - 1);

  for (let i = 1; i < validDays.length; i++) {
    const currentDay = validDays[i];
    const expectedDateStr = expectedDate.toISOString().slice(0, 10);

    if (currentDay.date === expectedDateStr) {
      current++;
      longest = Math.max(longest, current);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      // Check for 1-day mercy gap
      const currentDate = new Date(currentDay.date);
      const daysBetween = Math.floor(
        (expectedDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysBetween === 1) {
        // Allow one mercy day
        current++;
        longest = Math.max(longest, current);
        expectedDate = new Date(currentDay.date);
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        // Streak broken
        current = 1;
        expectedDate = new Date(currentDay.date);
        expectedDate.setDate(expectedDate.getDate() - 1);
      }
    }
  }

  return longest;
}

/**
 * Get a user-friendly streak message
 */
export function getStreakMessage(streak: StreakResult, readToday: boolean): string {
  if (streak.currentStreak === 0) {
    return "Start your streak today!";
  }

  if (!readToday) {
    if (streak.mercyDayUsed) {
      return "Mercy day used — read today to continue!";
    }
    return "Read today to extend your streak!";
  }

  if (streak.currentStreak === 1) {
    return "Great start! Keep it going tomorrow.";
  }

  if (streak.mercyDayUsed) {
    return `${streak.currentStreak} days (mercy used) — keep going!`;
  }

  if (streak.currentStreak >= 30) {
    return `${streak.currentStreak} days — mashaAllah, incredible dedication!`;
  }

  if (streak.currentStreak >= 7) {
    return `${streak.currentStreak} days — you're building a strong habit!`;
  }

  return `${streak.currentStreak} days — barakallahu feek!`;
}
