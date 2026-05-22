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
 * Always route logout through the IdP's OIDC end-session endpoint when we
 * have an `id_token_hint`. Without it, the IdP rejects the request if
 * `post_logout_redirect_uri` is present. In that case, just destroy the
 * local session and redirect home — the user is effectively logged out
 * locally, and the IdP session will expire on its own.
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

  // If we don't have an id_token_hint, the IdP will reject the request when
  // post_logout_redirect_uri is included. Just destroy the session locally
  // and redirect home.
  if (!idToken) {
    return withDestroyedSessionRedirect(sessionContext, getLogoutRedirectUrl());
  }

  const logoutUrl = buildLogoutUrl({
    idToken,
    oauth2BaseUrl: config.oauth2BaseUrl,
    postLogoutRedirectUri: getLogoutRedirectUrl(),
    state: createRandomToken(16),
  });

  return withDestroyedSessionRedirect(sessionContext, logoutUrl);
}
