import { NextRequest } from "next/server";

import { loadReaderData, parsePositiveInteger } from "@/lib/data";
import { getSession } from "@/lib/session";
import { withSessionJson } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ chapterId: string }> },
) {
  const { chapterId: rawChapterId } = await context.params;
  const sessionContext = await getSession(request);
  const chapterId = parsePositiveInteger(rawChapterId);

  if (!chapterId || chapterId > 114) {
    return withSessionJson(
      sessionContext,
      {
        message: "Chapter id must be a number from 1 to 114.",
        ok: false,
      },
      400,
    );
  }

  try {
    const tr = request.nextUrl.searchParams.get("tr");
    const au = request.nextUrl.searchParams.get("au");
    const payload = await loadReaderData(sessionContext.session, String(chapterId), tr, au);
    return withSessionJson(sessionContext, payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isNotFound = message.includes("404") || message.toLowerCase().includes("not found");
    
    return withSessionJson(
      sessionContext,
      {
        message: isNotFound ? "Chapter not found." : "Internal server error.",
        ok: false,
      },
      isNotFound ? 404 : 500,
    );
  }
}
