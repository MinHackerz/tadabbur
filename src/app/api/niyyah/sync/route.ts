import { NextRequest, NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth-helpers";
import { syncNiyyahJourneyForUser } from "@/lib/niyyah-sync";

/**
 * Auto-sync niyyah journey progress based on actual reading sessions.
 *
 * The actual logic lives in `lib/niyyah-sync.ts` so that other server-side
 * code paths (e.g. `/api/verse-progress`) can invoke it in-process instead
 * of self-fetching this route over HTTP.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await syncNiyyahJourneyForUser(user.sub);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/niyyah/sync POST]", error);
    return NextResponse.json({ error: "Failed to sync journey" }, { status: 500 });
  }
}
