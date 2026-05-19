import { NextRequest } from "next/server";

import { getConfig } from "@/lib/env";
import { createPkcePair, createRandomToken } from "@/lib/oauth";
import { getSession } from "@/lib/session";
import { createClients } from "@/lib/sdk";
import { getCallbackUrl, withSessionRedirect } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const config = getConfig();
  const sessionContext = await getSession(request);
  const { publicClient } = await createClients(sessionContext.session);

  // Clear any existing user session when starting a new auth flow
  // This ensures a fresh sign-in every time
  sessionContext.session.userSession = null;
  sessionContext.session.oidcLogoutIdTokenHint = null;
  sessionContext.session.authError = null;
  sessionContext.session.flashNotice = null;

  const { challenge, verifier } = createPkcePair();
  const nonce = createRandomToken(24);
  const state = createRandomToken(24);

  sessionContext.session.oauth = {
    codeVerifier: verifier,
    nonce,
    state,
  };

  const authorizeUrl = publicClient.oauth2.v1.authorizeUrl({
    client_id: config.clientId,
    code_challenge: challenge,
    code_challenge_method: "S256",
    nonce,
    prompt: "login", // Force fresh authentication, don't use existing session
    redirect_uri: getCallbackUrl(),
    response_type: "code",
    scope: config.scopes,
    state,
  });

  return withSessionRedirect(sessionContext, authorizeUrl);
}
