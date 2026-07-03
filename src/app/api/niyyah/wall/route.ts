import { NextResponse } from "next/server";
import { prisma } from "@/db";

export async function GET() {
  try {
    const journeys = await prisma.niyyahJourney.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        type: true,
        occasion: true,
        goalValue: true,
        isComplete: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { days: true } },
      },
    });

    const today = new Date().toISOString().slice(0, 10);

    const wallItems = journeys.map((j) => {
      const completionDate = j.updatedAt.toISOString().slice(0, 10);
      const isCompletedToday = j.isComplete && completionDate === today;
      return {
        type: j.type,
        occasion: j.type === "living" ? j.occasion : undefined,
        day: j._count.days,
        total: j.goalValue,
        region: "Community",
        isComplete: j.isComplete,
        isCompletedToday,
      };
    });

    const activeJourneys = wallItems
      .filter((w) => !w.isComplete)
      .slice(0, 6);
    const completedToday = wallItems
      .filter((w) => w.isCompletedToday)
      .slice(0, 2);

    // Fisher–Yates shuffle. The previous `sort(() => Math.random() - 0.5)`
    // produced a biased distribution where items earlier in the array were
    // more likely to land near the top of the result.
    const merged = [...activeJourneys, ...completedToday];
    for (let i = merged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [merged[i], merged[j]] = [merged[j], merged[i]];
    }
    const displayItems = merged.slice(0, 8);

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
