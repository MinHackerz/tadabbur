import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { progressId, day, content, isPublic, region } = body;

    if (!progressId || !day || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const progress = await prisma.tadabburUserProgress.findFirst({
      where: { id: progressId, userId: user.sub },
    });

    if (!progress) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    }

    // Create or update journal entry
    const journal = await prisma.tadabburJournal.upsert({
      where: {
        progressId_day: {
          progressId,
          day,
        },
      },
      create: {
        progressId,
        day,
        content,
        isPublic: isPublic ?? false,
        region: region ?? null,
      },
      update: {
        content,
        isPublic: isPublic ?? false,
        region: region ?? null,
      },
    });

    return NextResponse.json({ journal });
  } catch (error) {
    console.error("[/api/tadabbur/journal POST]", error);
    return NextResponse.json({ error: "Failed to save journal" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const circleId = searchParams.get("circleId");

    if (!circleId) {
      return NextResponse.json({ error: "Circle ID is required" }, { status: 400 });
    }

    // Get public community reflections for this circle
    const reflections = await prisma.tadabburJournal.findMany({
      where: {
        isPublic: true,
        progress: {
          circleId,
        },
      },
      select: {
        day: true,
        content: true,
        region: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ reflections });
  } catch (error) {
    console.error("[/api/tadabbur/journal GET]", error);
    return NextResponse.json({ error: "Failed to fetch reflections" }, { status: 500 });
  }
}
