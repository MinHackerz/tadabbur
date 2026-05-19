import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { decodeJwt } from '@/lib/oauth';

export interface User {
  sub: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Extract user from session. Returns null if not authenticated.
 */
export async function getUserFromSession(req: NextRequest): Promise<User | null> {
  const sessionContext = await getSession(req);
  const userSession = sessionContext.session.userSession;
  
  if (!userSession || typeof userSession !== 'object') {
    return null;
  }
  
  const session = userSession as Record<string, unknown>;
  
  // Try to get sub directly from session (if stored by SDK)
  let sub = session.sub as string | undefined;
  
  // If not found, decode it from the idToken
  if (!sub) {
    const idToken = session.idToken ?? session.id_token;
    if (typeof idToken === 'string') {
      const claims = decodeJwt(idToken);
      sub = claims?.sub as string | undefined;
    }
  }

  // If still not found, try decoding from the accessToken
  if (!sub) {
    const accessToken = session.accessToken ?? session.access_token;
    if (typeof accessToken === 'string') {
      const claims = decodeJwt(accessToken);
      sub = (claims?.sub ?? claims?.client_id) as string | undefined;
    }
  }
  
  if (typeof sub !== 'string' || !sub) {
    return null;
  }
  
  return {
    sub,
    email: session.email as string | undefined,
  } as User;
}
