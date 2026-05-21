import type { NextRequest } from "next/server";

/**
 * Verifies a cron / admin request using a shared secret.
 *
 * Returns:
 *   - "ok"            : authenticated successfully
 *   - "missing_secret": the server is misconfigured (no CRON_SECRET / ADMIN_SECRET set)
 *   - "unauthorized"  : header present but did not match
 *
 * Notes
 *   - We do NOT trust user-agent strings (e.g. "vercel-cron"). Vercel's cron
 *     runtime can be configured to send `Authorization: Bearer $CRON_SECRET`
 *     and that is what we accept.
 *   - Without a configured secret in the environment we refuse the request.
 *     This prevents accidental open admin endpoints.
 */
export type AdminAuthResult = "ok" | "missing_secret" | "unauthorized";

export function verifyAdminRequest(req: NextRequest): AdminAuthResult {
  const secret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
  if (!secret) {
    return "missing_secret";
  }

  const header = req.headers.get("authorization") ?? "";
  // Accept "Bearer <secret>" only.
  if (header === `Bearer ${secret}`) {
    return "ok";
  }

  return "unauthorized";
}
