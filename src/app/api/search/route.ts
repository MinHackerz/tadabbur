import { NextRequest } from "next/server";

import { loadSearchData, parsePositiveInteger } from "@/lib/data";
import { getSession } from "@/lib/session";
import { withSessionJson } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionContext = await getSession(request);
  const trParam = request.nextUrl.searchParams.get("tr");
  const trId = trParam ? parsePositiveInteger(trParam) : null;
  const payload = await loadSearchData(
    sessionContext.session,
    request.nextUrl.searchParams.get("query"),
    trId,
  );

  return withSessionJson(sessionContext, payload);
}
