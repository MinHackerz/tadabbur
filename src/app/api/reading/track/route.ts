import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as {
      date: string;
      surahId: number;
      versesRead: number;
      minutesRead: number;
      pagesRead: number;
      firstVerseKey?: string | null;
      lastVerseKey?: string | null;
    };

    const { date, surahId, versesRead, minutesRead, pagesRead, firstVerseKey, lastVerseKey } = body;

    if (!date || !surahId || versesRead == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const dateObj = new Date(date);

    const existing = await prisma.readingSession.findFirst({
      where: { userId: user.sub, date: dateObj, surahId },
    });

    if (existing) {
      await prisma.readingSession.update({
        where: { id: existing.id },
        data: {
          versesRead: Math.max(existing.versesRead, versesRead),
          minutesRead: existing.minutesRead + minutesRead,
          pagesRead: Math.max(existing.pagesRead, pagesRead),
          lastVerseKey: lastVerseKey ?? existing.lastVerseKey,
          firstVerseKey: existing.firstVerseKey ?? firstVerseKey,
        },
      });
    } else {
      await prisma.readingSession.create({
        data: {
          userId: user.sub,
          date: dateObj,
          surahId,
          versesRead,
          minutesRead,
          pagesRead,
          firstVerseKey: firstVerseKey ?? null,
          lastVerseKey: lastVerseKey ?? null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error(err);
    return NextResponse.json({ error: "Failed to save reading session" }, { status: 500 });
  }
}
