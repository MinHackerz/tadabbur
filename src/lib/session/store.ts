import crypto from "node:crypto";

import { Redis } from "@upstash/redis";

import { SESSION_TTL_MS, SESSION_TTL_SECONDS } from "@/lib/constants";

export interface StoredSession {
  authError?: string | null;
  flashNotice?: { message: string; type: "error" | "success" } | null;
  oauth?: {
    codeVerifier: string;
    nonce: string;
    state: string;
  } | null;
  oidcLogoutIdTokenHint?: string | null;
  userSession?: Record<string, unknown> | null;
}

interface SessionStore {
  delete: (id: string) => Promise<void>;
  get: (id: string) => Promise<StoredSession | null>;
  set: (id: string, value: StoredSession) => Promise<void>;
  summary: string;
}

export class MemorySessionStore implements SessionStore {
  private readonly cache = new Map<
    string,
    { expiresAt: number; value: StoredSession }
  >();

  summary = "Example in-process session store";

  private pruneExpired(now = Date.now()): void {
    this.cache.forEach((current, id) => {
      if (now > current.expiresAt) {
        this.cache.delete(id);
      }
    });
  }

  async delete(id: string): Promise<void> {
    this.cache.delete(id);
  }

  async get(id: string): Promise<StoredSession | null> {
    const current = this.cache.get(id);

    if (!current) {
      return null;
    }

    if (Date.now() > current.expiresAt) {
      this.cache.delete(id);
      return null;
    }

    return current.value;
  }

  async set(id: string, value: StoredSession): Promise<void> {
    const now = Date.now();

    this.pruneExpired(now);

    this.cache.set(id, {
      expiresAt: now + SESSION_TTL_MS,
      value,
    });
  }
}

class RedisSessionStore implements SessionStore {
  private client: Redis;

  private readonly prefix = "qf:sess:";

  summary = "Upstash Redis session store (HTTP)";

  constructor(redisUrl: string) {
    // Parse the rediss:// URL to extract token and endpoint for Upstash REST
    // Upstash REST URL format: https://<endpoint>.upstash.io
    // Upstash Redis URL format: rediss://default:<token>@<endpoint>.upstash.io:6379
    const url = new URL(redisUrl);
    const token = url.password;
    const restUrl = `https://${url.hostname}`;

    this.client = new Redis({
      url: restUrl,
      token,
    });
  }

  async delete(id: string): Promise<void> {
    try {
      await this.client.del(`${this.prefix}${id}`);
    } catch {
      // Silently fail
    }
  }

  async get(id: string): Promise<StoredSession | null> {
    try {
      const value = await this.client.get<string>(`${this.prefix}${id}`);

      if (!value) {
        return null;
      }

      // @upstash/redis auto-parses JSON, but handle both cases
      if (typeof value === "object") {
        return value as unknown as StoredSession;
      }

      return JSON.parse(value) as StoredSession;
    } catch {
      return null;
    }
  }

  async set(id: string, value: StoredSession): Promise<void> {
    try {
      await this.client.set(`${this.prefix}${id}`, JSON.stringify(value), {
        ex: SESSION_TTL_SECONDS,
      });
    } catch {
      // Fall through — session won't persist but app won't crash
    }
  }
}

const memoryStore = new MemorySessionStore();
let redisStore: RedisSessionStore | null = null;

export const getSessionStore = (redisUrl?: string): SessionStore => {
  if (!redisUrl) {
    return memoryStore;
  }

  if (!redisStore) {
    redisStore = new RedisSessionStore(redisUrl);
  }

  return redisStore;
};

const sign = (sessionId: string, secret: string): string =>
  crypto.createHmac("sha256", secret).update(sessionId).digest("hex");

export const createSignedSessionId = (
  sessionId: string,
  secret: string,
): string => `${sessionId}.${sign(sessionId, secret)}`;

export const parseSignedSessionId = (
  signedValue: string | undefined,
  secret: string,
): string | null => {
  if (!signedValue) {
    return null;
  }

  const separatorIndex = signedValue.indexOf(".");
  if (separatorIndex <= 0 || separatorIndex !== signedValue.lastIndexOf(".")) {
    return null;
  }

  const sessionId = signedValue.slice(0, separatorIndex);
  const providedSignature = signedValue.slice(separatorIndex + 1);
  if (!sessionId || !providedSignature) {
    return null;
  }

  const expected = sign(sessionId, secret);
  if (!/^[a-f0-9]{64}$/i.test(providedSignature)) {
    return null;
  }

  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(providedSignature, "hex");

  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  return sessionId;
};

export const createSessionId = (): string => crypto.randomUUID();
