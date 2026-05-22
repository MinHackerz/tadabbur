import { prisma } from "@/db";

export interface NiyyahSyncResult {
  synced: boolean;
  message: string;
  day?: {
    date: string;
    versesRead: number;
    surahRange: string;
    startKey: string;
    endKey: string;
  };
  currentStreak?: number;
  longestStreak?: number;
  isComplete?: boolean;
}

const toIso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Sync the active niyyah journey for a user based on today's reading sessions.
 *
 * The niyyah streak is strict: a day only counts if the user has read at
 * least `dailyTarget` verses. If they miss a day, the streak resets to 0.
 *
 * Sequential reading: each day advances by exactly `dailyTarget` verses
 * regardless of how many extra the user read. This keeps the schedule
 * predictable.
 *
 * This is intentionally idempotent: if today is already marked, it returns early.
 */
export async function syncNiyyahJourneyForUser(userId: string): Promise<NiyyahSyncResult> {
  // Get the active journey
  const journey = await prisma.niyyahJourney.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: { days: { orderBy: { date: "asc" } } },
  });

  if (!journey) {
    return { synced: false, message: "No active journey" };
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayStr = toIso(today);

  // Check if today is already marked complete
  const alreadyMarked = journey.days.some((d) => toIso(d.date) === todayStr);
  if (alreadyMarked) {
    return { synced: false, message: "Today already marked" };
  }

  // Get today's reading sessions (only niyyah-sourced)
  const todaySessions = await prisma.readingSession.findMany({
    where: { userId, date: today, source: "niyyah" },
  });

  if (todaySessions.length === 0) {
    return { synced: false, message: "No niyyah reading activity today" };
  }

  // Calculate total verses read today
  const totalVersesRead = todaySessions.reduce((sum, s) => sum + s.versesRead, 0);

  // Check if the user met their daily target
  const dailyTarget = journey.dailyTarget || 5;
  if (totalVersesRead < dailyTarget) {
    return {
      synced: false,
      message: `Need at least ${dailyTarget} verses to complete today's target (read ${totalVersesRead})`,
    };
  }

  // Get verse completions for today to determine the range (only niyyah-sourced)
  const todayCompletions = await prisma.verseCompletion.findMany({
    where: { userId, sessionDate: today, source: "niyyah" },
    orderBy: { verseNumber: "asc" },
  });

  if (todayCompletions.length === 0) {
    return { synced: false, message: "No verse completions today" };
  }

  // Determine the surah range and verse keys
  const surahIds = new Set(todayCompletions.map((c) => c.surahId));
  const firstCompletion = todayCompletions[0];
  const lastCompletion = todayCompletions[todayCompletions.length - 1];

  let surahRange: string;
  if (surahIds.size === 1) {
    surahRange = `Surah ${firstCompletion.surahId}`;
  } else {
    const minSurah = Math.min(...Array.from(surahIds));
    const maxSurah = Math.max(...Array.from(surahIds));
    surahRange = `Surah ${minSurah}-${maxSurah}`;
  }

  const startKey = firstCompletion.verseKey;
  const endKey = lastCompletion.verseKey;

  // Create the journey day (only created when daily target is met)
  const newDay = await prisma.niyyahJourneyDay.create({
    data: {
      journeyId: journey.id,
      date: today,
      versesRead: totalVersesRead,
      surahRange,
      startKey,
      endKey,
      reflection: null,
      isMercy: false,
    },
  });

  // Update journey metadata
  const totalDays = journey.days.length + 1;
  const isComplete = totalDays >= journey.goalValue;

  // Calculate niyyah streak (strict: consecutive days only, no mercy)
  const allDays = [...journey.days, newDay].sort((a, b) => a.date.getTime() - b.date.getTime());
  let currentStreak = 1;
  let longestStreak = journey.longestStreak;

  for (let i = allDays.length - 2; i >= 0; i--) {
    const current = new Date(allDays[i + 1].date);
    const previous = new Date(allDays[i].date);
    const diffDays = Math.floor((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
    } else {
      // Any gap > 1 day breaks the streak (strict, no mercy days)
      break;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  await prisma.niyyahJourney.update({
    where: { id: journey.id },
    data: {
      currentStreak,
      longestStreak,
      isComplete,
    },
  });

  return {
    synced: true,
    message: "Journey progress synced",
    day: {
      date: todayStr,
      versesRead: totalVersesRead,
      surahRange,
      startKey,
      endKey,
    },
    currentStreak,
    longestStreak,
    isComplete,
  };
}
