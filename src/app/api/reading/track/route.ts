import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";
import {
  asTrimmedString,
  asBoundedInt,
  asIsoDate,
  parseVerseKeyStrict,
  MAX_VERSES_PER_DAY,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

const MAX_PAGES_PER_DAY = 1_000;
const MAX_MINUTES_PER_DAY = 24 * 60;

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const date = asIsoDate(body.date);
    const surahId = asBoundedInt(body.surahId, 1, 114);
    const versesRead = asBoundedInt(body.versesRead, 0, MAX_VERSES_PER_DAY);
    const minutesRead = asBoundedInt(body.minutesRead, 0, MAX_MINUTES_PER_DAY) ?? 0;
    const pagesRead = asBoundedInt(body.pagesRead, 0, MAX_PAGES_PER_DAY) ?? 0;

    if (!date || surahId === null || versesRead === null) {
      return NextResponse.json(
        { error: "Missing or invalid required fields" },
        { status: 400 },
      );
    }

    const firstVerseKey =
      body.firstVerseKey == null
        ? null
        : parseVerseKeyStrict(body.firstVerseKey)?.verseKey ?? null;
    const lastVerseKey =
      body.lastVerseKey == null
        ? null
        : parseVerseKeyStrict(body.lastVerseKey)?.verseKey ?? null;

    const VALID_SOURCES = new Set(["niyyah", "goals", "random"]);
    const source = VALID_SOURCES.has(body.source as string ?? "") ? (body.source as string) : "random";

    // Atomic upsert with the new unique (userId, date, surahId, source). The previous
    // `findFirst → update` was a TOCTOU race that lost updates from
    // concurrent visibility/verse-completion handlers. We read the existing
    // row first only to compute monotonic-max aggregates; the actual write
    // is the upsert.
    const existing = await prisma.readingSession.findUnique({
      where: {
        userId_date_surahId_source: {
          userId: user.sub,
          date,
          surahId,
          source: source as any,
        },
      },
      select: {
        versesRead: true,
        minutesRead: true,
        pagesRead: true,
        firstVerseKey: true,
        lastVerseKey: true,
      },
    });

    const merged = existing
      ? {
          versesRead: Math.max(existing.versesRead, versesRead),
          minutesRead: existing.minutesRead + minutesRead,
          pagesRead: Math.max(existing.pagesRead, pagesRead),
          firstVerseKey: existing.firstVerseKey ?? firstVerseKey,
          lastVerseKey: lastVerseKey ?? existing.lastVerseKey,
        }
      : { versesRead, minutesRead, pagesRead, firstVerseKey, lastVerseKey };

    await prisma.readingSession.upsert({
      where: {
        userId_date_surahId_source: {
          userId: user.sub,
          date,
          surahId,
          source: source as any,
        },
      },
      create: {
        userId: user.sub,
        date,
        surahId,
        source: source as any,
        ...merged,
      },
      update: merged,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/reading/track POST]", err);
    return NextResponse.json(
      { error: "Failed to save reading session" },
      { status: 500 },
    );
  }
}
