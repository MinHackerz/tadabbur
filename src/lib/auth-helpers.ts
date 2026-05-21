import { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { decodeJwt } from '@/lib/oauth';
import { prisma } from '@/db';

export interface User {
  sub: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
}

/**
 * Upsert user information in database
 */
async function upsertUser(user: User): Promise<void> {
  try {
    await prisma.user.upsert({
      where: { id: user.sub },
      create: {
        id: user.sub,
        email: user.email || null,
        name: user.name || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
      },
      update: {
        email: user.email || null,
        name: user.name || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
      },
    });
  } catch (error) {
    console.error('Failed to upsert user:', error);
    // Don't throw - user info storage is not critical for auth
  }
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
  let email: string | undefined;
  let name: string | undefined;
  let firstName: string | undefined;
  let lastName: string | undefined;
  
  // If not found, decode it from the idToken
  if (!sub) {
    const idToken = session.idToken ?? session.id_token;
    if (typeof idToken === 'string') {
      const claims = decodeJwt(idToken);
      sub = claims?.sub as string | undefined;
      email = claims?.email as string | undefined;
      name = claims?.name as string | undefined;
      firstName = claims?.first_name as string | undefined;
      lastName = claims?.last_name as string | undefined;
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
  
  // Also try to get email from session directly
  if (!email) {
    email = session.email as string | undefined;
  }
  
  if (typeof sub !== 'string' || !sub) {
    return null;
  }
  
  const user: User = {
    sub,
    email,
    name,
    firstName,
    lastName,
  };
  
  // Store/update user info in database (async, non-blocking)
  upsertUser(user).catch(() => {
    // Silently fail - don't block auth flow
  });
  
  return user;
}

/**
 * Get user display name from database or session
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, firstName: true, lastName: true, email: true },
    });
    
    if (user) {
      // Try name first
      if (user.name) return user.name;
      
      // Try firstName + lastName
      if (user.firstName || user.lastName) {
        return [user.firstName, user.lastName].filter(Boolean).join(' ');
      }
      
      // Try email username
      if (user.email) {
        return user.email.split('@')[0];
      }
    }
  } catch (error) {
    console.error('Failed to get user display name:', error);
  }
  
  return 'Learner';
}
