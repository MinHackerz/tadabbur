import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/db";
import { parseVerseKey, requireUser } from "@/lib/local-store";
import { syncActiveGoalForUser } from "@/lib/goals-sync";
import { syncNiyyahJourneyForUser } from "@/lib/niyyah-sync";

 
const prisma = _prisma as any;

export const dynamic = "force-dynamic";

const MAX_TIME_PER_VERSE_MS = 30 * 60_000; // safety cap: 30 minutes

function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * GET /api/verse-progress
 * Returns the set of verseKeys the user has marked complete on the given date
 * (defaults to today). Used by the reader to show the "marked complete" state.
 */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : todayDate();
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ ok: false, message: "Invalid date." }, { status: 400 });
  }

  const rows = await prisma.verseCompletion.findMany({
    where: { userId: auth.user.sub, sessionDate: date },
    orderBy: { completedAt: "asc" },
  });

  return NextResponse.json({
    ok: true,
    date: date.toISOString().slice(0, 10),
    items: rows.map((r: { verseKey: string; timeSpentMs: number; completedAt: Date }) => ({
      verseKey: r.verseKey,
      timeSpentMs: r.timeSpentMs,
      completedAt: r.completedAt.toISOString(),
    })),
  });
}

/**
 * POST /api/verse-progress
 * Body: { verseKey: "2:255", timeSpentMs: 45000, surahId?, verseNumber? }
 *
 * The user has explicitly marked this verse complete. The client measures the
 * time wall-clock with idle pause (tab hidden = pause) and sends the
 * accumulated milliseconds. We:
 *   - upsert a VerseCompletion row (idempotent per user+verse+day),
 *   - rebuild today's ReadingSession aggregate for the verse's surah.
 *
 * This is the only signal that advances reading progress.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const payload = (await req.json().catch(() => ({}))) as {
    verseKey?: string;
    timeSpentMs?: number;
    source?: string;
  };

  const parsed = parseVerseKey(payload.verseKey);
  if (!parsed) {
    return NextResponse.json(
      { ok: false, message: "Use a verse like 2:255." },
      { status: 400 },
    );
  }

  const VALID_SOURCES = new Set(["niyyah", "goals", "random"]);
  const source = VALID_SOURCES.has(payload.source ?? "") ? payload.source! : "random";

  const rawTime = Number(payload.timeSpentMs ?? 0);
  const timeSpentMs = Math.max(0, Math.min(MAX_TIME_PER_VERSE_MS, Math.round(rawTime)));
  const sessionDate = todayDate();

  const completion = await prisma.verseCompletion.upsert({
    where: {
      userId_verseKey_sessionDate: {
        userId: auth.user.sub,
        verseKey: parsed.verseKey,
        sessionDate,
      },
    },
    create: {
      userId: auth.user.sub,
      verseKey: parsed.verseKey,
      surahId: parsed.surahId,
      verseNumber: parsed.verseNumber,
      timeSpentMs,
      sessionDate,
      source: source as any,
    },
    // If the user marks it complete a second time the same day, take the max
    // of recorded time-spent so the total never goes backwards.
    update: {
      timeSpentMs: { set: Math.max(timeSpentMs, 0) },
      source: source as any,
    },
  });

  // Rebuild today's ReadingSession row for this surah from authoritative
  // completions. This is naturally idempotent because we re-derive the
  // aggregate from VerseCompletion rows.
  const dayCompletions = await prisma.verseCompletion.findMany({
    where: { userId: auth.user.sub, sessionDate, surahId: parsed.surahId, source: source as any },
    orderBy: { verseNumber: "asc" },
  });

  const versesRead = dayCompletions.length;
  const minutesRead = Math.round(
    dayCompletions.reduce(
      (sum: number, c: { timeSpentMs: number }) => sum + c.timeSpentMs,
      0,
    ) / 60_000,
  );
  const firstVerseKey = dayCompletions[0]?.verseKey ?? null;
  const lastVerseKey = dayCompletions[dayCompletions.length - 1]?.verseKey ?? null;

  await prisma.readingSession.upsert({
    where: {
      userId_date_surahId_source: {
        userId: auth.user.sub,
        date: sessionDate,
        surahId: parsed.surahId,
        source: source as any,
      },
    },
    create: {
      userId: auth.user.sub,
      date: sessionDate,
      surahId: parsed.surahId,
      source: source as any,
      versesRead,
      minutesRead,
      pagesRead: 0,
      firstVerseKey,
      lastVerseKey,
    },
    update: {
      versesRead,
      minutesRead,
      firstVerseKey,
      lastVerseKey,
    },
  });

  // Sync goals and niyyah journey in-process based on the reading source.
  // Niyyah sync only runs for niyyah-sourced reading, goals sync only for
  // goals-sourced reading. Random reading doesn't feed either streak.
  try {
    const syncTasks: Promise<unknown>[] = [];
    if (source === "goals") {
      syncTasks.push(syncActiveGoalForUser(auth.user.sub));
    } else if (source === "niyyah") {
      syncTasks.push(syncNiyyahJourneyForUser(auth.user.sub));
    }
    if (syncTasks.length > 0) await Promise.all(syncTasks);
  } catch (error) {
    console.error("[verse-progress] Failed to sync goals/niyyah:", error);
  }

  return NextResponse.json({
    ok: true,
    message: "Marked complete.",
    item: {
      verseKey: completion.verseKey,
      timeSpentMs: completion.timeSpentMs,
      completedAt: completion.completedAt.toISOString(),
    },
    session: {
      versesRead,
      minutesRead,
      surahId: parsed.surahId,
    },
  });
}

/**
 * DELETE /api/verse-progress?verseKey=2:255
 * Lets the user undo a completion (e.g. mistapped). Re-aggregates the surah row.
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const url = new URL(req.url);
  const verseKey = url.searchParams.get("verseKey");
  const parsed = parseVerseKey(verseKey);
  if (!parsed) {
    return NextResponse.json({ ok: false, message: "Missing verseKey." }, { status: 400 });
  }
  const sessionDate = todayDate();

  // Look up the source before deleting so we can recompute the right session
  const existing = await prisma.verseCompletion.findUnique({
    where: {
      userId_verseKey_sessionDate: {
        userId: auth.user.sub,
        verseKey: parsed.verseKey,
        sessionDate,
      },
    },
    select: { source: true },
  });
  const source = existing?.source ?? "random";

  await prisma.verseCompletion.deleteMany({
    where: { userId: auth.user.sub, verseKey: parsed.verseKey, sessionDate },
  });

  // Recompute the day's session row for the affected surah and source.
  const dayCompletions = await prisma.verseCompletion.findMany({
    where: { userId: auth.user.sub, sessionDate, surahId: parsed.surahId, source: source as any },
    orderBy: { verseNumber: "asc" },
  });
  const versesRead = dayCompletions.length;
  const minutesRead = Math.round(
    dayCompletions.reduce(
      (sum: number, c: { timeSpentMs: number }) => sum + c.timeSpentMs,
      0,
    ) / 60_000,
  );

  if (versesRead === 0) {
    await prisma.readingSession.deleteMany({
      where: { userId: auth.user.sub, date: sessionDate, surahId: parsed.surahId, source: source as any },
    });
  } else {
    await prisma.readingSession.upsert({
      where: {
        userId_date_surahId_source: {
          userId: auth.user.sub,
          date: sessionDate,
          surahId: parsed.surahId,
          source: source as any,
        },
      },
      create: {
        userId: auth.user.sub,
        date: sessionDate,
        surahId: parsed.surahId,
        source: source as any,
        versesRead,
        minutesRead,
        pagesRead: 0,
        firstVerseKey: dayCompletions[0]?.verseKey ?? null,
        lastVerseKey: dayCompletions[dayCompletions.length - 1]?.verseKey ?? null,
      },
      update: {
        versesRead,
        minutesRead,
        firstVerseKey: dayCompletions[0]?.verseKey ?? null,
        lastVerseKey: dayCompletions[dayCompletions.length - 1]?.verseKey ?? null,
      },
    });
  }

  return NextResponse.json({ ok: true, message: "Completion removed." });
}
