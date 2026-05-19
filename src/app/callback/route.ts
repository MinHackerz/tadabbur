import { NextRequest } from "next/server";

import { decodeJwt } from "@/lib/oauth";
import { getSession, rotateSession } from "@/lib/session";
import { createClients } from "@/lib/sdk";
import { getAppUrl, getCallbackUrl, withSessionRedirect } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

const setFlashError = (message: string, session: Awaited<ReturnType<typeof getSession>>["session"]) => {
  session.authError = message;
  session.oauth = null;
};

export async function GET(request: NextRequest) {
  const sessionContext = await getSession(request);
  const params = request.nextUrl.searchParams;
  const homeUrl = getAppUrl("/");

  const error = params.get("error");
  const code = params.get("code");
  const state = params.get("state");
  const oauth = sessionContext.session.oauth;

  // No pending OAuth state and no params — just redirect home (e.g. post-logout redirect)
  if (!oauth && !error && !code) {
    return withSessionRedirect(sessionContext, homeUrl);
  }

  if (error) {
    setFlashError(
      `Sign-in error: ${params.get("error_description") ?? error}`,
      sessionContext.session,
    );
    return withSessionRedirect(sessionContext, homeUrl);
  }

  if (!code) {
    setFlashError("No authorization code was returned.", sessionContext.session);
    return withSessionRedirect(sessionContext, homeUrl);
  }

  if (!oauth?.state || state !== oauth.state) {
    setFlashError("Security check failed — please try signing in again.", sessionContext.session);
    return withSessionRedirect(sessionContext, homeUrl);
  }

  try {
    const { serverClient } = await createClients(sessionContext.session);

    await serverClient.oauth2.v1.exchangeCode({
      code,
      codeVerifier: oauth.codeVerifier,
      redirectUri: getCallbackUrl(),
    });

    // Verify nonce to prevent replay attacks
    const idToken = sessionContext.session.userSession?.idToken;
    if (oauth.nonce && typeof idToken === "string") {
      const claims = decodeJwt(idToken);
      if (claims?.nonce && claims.nonce !== oauth.nonce) {
        setFlashError("Nonce mismatch — please try signing in again.", sessionContext.session);
        return withSessionRedirect(sessionContext, homeUrl);
      }
    }

    sessionContext.session.oauth = null;
    rotateSession(sessionContext);
    return withSessionRedirect(sessionContext, homeUrl);
  } catch (err) {
    setFlashError(
      `Sign-in failed: ${(err as Error).message || String(err)}`,
      sessionContext.session,
    );
    return withSessionRedirect(sessionContext, homeUrl);
  }
}
