import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/db";
import { parseVerseKey, requireUser, toBookmarkItem } from "@/lib/local-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const rows = await prisma.bookmark.findMany({
    where: { userId: auth.user.sub },
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

    const row = await prisma.bookmark.upsert({
      where: { userId_verseKey: { userId: auth.user.sub, verseKey: parsed.verseKey } },
      create: {
        userId: auth.user.sub,
        verseKey: parsed.verseKey,
        surahId: parsed.surahId,
        verseNumber: parsed.verseNumber,
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
