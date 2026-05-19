import { NextRequest } from "next/server";

import { ensureUserScope, runUserAction } from "@/lib/data";
import { getSession } from "@/lib/session";
import { mutationError, withSessionJson } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ noteId: string }> },
) {
  const { noteId } = await context.params;
  const sessionContext = await getSession(request);
  const scopeCheck = ensureUserScope(sessionContext.session, "note");

  if (!scopeCheck.ok) {
    return mutationError(sessionContext, scopeCheck);
  }

  const result = await runUserAction(sessionContext.session, (serverClient) =>
    serverClient.auth.v1.notes.remove(noteId),
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
      status: 400,
    });
  }

  return withSessionJson(sessionContext, {
    deletedId: noteId,
    message: "Note deleted.",
    ok: true,
  });
}
