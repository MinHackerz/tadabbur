import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { readingSessions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserFromSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/reading/history
 * Returns the last 30 days of reading sessions for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.userId, user.sub))
      .orderBy(desc(readingSessions.date), desc(readingSessions.createdAt))
      .limit(100);

    return NextResponse.json(rows);
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error(err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
