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
 * This is intentionally idempotent: if today is already marked, it returns early.
 * Extracted from the /api/niyyah/sync route so that other server-side code paths
 * (e.g. /api/verse-progress) can invoke it in-process.
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

  // Get today's reading sessions
  const todaySessions = await prisma.readingSession.findMany({
    where: { userId, date: today },
  });

  if (todaySessions.length === 0) {
    return { synced: false, message: "No reading activity today" };
  }

  // Calculate total verses read today
  const totalVersesRead = todaySessions.reduce((sum, s) => sum + s.versesRead, 0);

  // Get verse completions for today to determine the range
  const todayCompletions = await prisma.verseCompletion.findMany({
    where: { userId, sessionDate: today },
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

  if (totalVersesRead < 1) {
    return { synced: false, message: "No verses completed today" };
  }

  // Create the journey day
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

  // Calculate Niyyah streak (consecutive days with completed portions)
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
