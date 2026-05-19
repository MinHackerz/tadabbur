import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { readingSessions } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export interface TodayReadingStats {
  versesRead: number;
  minutesRead: number;
  pagesRead: number;
  surahsRead: number;
  /** ISO date this covers */
  date: string;
}

/**
 * GET /api/reading/today?date=yyyy-mm-dd
 * Returns aggregated reading stats for the given date (defaults to today UTC).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date =
      searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

    const rows = await db
      .select()
      .from(readingSessions)
      .where(
        and(
          eq(readingSessions.userId, user.sub),
          eq(readingSessions.date, date),
        ),
      );

    const stats: TodayReadingStats = {
      versesRead: rows.reduce((s, r) => s + r.versesRead, 0),
      minutesRead: rows.reduce((s, r) => s + r.minutesRead, 0),
      pagesRead: rows.reduce((s, r) => s + r.pagesRead, 0),
      surahsRead: rows.length,
      date,
    };

    return NextResponse.json(stats);
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error(err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
