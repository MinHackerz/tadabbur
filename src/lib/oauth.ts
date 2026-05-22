import crypto from "node:crypto";

export const DEFAULT_OAUTH2_BASE_URL = "https://oauth2.quran.foundation";

const toBase64Url = (value: Buffer | string): string =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

export const createRandomToken = (size = 32): string =>
  toBase64Url(crypto.randomBytes(size));

export const createPkcePair = (): { challenge: string; verifier: string } => {
  const verifier = createRandomToken(48);
  const challenge = toBase64Url(
    crypto.createHash("sha256").update(verifier).digest(),
  );

  return {
    challenge,
    verifier,
  };
};

export const decodeJwt = (
  token: string | null | undefined,
): Record<string, unknown> | null => {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (payload.length % 4)) % 4);
    return JSON.parse(
      Buffer.from(`${payload}${padding}`, "base64").toString("utf8"),
    );
  } catch (_error) {
    return null;
  }
};

export const buildLogoutUrl = ({
  idToken,
  oauth2BaseUrl,
  postLogoutRedirectUri,
  state,
}: {
  idToken?: string | null;
  oauth2BaseUrl: string;
  postLogoutRedirectUri?: string;
  state?: string;
}): string => {
  const url = new URL("/oauth2/sessions/logout", oauth2BaseUrl);

  if (idToken) {
    url.searchParams.set("id_token_hint", idToken);
  }

  // Always include `post_logout_redirect_uri` so the IdP redirects back to
  // our app rather than stranding the user on the QF logout success page.
  if (postLogoutRedirectUri) {
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  }

  // OIDC spec: `state` requires `id_token_hint` to be present. Without it,
  // the IdP rejects the request with "state is set but id_token_hint is
  // missing". Only include `state` when we actually have the token hint.
  if (idToken && postLogoutRedirectUri && state) {
    url.searchParams.set("state", state);
  }

  return url.toString();
};
