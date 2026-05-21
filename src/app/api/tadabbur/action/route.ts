import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";
import {
  asTrimmedString,
  asOptionalTrimmedString,
  asBoundedInt,
  MAX_SHORT_STRING,
  MAX_MEDIUM_STRING,
} from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const progressId = asTrimmedString(body.progressId, MAX_SHORT_STRING);
    const day = asBoundedInt(body.day, 1, 60);
    const completed = body.completed === true;
    const note = asOptionalTrimmedString(body.note, MAX_MEDIUM_STRING);

    if (!progressId || day === null) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 },
      );
    }

    // Verify ownership
    const progress = await prisma.tadabburUserProgress.findFirst({
      where: { id: progressId, userId: user.sub },
    });

    if (!progress) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    }

    // Create or update action
    const action = await prisma.tadabburAction.upsert({
      where: {
        progressId_day: {
          progressId,
          day,
        },
      },
      create: {
        progressId,
        day,
        completed,
        note,
      },
      update: {
        completed,
        note,
      },
    });

    return NextResponse.json({ action });
  } catch (error) {
    console.error("[/api/tadabbur/action POST]", error);
    return NextResponse.json({ error: "Failed to save action" }, { status: 500 });
  }
}
