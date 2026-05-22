import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { JourneyType, GoalType } from "@prisma/client";
import { getUserFromSession } from "@/lib/auth-helpers";
import {
  asTrimmedString,
  asOptionalTrimmedString,
  asBoundedInt,
  asIsoDate,
  MAX_SHORT_STRING,
  MAX_LONG_STRING,
  MAX_GOAL_VALUE,
} from "@/lib/validation";

const toIso = (d: Date) => d.toISOString().slice(0, 10);

const VALID_TYPES: ReadonlySet<string> = new Set(Object.values(JourneyType));
const VALID_GOAL_TYPES: ReadonlySet<string> = new Set(Object.values(GoalType));

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const journey = await prisma.niyyahJourney.findFirst({
      where: { userId: user.sub, isActive: true },
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
        dailyTarget: journey.dailyTarget,
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
        isActive: journey.isActive,
        readerName: journey.readerName,
      },
    });
  } catch (error) {
    console.error("[/api/niyyah GET]", error);
    return NextResponse.json({ error: "Failed to fetch journey" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const type = asTrimmedString(body.type, MAX_SHORT_STRING);
    const recipientName = asTrimmedString(body.recipientName, MAX_SHORT_STRING);
    const occasion = asTrimmedString(body.occasion, MAX_SHORT_STRING);
    const personalDua = asTrimmedString(body.personalDua, MAX_LONG_STRING);
    const goalType = asTrimmedString(body.goalType, MAX_SHORT_STRING);
    const goalValue = asBoundedInt(body.goalValue, 1, MAX_GOAL_VALUE);
    const dailyTarget = asBoundedInt(body.dailyTarget, 1, 500) ?? 5;
    const startDate = asIsoDate(body.startDate);
    const targetDate = asIsoDate(body.targetDate);
    const readerName = asOptionalTrimmedString(body.readerName, MAX_SHORT_STRING);

    if (
      !type ||
      !recipientName ||
      !occasion ||
      !personalDua ||
      !goalType ||
      goalValue === null ||
      !startDate ||
      !targetDate
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 },
      );
    }

    if (!VALID_TYPES.has(type) || !VALID_GOAL_TYPES.has(goalType)) {
      return NextResponse.json(
        { error: "Unknown journey type or goal type." },
        { status: 400 },
      );
    }

    if (targetDate.getTime() < startDate.getTime()) {
      return NextResponse.json(
        { error: "targetDate must be on or after startDate." },
        { status: 400 },
      );
    }

    const journey = await prisma.niyyahJourney.create({
      data: {
        userId: user.sub,
        type: type as JourneyType,
        recipientName,
        occasion,
        personalDua,
        goalType: goalType as GoalType,
        goalValue,
        dailyTarget: dailyTarget ?? 5,
        startDate,
        targetDate,
        readerName: readerName ?? null,
      },
    });

    return NextResponse.json(
      {
        journey: {
          ...journey,
          startDate: toIso(journey.startDate),
          targetDate: toIso(journey.targetDate),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[/api/niyyah POST]", error);
    const message = error instanceof Error ? error.message : "Failed to create journey";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const journeyId = asTrimmedString(body.journeyId, MAX_SHORT_STRING);
    if (!journeyId) {
      return NextResponse.json({ error: "Journey ID is required" }, { status: 400 });
    }

    const existing = await prisma.niyyahJourney.findFirst({
      where: { id: journeyId, userId: user.sub },
    });
    if (!existing) return NextResponse.json({ error: "Journey not found" }, { status: 404 });

    // Each numeric field is optional but bounded so a client can't push
    // 9_999_999_999 streak values into the row.
    const currentStreak =
      body.currentStreak == null
        ? existing.currentStreak
        : asBoundedInt(body.currentStreak, 0, 10_000);
    const longestStreak =
      body.longestStreak == null
        ? existing.longestStreak
        : asBoundedInt(body.longestStreak, 0, 10_000);
    if (currentStreak === null || longestStreak === null) {
      return NextResponse.json(
        { error: "Streak values out of range." },
        { status: 400 },
      );
    }

    const lastMercyWeek =
      body.lastMercyWeek == null
        ? existing.lastMercyWeek
        : asOptionalTrimmedString(body.lastMercyWeek, MAX_SHORT_STRING);

    const updated = await prisma.niyyahJourney.update({
      where: { id: journeyId },
      data: {
        currentStreak,
        longestStreak,
        mercyDayUsed:
          typeof body.mercyDayUsed === "boolean"
            ? body.mercyDayUsed
            : existing.mercyDayUsed,
        lastMercyWeek,
        isComplete:
          typeof body.isComplete === "boolean" ? body.isComplete : existing.isComplete,
        isActive:
          typeof body.isActive === "boolean" ? body.isActive : existing.isActive,
      },
    });

    return NextResponse.json({
      journey: {
        ...updated,
        startDate: toIso(updated.startDate),
        targetDate: toIso(updated.targetDate),
      },
    });
  } catch (error) {
    console.error("[/api/niyyah PUT]", error);
    return NextResponse.json({ error: "Failed to update journey" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const journeyId = asTrimmedString(searchParams.get("journeyId"), MAX_SHORT_STRING);
    if (!journeyId) {
      return NextResponse.json({ error: "Journey ID is required" }, { status: 400 });
    }

    const existing = await prisma.niyyahJourney.findFirst({
      where: { id: journeyId, userId: user.sub },
    });
    if (!existing) return NextResponse.json({ error: "Journey not found" }, { status: 404 });

    await prisma.niyyahJourney.delete({ where: { id: journeyId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/api/niyyah DELETE]", error);
    return NextResponse.json({ error: "Failed to delete journey" }, { status: 500 });
  }
}
