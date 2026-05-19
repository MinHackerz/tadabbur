import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';

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
  
  const sub = (userSession as Record<string, unknown>).sub;
  
  if (typeof sub !== 'string' || !sub) {
    return null;
  }
  
  return {
    sub,
    ...(userSession as Record<string, unknown>),
  } as User;
}
