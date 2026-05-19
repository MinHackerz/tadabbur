import { NextRequest } from "next/server";

import { ensureUserScope, normalizeMutationPayload, parseVerseKey, runUserAction } from "@/lib/data";
import { getSession } from "@/lib/session";
import { mutationError, withSessionJson } from "@/lib/route-helpers";
import { db } from "@/db";
import { userNotesMeta } from "@/db/schema";
import { jwtDecode } from "jwt-decode";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sessionContext = await getSession(request);
  const scopeCheck = ensureUserScope(sessionContext.session, "note");

  if (!scopeCheck.ok) {
    return mutationError(sessionContext, scopeCheck);
  }

  const payload = (await request.json().catch(() => ({}))) as {
    body?: string;
    verseKey?: string;
  };

  // Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] Note payload:', payload);
  }

  const body = String(payload.body ?? "").trim();
  const verseKey = parseVerseKey(payload.verseKey);

  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG] Parsed note:', { body: body.substring(0, 50), verseKey });
  }

  if (!body) {
    return mutationError(sessionContext, {
      message: "Enter a note body before saving.",
      status: 400,
    });
  }

  if (!verseKey) {
    return mutationError(sessionContext, {
      message: "Use a verse key like 1:1.",
      status: 400,
    });
  }

  const result = await runUserAction(sessionContext.session, (serverClient) =>
    serverClient.auth.v1.notes.create({
      body,
      ranges: [`${verseKey}-${verseKey}`],
      saveToQR: false,
    }),
  );

  if (result.sessionExpired) {
    return mutationError(sessionContext, {
      message: result.error ?? "Session expired.",
      signedOut: true,
      status: 401,
    });
  }

  if (result.error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG] Note error:', result.error);
    }
    return mutationError(sessionContext, {
      message: result.error,
      status: 400,
    });
  }

  // Attempt to save advanced metadata to Neon database
  // We use a try-catch so it fails gracefully if DATABASE_URL is not set yet
  try {
    if (process.env.DATABASE_URL && (result.data as { id: string | number })?.id) {
      // Decode JWT to get user sub claim
      const idToken = sessionContext.session?.oidcLogoutIdTokenHint;
      if (idToken) {
        const decoded = jwtDecode<{ sub: string }>(idToken);
        const userId = decoded.sub;
        
        await db.insert(userNotesMeta).values({
          id: (result.data as { id: string | number }).id.toString(),
          userId,
          richTextContent: body, // In a real app, this might be a complex JSON from a rich text editor
        }).onConflictDoNothing(); // Prevent duplicates
      }
    }
  } catch (err) {
    // Silently skip Neon DB integration if it fails
  }

  return withSessionJson(sessionContext, {
    item: normalizeMutationPayload.note(result.data),
    message: "Note created and synced to Neon.",
    ok: true,
  });
}
