import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { niyyahJourneys, niyyahJourneyDays } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/niyyah/all
 * Returns all journeys for the current user (active + completed), with their days.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const journeys = await db
      .select()
      .from(niyyahJourneys)
      .where(eq(niyyahJourneys.userId, user.sub))
      .orderBy(desc(niyyahJourneys.createdAt));

    const result = await Promise.all(
      journeys.map(async (j) => {
        const days = await db
          .select()
          .from(niyyahJourneyDays)
          .where(eq(niyyahJourneyDays.journeyId, j.id))
          .orderBy(niyyahJourneyDays.date);

        return {
          v: 1,
          id: j.id,
          type: j.type,
          recipientName: j.recipientName,
          occasion: j.occasion,
          personalDua: j.personalDua,
          goalType: j.goalType,
          goalValue: j.goalValue,
          startDate: j.startDate,
          targetDate: j.targetDate,
          completedDays: days.map((d) => ({
            date: d.date,
            versesRead: d.versesRead,
            surahRange: d.surahRange,
            startKey: d.startKey,
            endKey: d.endKey,
            reflection: d.reflection,
            isMercy: d.isMercy,
          })),
          currentStreak: j.currentStreak,
          longestStreak: j.longestStreak,
          mercyDayUsed: j.mercyDayUsed,
          lastMercyWeek: j.lastMercyWeek,
          isComplete: j.isComplete,
          readerName: j.readerName,
        };
      }),
    );

    return NextResponse.json({ journeys: result });
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error(err);
    return NextResponse.json({ error: "Failed to fetch journeys" }, { status: 500 });
  }
}
