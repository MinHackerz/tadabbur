import { NextRequest } from "next/server";

import { loadDailyVerse } from "@/lib/data";
import { getSession } from "@/lib/session";
import { withSessionJson } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionContext = await getSession(request);
  const payload = await loadDailyVerse(sessionContext.session);
  return withSessionJson(sessionContext, payload);
}
