import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/db";
import { parseVerseKey, requireUser, toNoteItem } from "@/lib/local-store";

 
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

  const rows = await prisma.note.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, items: rows.map(toNoteItem) });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (!auth.user) return auth.response;

    const payload = (await req.json().catch(() => ({}))) as {
      verseKey?: string;
      body?: string;
      source?: string;
    };

    const body = String(payload.body ?? "").trim();
    const parsed = parseVerseKey(payload.verseKey);

    if (!body) {
      return NextResponse.json(
        { ok: false, message: "Enter a note body before saving." },
        { status: 400 },
      );
    }
    if (!parsed) {
      return NextResponse.json(
        { ok: false, message: "Use a verse key like 1:1." },
        { status: 400 },
      );
    }

    const VALID_SOURCES = new Set(["niyyah", "goals", "random"]);
    const source = VALID_SOURCES.has(payload.source ?? "") ? payload.source! : "random";

    const row = await prisma.note.create({
      data: {
        userId: auth.user.sub,
        verseKey: parsed.verseKey,
        body,
        source: source as any,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Note saved.",
      item: toNoteItem(row),
    });
  } catch (error) {
    console.error("[POST /api/notes] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to save note. Please try again." },
      { status: 500 },
    );
  }
}
