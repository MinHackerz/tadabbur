import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth-helpers";
import { syncActiveGoalForUser } from "@/lib/goals-sync";

/**
 * Auto-sync goal progress based on actual reading sessions.
 *
 * The actual logic lives in `lib/goals-sync.ts` so that other server-side
 * code paths (e.g. `/api/verse-progress`) can invoke it in-process instead
 * of self-fetching this route over HTTP.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await syncActiveGoalForUser(user.sub);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/goals/sync POST]", error);
    return NextResponse.json({ error: "Failed to sync goal" }, { status: 500 });
  }
}
