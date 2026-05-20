import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { progressId, day, completed, note } = body;

    if (!progressId || !day) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
        completed: completed ?? false,
        note: note ?? null,
      },
      update: {
        completed: completed ?? false,
        note: note ?? null,
      },
    });

    return NextResponse.json({ action });
  } catch (error) {
    console.error("[/api/tadabbur/action POST]", error);
    return NextResponse.json({ error: "Failed to save action" }, { status: 500 });
  }
}
