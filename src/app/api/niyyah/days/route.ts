import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";
import {
  asTrimmedString,
  asOptionalTrimmedString,
  asBoundedInt,
  asIsoDate,
  parseVerseKeyStrict,
  MAX_SHORT_STRING,
  MAX_MEDIUM_STRING,
  MAX_VERSES_PER_DAY,
} from "@/lib/validation";

const toIso = (d: Date) => d.toISOString().slice(0, 10);

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const journeyId = asTrimmedString(body.journeyId, MAX_SHORT_STRING);
    const date = asIsoDate(body.date);
    // `versesRead` is required and must be a non-negative integer. The old
    // `!versesRead` check rejected the legitimate value `0` and also accepted
    // arbitrary strings — both gone.
    const versesRead = asBoundedInt(body.versesRead, 0, MAX_VERSES_PER_DAY);
    const surahRange = asTrimmedString(body.surahRange, MAX_SHORT_STRING);
    const startKey = parseVerseKeyStrict(body.startKey);
    const endKey = parseVerseKeyStrict(body.endKey);
    const reflection = asOptionalTrimmedString(body.reflection, MAX_MEDIUM_STRING);
    const isMercy = body.isMercy === true;

    if (
      !journeyId ||
      !date ||
      versesRead === null ||
      !surahRange ||
      !startKey ||
      !endKey
    ) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 },
      );
    }

    const journey = await prisma.niyyahJourney.findFirst({
      where: { id: journeyId, userId: user.sub },
    });
    if (!journey) return NextResponse.json({ error: "Journey not found" }, { status: 404 });

    const day = await prisma.niyyahJourneyDay.create({
      data: {
        journeyId,
        date,
        versesRead,
        surahRange,
        startKey: startKey.verseKey,
        endKey: endKey.verseKey,
        reflection,
        isMercy,
      },
    });

    // Check if journey should be marked complete
    const totalDays = await prisma.niyyahJourneyDay.count({
      where: { journeyId },
    });

    if (totalDays >= journey.goalValue && !journey.isComplete) {
      await prisma.niyyahJourney.update({
        where: { id: journeyId },
        data: { isComplete: true },
      });
    }

    return NextResponse.json({ day: { ...day, date: toIso(day.date) } }, { status: 201 });
  } catch (error) {
    console.error("[/api/niyyah/days POST]", error);
    return NextResponse.json({ error: "Failed to add day" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const dayId = asTrimmedString(body.dayId, MAX_SHORT_STRING);
    const journeyId = asTrimmedString(body.journeyId, MAX_SHORT_STRING);
    const reflection = asOptionalTrimmedString(body.reflection, MAX_MEDIUM_STRING);

    if (!dayId || !journeyId) {
      return NextResponse.json(
        { error: "Day ID and Journey ID are required" },
        { status: 400 },
      );
    }

    const journey = await prisma.niyyahJourney.findFirst({
      where: { id: journeyId, userId: user.sub },
    });
    if (!journey) return NextResponse.json({ error: "Journey not found" }, { status: 404 });

    // Confirm the day belongs to this journey before updating it.
    const existingDay = await prisma.niyyahJourneyDay.findFirst({
      where: { id: dayId, journeyId },
    });
    if (!existingDay) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    const updated = await prisma.niyyahJourneyDay.update({
      where: { id: dayId },
      data: { reflection },
    });

    return NextResponse.json({ day: { ...updated, date: toIso(updated.date) } });
  } catch (error) {
    console.error("[/api/niyyah/days PUT]", error);
    return NextResponse.json({ error: "Failed to update day" }, { status: 500 });
  }
}
