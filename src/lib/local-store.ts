import "server-only";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserFromSession, type User } from "@/lib/auth-helpers";
import { prisma as _prisma } from "@/db";
import type { BookmarkItem, CollectionItem, NoteItem } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;

/**
 * Helpers that own the first-party Library/Goals/VerseCompletion data.
 *
 * The Quran Foundation SDK paths for bookmarks/collections/notes/goals were
 * inconsistent (id formats, missing fields, scope gating), so this app stores
 * them in its own Postgres tables. Everything is keyed by the OIDC `sub` of
 * the signed-in user — no data crosses users.
 */

export const VERSE_KEY_RE = /^(\d+):(\d+)$/;

export interface AuthFail {
  user: null;
  response: NextResponse;
}

export interface AuthOk {
  user: User;
  response: null;
}

export type AuthResult = AuthFail | AuthOk;

/** Resolve the signed-in user, or return a JSON 401 response. */
export async function requireUser(req: NextRequest): Promise<AuthResult> {
  const user = await getUserFromSession(req);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { ok: false, message: "Sign in first to use user-session actions." },
        { status: 401 },
      ),
    };
  }
  return { user, response: null };
}

export function parseVerseKey(value: unknown): { verseKey: string; surahId: number; verseNumber: number } | null {
  const trimmed = String(value ?? "").trim();
  const match = VERSE_KEY_RE.exec(trimmed);
  if (!match) return null;
  const surahId = Number(match[1]);
  const verseNumber = Number(match[2]);
  if (!Number.isFinite(surahId) || !Number.isFinite(verseNumber)) return null;
  if (surahId < 1 || surahId > 114 || verseNumber < 1) return null;
  return { verseKey: `${surahId}:${verseNumber}`, surahId, verseNumber };
}

export function buildReaderUrlForVerse(verseKey: string): string {
  const m = VERSE_KEY_RE.exec(verseKey);
  if (!m) return "/read/1";
  return `/read/${m[1]}#verse-${m[2]}`;
}

/* ── Library shape adapters ────────────────────────────────────────── */

interface BookmarkRow {
  id: string;
  verseKey: string;
}

export function toBookmarkItem(row: BookmarkRow): BookmarkItem {
  return {
    id: row.id,
    readerUrl: buildReaderUrlForVerse(row.verseKey),
    type: "ayah",
    verseKey: row.verseKey,
  };
}

interface NoteRow {
  id: string;
  verseKey: string;
  body: string;
}

export function toNoteItem(row: NoteRow): NoteItem {
  return {
    id: row.id,
    body: row.body,
    ranges: [`${row.verseKey}-${row.verseKey}`],
  };
}

interface CollectionRow {
  id: string;
  name: string;
  updatedAt: Date;
}

export function toCollectionItem(row: CollectionRow): CollectionItem {
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* ── Loaders used by /api/bootstrap ────────────────────────────────── */

export async function loadLibrarySlices(userId: string): Promise<{
  bookmarks: BookmarkItem[];
  notes: NoteItem[];
  collections: CollectionItem[];
}> {
  const [bookmarkRows, noteRows, collectionRows] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.collection.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    bookmarks: bookmarkRows.map(toBookmarkItem),
    notes: noteRows.map(toNoteItem),
    collections: collectionRows.map(toCollectionItem),
  };
}

export async function loadActiveGoal(userId: string): Promise<Record<string, unknown> | null> {
  const goal = await prisma.goal.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!goal) return null;

  // Compute actual progress from reading sessions based on goal period.
  const now = new Date();
  let periodStart: Date;
  if (goal.period === "weekly") {
    // Start of ISO week (Monday)
    const day = now.getUTCDay() || 7; // Sunday = 7
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1));
  } else {
    // Daily — just today
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  const sessions = await prisma.readingSession.findMany({
    where: {
      userId,
      date: { gte: periodStart },
    },
  });

  let completedAmount = 0;
  if (goal.type === "VERSES") {
    completedAmount = sessions.reduce((sum: number, s: any) => sum + (s.versesRead ?? 0), 0);
  } else if (goal.type === "TIME") {
    completedAmount = sessions.reduce((sum: number, s: any) => sum + (s.minutesRead ?? 0), 0);
  } else if (goal.type === "SURAHS") {
    const uniqueSurahs = new Set(sessions.map((s: any) => s.surahId));
    completedAmount = uniqueSurahs.size;
  } else {
    // Fallback (PAGES or unknown) — use verses as proxy
    completedAmount = sessions.reduce((sum: number, s: any) => sum + (s.versesRead ?? 0), 0);
  }

  return {
    id: goal.id,
    period: goal.period,
    type: goal.type,
    targetAmount: goal.targetAmount,
    mushafId: goal.mushafId,
    category: goal.category,
    progress: { completedAmount },
  };
}
