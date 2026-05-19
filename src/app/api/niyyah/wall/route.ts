import { NextResponse } from "next/server";
import { prisma } from "@/db";

export async function GET() {
  try {
    const journeys = await prisma.niyyahJourney.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        type: true,
        occasion: true,
        goalValue: true,
        isComplete: true,
        createdAt: true,
        _count: { select: { days: true } },
      },
    });

    const today = new Date().toISOString().slice(0, 10);

    const wallItems = journeys.map((j: typeof journeys[number]) => {
      const journeyDate = j.createdAt.toISOString().slice(0, 10);
      const isCompletedToday = j.isComplete && journeyDate === today;
      return {
        type: j.type,
        occasion: j.type === "living" ? j.occasion : undefined,
        day: j._count.days,
        total: j.goalValue,
        region: "Community",
        isComplete: isCompletedToday,
      };
    });

    const activeJourneys = wallItems.filter((w: typeof wallItems[number]) => !w.isComplete).slice(0, 6);
    const completedToday = wallItems.filter((w: typeof wallItems[number]) => w.isComplete).slice(0, 2);
    const displayItems = [...activeJourneys, ...completedToday]
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    return NextResponse.json({
      items: displayItems,
      liveCount: activeJourneys.length,
      completedToday: completedToday.length,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("Error fetching amanah wall:", error);
    return NextResponse.json({ items: [], liveCount: 0, completedToday: 0 });
  }
}
