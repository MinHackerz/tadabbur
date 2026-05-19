import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { readingSessions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/reading/track
 * Upsert a reading session for today. Called from the reader when the user
 * navigates away or at regular intervals. Merges into the existing row for
 * (userId, date, surahId) so multiple partial saves accumulate correctly.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Upsert: if a row already exists for (userId, date, surahId), merge the counts.
    // We take the MAX of verses/pages (idempotent) and ADD minutes (cumulative).
    const existing = await db
      .select()
      .from(readingSessions)
      .where(
        and(
          eq(readingSessions.userId, user.sub),
          eq(readingSessions.date, date),
          eq(readingSessions.surahId, surahId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      await db
        .update(readingSessions)
        .set({
          versesRead: Math.max(row.versesRead, versesRead),
          minutesRead: row.minutesRead + minutesRead,
          pagesRead: Math.max(row.pagesRead, pagesRead),
          lastVerseKey: lastVerseKey ?? row.lastVerseKey,
          firstVerseKey: row.firstVerseKey ?? firstVerseKey,
          updatedAt: new Date(),
        })
        .where(eq(readingSessions.id, row.id));
    } else {
      await db.insert(readingSessions).values({
        userId: user.sub,
        date,
        surahId,
        versesRead,
        minutesRead,
        pagesRead,
        firstVerseKey: firstVerseKey ?? null,
        lastVerseKey: lastVerseKey ?? null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error(err);
    return NextResponse.json({ error: "Failed to save reading session" }, { status: 500 });
  }
}
