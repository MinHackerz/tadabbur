import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export interface TodayReadingStats {
  versesRead: number;
  minutesRead: number;
  pagesRead: number;
  surahsRead: number;
  date: string;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    // Parse as UTC midnight to match how verse-progress stores dates
    const parts = dateStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));

    const rows = await prisma.readingSession.findMany({
      where: { userId: user.sub, date: dateObj },
    });

    // Exclude niyyah-sourced reading from the general "today" stats.
    // The niyyah dashboard has its own progress display.
    const sourceFilter = searchParams.get("source");
    const filtered = sourceFilter
      ? rows.filter((r: { source: string }) => r.source === sourceFilter)
      : rows;

    const stats: TodayReadingStats = {
      versesRead: filtered.reduce((s: number, r: { versesRead: number }) => s + r.versesRead, 0),
      minutesRead: filtered.reduce((s: number, r: { minutesRead: number }) => s + r.minutesRead, 0),
      pagesRead: filtered.reduce((s: number, r: { pagesRead: number }) => s + r.pagesRead, 0),
      surahsRead: filtered.length,
      date: dateStr,
    };

    return NextResponse.json(stats);
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error(err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
