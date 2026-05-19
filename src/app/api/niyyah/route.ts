import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

const toIso = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const journey = await prisma.niyyahJourney.findFirst({
      where: { userId: user.sub },
      orderBy: { createdAt: "desc" },
      include: { days: { orderBy: { date: "asc" } } },
    });

    if (!journey) return NextResponse.json({ journey: null });

    return NextResponse.json({
      journey: {
        v: 1,
        id: journey.id,
        type: journey.type,
        recipientName: journey.recipientName,
        occasion: journey.occasion,
        personalDua: journey.personalDua,
        goalType: journey.goalType,
        goalValue: journey.goalValue,
        startDate: toIso(journey.startDate),
        targetDate: toIso(journey.targetDate),
        completedDays: journey.days.map((d) => ({
          date: toIso(d.date),
          versesRead: d.versesRead,
          surahRange: d.surahRange,
          startKey: d.startKey,
          endKey: d.endKey,
          reflection: d.reflection,
          isMercy: d.isMercy,
        })),
        currentStreak: journey.currentStreak,
        longestStreak: journey.longestStreak,
        mercyDayUsed: journey.mercyDayUsed,
        lastMercyWeek: journey.lastMercyWeek,
        isComplete: journey.isComplete,
        readerName: journey.readerName,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return NextResponse.json({ error: "Failed to fetch journey" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { type, recipientName, occasion, personalDua, goalType, goalValue, startDate, targetDate, readerName } = body;

    if (!type || !recipientName || !occasion || !personalDua || !goalType || !goalValue || !startDate || !targetDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const journey = await prisma.niyyahJourney.create({
      data: {
        userId: user.sub,
        type,
        recipientName,
        occasion,
        personalDua,
        goalType,
        goalValue,
        startDate: new Date(startDate),
        targetDate: new Date(targetDate),
        readerName: readerName ?? null,
      },
    });

    return NextResponse.json({
      journey: { ...journey, startDate: toIso(journey.startDate), targetDate: toIso(journey.targetDate) },
    }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return NextResponse.json({ error: "Failed to create journey" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { journeyId, currentStreak, longestStreak, mercyDayUsed, lastMercyWeek, isComplete } = body;

    if (!journeyId) return NextResponse.json({ error: "Journey ID is required" }, { status: 400 });

    const existing = await prisma.niyyahJourney.findFirst({
      where: { id: journeyId, userId: user.sub },
    });
    if (!existing) return NextResponse.json({ error: "Journey not found" }, { status: 404 });

    const updated = await prisma.niyyahJourney.update({
      where: { id: journeyId },
      data: {
        currentStreak: currentStreak ?? existing.currentStreak,
        longestStreak: longestStreak ?? existing.longestStreak,
        mercyDayUsed: mercyDayUsed ?? existing.mercyDayUsed,
        lastMercyWeek: lastMercyWeek ?? existing.lastMercyWeek,
        isComplete: isComplete ?? existing.isComplete,
      },
    });

    return NextResponse.json({
      journey: { ...updated, startDate: toIso(updated.startDate), targetDate: toIso(updated.targetDate) },
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return NextResponse.json({ error: "Failed to update journey" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const journeyId = searchParams.get("journeyId");
    if (!journeyId) return NextResponse.json({ error: "Journey ID is required" }, { status: 400 });

    const existing = await prisma.niyyahJourney.findFirst({
      where: { id: journeyId, userId: user.sub },
    });
    if (!existing) return NextResponse.json({ error: "Journey not found" }, { status: 404 });

    await prisma.niyyahJourney.delete({ where: { id: journeyId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return NextResponse.json({ error: "Failed to delete journey" }, { status: 500 });
  }
}
