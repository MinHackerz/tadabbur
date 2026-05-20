import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

const toIso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Auto-sync niyyah journey progress based on actual reading sessions.
 * This endpoint checks if today's reading portion has been completed
 * and automatically marks the day in the journey.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get the active journey
    const journey = await prisma.niyyahJourney.findFirst({
      where: { userId: user.sub, isActive: true },
      orderBy: { createdAt: "desc" },
      include: { days: { orderBy: { date: "asc" } } },
    });

    if (!journey) {
      return NextResponse.json({ synced: false, message: "No active journey" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toIso(today);

    // Check if today is already marked complete
    const alreadyMarked = journey.days.some((d) => toIso(d.date) === todayStr);
    if (alreadyMarked) {
      return NextResponse.json({ synced: false, message: "Today already marked" });
    }

    // Get today's reading sessions
    const todaySessions = await prisma.readingSession.findMany({
      where: {
        userId: user.sub,
        date: today,
      },
    });

    if (todaySessions.length === 0) {
      return NextResponse.json({ synced: false, message: "No reading activity today" });
    }

    // Calculate total verses read today
    const totalVersesRead = todaySessions.reduce((sum, s) => sum + s.versesRead, 0);
    
    // Get verse completions for today to determine the range
    const todayCompletions = await prisma.verseCompletion.findMany({
      where: {
        userId: user.sub,
        sessionDate: today,
      },
      orderBy: { verseNumber: "asc" },
    });

    if (todayCompletions.length === 0) {
      return NextResponse.json({ synced: false, message: "No verse completions today" });
    }

    // Determine the surah range and verse keys
    const surahIds = new Set(todayCompletions.map((c) => c.surahId));
    const firstCompletion = todayCompletions[0];
    const lastCompletion = todayCompletions[todayCompletions.length - 1];

    let surahRange: string;
    if (surahIds.size === 1) {
      // Single surah
      const surahId = firstCompletion.surahId;
      surahRange = `Surah ${surahId}`;
    } else {
      // Multiple surahs
      const minSurah = Math.min(...Array.from(surahIds));
      const maxSurah = Math.max(...Array.from(surahIds));
      surahRange = `Surah ${minSurah}-${maxSurah}`;
    }

    const startKey = firstCompletion.verseKey;
    const endKey = lastCompletion.verseKey;

    // Calculate expected verses for today's portion
    // For now, we'll use a simple heuristic: if user read at least 10 verses, consider it a valid day
    const MIN_VERSES_FOR_DAY = 10;
    
    if (totalVersesRead < MIN_VERSES_FOR_DAY) {
      return NextResponse.json({ 
        synced: false, 
        message: `Need at least ${MIN_VERSES_FOR_DAY} verses (read ${totalVersesRead})` 
      });
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

    // Calculate streak
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("[/api/niyyah/sync POST]", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to sync journey", detail: msg }, { status: 500 });
  }
}
