import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/db";
import { parseVerseKey, requireUser, toNoteItem } from "@/lib/local-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const rows = await prisma.note.findMany({
    where: { userId: auth.user.sub },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ ok: true, items: rows.map(toNoteItem) });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const payload = (await req.json().catch(() => ({}))) as {
    verseKey?: string;
    body?: string;
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

  const row = await prisma.note.create({
    data: {
      userId: auth.user.sub,
      verseKey: parsed.verseKey,
      body,
    },
  });

  return NextResponse.json({ ok: true, message: "Note saved.", item: toNoteItem(row) });
}
