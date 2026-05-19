import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

const toIso = (d: Date) => d.toISOString().slice(0, 10);

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { journeyId, date, versesRead, surahRange, startKey, endKey, reflection, isMercy } = body;

    if (!journeyId || !date || !versesRead || !surahRange || !startKey || !endKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const journey = await prisma.niyyahJourney.findFirst({
      where: { id: journeyId, userId: user.sub },
    });
    if (!journey) return NextResponse.json({ error: "Journey not found" }, { status: 404 });

    const day = await prisma.niyyahJourneyDay.create({
      data: {
        journeyId,
        date: new Date(date),
        versesRead,
        surahRange,
        startKey,
        endKey,
        reflection: reflection ?? null,
        isMercy: isMercy ?? false,
      },
    });

    return NextResponse.json({ day: { ...day, date: toIso(day.date) } }, { status: 201 });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return NextResponse.json({ error: "Failed to add day" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { dayId, journeyId, reflection } = body;

    if (!dayId || !journeyId) {
      return NextResponse.json({ error: "Day ID and Journey ID are required" }, { status: 400 });
    }

    const journey = await prisma.niyyahJourney.findFirst({
      where: { id: journeyId, userId: user.sub },
    });
    if (!journey) return NextResponse.json({ error: "Journey not found" }, { status: 404 });

    const updated = await prisma.niyyahJourneyDay.update({
      where: { id: dayId },
      data: { reflection: reflection ?? null },
    });

    return NextResponse.json({ day: { ...updated, date: toIso(updated.date) } });
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error(error);
    return NextResponse.json({ error: "Failed to update day" }, { status: 500 });
  }
}
