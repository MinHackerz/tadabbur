import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/db";
import { parseVerseKey, requireUser, toBookmarkItem } from "@/lib/local-store";

 
const prisma = _prisma as any;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const url = new URL(req.url);
  const sourceParam = url.searchParams.get("source");
  const VALID_SOURCES = new Set(["niyyah", "goals", "random"]);
  const where: Record<string, unknown> = { userId: auth.user.sub };
  if (sourceParam && VALID_SOURCES.has(sourceParam)) {
    where.source = sourceParam;
  }

  const rows = await prisma.bookmark.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, items: rows.map(toBookmarkItem) });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (!auth.user) return auth.response;

    const payload = (await req.json().catch(() => ({}))) as {
      verseKey?: string;
      chapterNumber?: number | string;
      verseNumber?: number | string;
      source?: string;
    };

    // Accept either { verseKey: "2:255" } or legacy { chapterNumber, verseNumber }.
    const fromKey = payload.verseKey ? parseVerseKey(payload.verseKey) : null;
    const fromParts = !fromKey && payload.chapterNumber && payload.verseNumber
      ? parseVerseKey(`${payload.chapterNumber}:${payload.verseNumber}`)
      : null;
    const parsed = fromKey ?? fromParts;

    if (!parsed) {
      return NextResponse.json(
        { ok: false, message: "Use a verse like 2:255 (chapter:verse)." },
        { status: 400 },
      );
    }

    const VALID_SOURCES = new Set(["niyyah", "goals", "random"]);
    const source = VALID_SOURCES.has(payload.source ?? "") ? payload.source! : "random";

    const row = await prisma.bookmark.upsert({
      where: { userId_verseKey_source: { userId: auth.user.sub, verseKey: parsed.verseKey, source: source as any } },
      create: {
        userId: auth.user.sub,
        verseKey: parsed.verseKey,
        surahId: parsed.surahId,
        verseNumber: parsed.verseNumber,
        source: source as any,
      },
      update: {},
    });

    return NextResponse.json({
      ok: true,
      message: "Bookmark saved.",
      item: toBookmarkItem(row),
    });
  } catch (error) {
    console.error("[POST /api/bookmarks] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to save bookmark. Please try again." },
      { status: 500 },
    );
  }
}
