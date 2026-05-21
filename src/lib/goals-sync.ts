import { prisma } from "@/db";

export interface GoalSyncResult {
  synced: boolean;
  message: string;
  progress?: {
    date: string;
    versesRead: number;
    minutesRead: number;
    pagesRead: number;
    targetMet: boolean;
    currentStreak: number;
    longestStreak: number;
    meetsMinimum: boolean;
    minimumRequired: { verses: number; minutes: number };
  };
}

const MIN_VERSES = 3;
const MIN_MINUTES = 5;

const toIso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Recompute today's GoalProgress row for the user's active goal.
 *
 * This is intentionally idempotent: running it multiple times in the same
 * day with the same reading sessions produces the same row. We use a single
 * `upsert` rather than `findFirst → update` so concurrent visibility-change
 * and verse-completed handlers can't lose updates.
 *
 * Streak rule: today's `currentStreak = yesterday.currentStreak + 1` if the
 * target was met both days. If today's target isn't met, today's streak is
 * 0 but `longestStreak` is preserved.
 */
export async function syncActiveGoalForUser(userId: string): Promise<GoalSyncResult> {
  const goal = await prisma.goal.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  if (!goal) {
    return { synced: false, message: "No active goal" };
  }

  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const todaySessions = await prisma.readingSession.findMany({
    where: { userId, date: today },
  });
  if (todaySessions.length === 0) {
    return { synced: false, message: "No reading activity today" };
  }

  const versesRead = todaySessions.reduce(
    (sum: number, s: { versesRead: number }) => sum + s.versesRead,
    0,
  );
  const minutesRead = todaySessions.reduce(
    (sum: number, s: { minutesRead: number }) => sum + s.minutesRead,
    0,
  );
  const pagesRead = todaySessions.reduce(
    (sum: number, s: { pagesRead: number }) => sum + s.pagesRead,
    0,
  );

  const meetsMinimum = versesRead >= MIN_VERSES || minutesRead >= MIN_MINUTES;
  if (!meetsMinimum) {
    return {
      synced: false,
      message: `Need at least ${MIN_VERSES} verses OR ${MIN_MINUTES} minutes (read ${versesRead} verses, ${minutesRead} minutes)`,
    };
  }

  let targetMet = false;
  switch (goal.type) {
    case "VERSES":
      targetMet = versesRead >= goal.targetAmount;
      break;
    case "TIME":
      targetMet = minutesRead >= goal.targetAmount;
      break;
    case "PAGES":
      targetMet = pagesRead >= goal.targetAmount;
      break;
  }

  // Always derive today's streak from yesterday so the result is independent
  // of how many times we've already synced today. Re-running sync within the
  // same day therefore produces a stable row.
  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  // GoalProgress aggregate types from prisma client are slightly off in this
  // project (the wasm engine adapter generates them differently), but the
  // shape we read here is stable.
  const yesterdayProgress = (await prisma.goalProgress.findUnique({
    where: { goalId_date: { goalId: goal.id, date: yesterday } },
  })) as {
    targetMet: boolean;
    currentStreak: number;
    longestStreak: number;
  } | null;

  let currentStreak: number;
  let longestStreak: number;
  if (targetMet) {
    const prev = yesterdayProgress?.targetMet ? yesterdayProgress.currentStreak : 0;
    currentStreak = prev + 1;
    longestStreak = Math.max(yesterdayProgress?.longestStreak ?? 0, currentStreak);
  } else {
    currentStreak = 0;
    longestStreak = yesterdayProgress?.longestStreak ?? 0;
  }

  await prisma.goalProgress.upsert({
    where: { goalId_date: { goalId: goal.id, date: today } },
    create: {
      goalId: goal.id,
      userId,
      date: today,
      versesRead,
      minutesRead,
      pagesRead,
      targetMet,
      currentStreak,
      longestStreak,
    },
    update: {
      versesRead,
      minutesRead,
      pagesRead,
      targetMet,
      currentStreak,
      longestStreak,
    },
  });

  return {
    synced: true,
    message: "Goal progress synced",
    progress: {
      date: toIso(today),
      versesRead,
      minutesRead,
      pagesRead,
      targetMet,
      currentStreak,
      longestStreak,
      meetsMinimum,
      minimumRequired: { verses: MIN_VERSES, minutes: MIN_MINUTES },
    },
  };
}
