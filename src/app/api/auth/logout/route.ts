import { NextRequest } from "next/server";

import { getConfig } from "@/lib/env";
import { buildLogoutUrl, createRandomToken } from "@/lib/oauth";
import { getSession } from "@/lib/session";
import {
  getLogoutRedirectUrl,
  withDestroyedSessionRedirect,
} from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

/**
 * Always route logout through the IdP's OIDC end-session endpoint, even when
 * we don't have an `id_token_hint` to send. AGENTS.md requires this so a
 * user is fully signed out at the identity provider, not only locally.
 */
export async function GET(request: NextRequest) {
  const config = getConfig();
  const sessionContext = await getSession(request);

  const idToken =
    (sessionContext.session.userSession?.idToken as string | undefined) ??
    sessionContext.session.oidcLogoutIdTokenHint ??
    null;

  // Clear all session data before logout
  sessionContext.session.userSession = null;
  sessionContext.session.oauth = null;
  sessionContext.session.oidcLogoutIdTokenHint = null;
  sessionContext.session.authError = null;
  sessionContext.session.flashNotice = null;

  const logoutUrl = buildLogoutUrl({
    idToken,
    oauth2BaseUrl: config.oauth2BaseUrl,
    postLogoutRedirectUri: getLogoutRedirectUrl(),
    state: createRandomToken(16),
  });

  return withDestroyedSessionRedirect(sessionContext, logoutUrl);
}
