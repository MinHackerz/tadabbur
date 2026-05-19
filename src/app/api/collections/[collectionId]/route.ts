import { NextRequest } from "next/server";

import { ensureUserScope, runUserAction } from "@/lib/data";
import { getSession } from "@/lib/session";
import { mutationError, withSessionJson } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await context.params;
  const sessionContext = await getSession(request);
  const scopeCheck = ensureUserScope(sessionContext.session, "collection");

  if (!scopeCheck.ok) {
    return mutationError(sessionContext, scopeCheck);
  }

  const result = await runUserAction(sessionContext.session, (serverClient) =>
    serverClient.auth.v1.collections.remove(collectionId),
  );

  if (result.sessionExpired) {
    return mutationError(sessionContext, {
      message: result.error ?? "Session expired.",
      signedOut: true,
      status: 401,
    });
  }

  if (result.error) {
    return mutationError(sessionContext, {
      message: result.error,
      status: result.upstreamStatus ?? 400,
    });
  }

  return withSessionJson(sessionContext, {
    deletedId: collectionId,
    message: "Collection deleted.",
    ok: true,
  });
}
