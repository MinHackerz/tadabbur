import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const toIso = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const journeys = await prisma.niyyahJourney.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" },
      include: { days: { orderBy: { date: "asc" } } },
    });

    const result = journeys.map((j) => ({
      v: 1,
      id: j.id,
      type: j.type,
      recipientName: j.recipientName,
      occasion: j.occasion,
      personalDua: j.personalDua,
      goalType: j.goalType,
      goalValue: j.goalValue,
      dailyTarget: j.dailyTarget,
      startDate: toIso(j.startDate),
      targetDate: toIso(j.targetDate),
      completedDays: j.days.map((d) => ({
        date: toIso(d.date),
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
      isActive: j.isActive,
      readerName: j.readerName,
    }));

    return NextResponse.json({ journeys: result });
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error(err);
    return NextResponse.json({ error: "Failed to fetch journeys" }, { status: 500 });
  }
}
