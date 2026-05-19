import "server-only";

import { getConfig } from "@/lib/env";
import type { StoredSession } from "@/lib/session/store";

type UnknownRecord = Record<string, unknown>;

interface OAuth2PublicClient {
  v1: {
    authorizeUrl: (params: UnknownRecord) => string;
  };
}

interface OAuth2ServerClient {
  v1: {
    exchangeCode: (params: {
      code: string;
      codeVerifier: string;
      redirectUri: string;
    }) => Promise<unknown>;
    getUserInfo: () => Promise<unknown>;
    refresh: () => Promise<unknown>;
  };
}

interface ServerAuthClient {
  v1: {
    bookmarks: {
      create: (payload: UnknownRecord) => Promise<unknown>;
      list: (params: UnknownRecord) => Promise<unknown>;
      remove: (bookmarkId: string) => Promise<unknown>;
    };
    collections: {
      create: (payload: { name: string }) => Promise<unknown>;
      list: (params: UnknownRecord) => Promise<unknown>;
      remove: (collectionId: string) => Promise<unknown>;
    };
    goals: {
      create: (payload: UnknownRecord) => Promise<unknown>;
      getTodaysPlan: () => Promise<unknown>;
      remove: (goalId: string) => Promise<unknown>;
      update: (goalId: string, payload: UnknownRecord) => Promise<unknown>;
    };
    notes: {
      create: (payload: UnknownRecord) => Promise<unknown>;
      list: () => Promise<unknown>;
      remove: (noteId: string) => Promise<unknown>;
    };
    preferences: {
      get: () => Promise<unknown>;
      update: (payload: UnknownRecord) => Promise<unknown>;
    };
  };
}

interface ServerContentClient {
  v4: {
    chapters: {
      get: (chapterId: string) => Promise<unknown>;
      list: () => Promise<unknown>;
    };
    verses: {
      byChapter: (chapterId: string, params: UnknownRecord) => Promise<unknown>;
      byKey: (key: string, query?: UnknownRecord) => Promise<unknown>;
    };
    hadithReferences: {
      byAyah: (key: string) => Promise<unknown>;
      hadithsByAyah: (key: string, query?: UnknownRecord) => Promise<unknown>;
    };
    raw: {
      [operation: string]: (params: { path: Record<string, string>; query?: Record<string, unknown> }) => Promise<unknown>;
    };
  };
}

interface ServerSearchClient {
  v1: {
    query: (params: UnknownRecord) => Promise<unknown>;
  };
}

interface ServerQuranReflectClient {
  v1: {
    posts: {
      create: (payload: UnknownRecord) => Promise<unknown>;
      feed: (params: UnknownRecord) => Promise<unknown>;
    };
    users: {
      profile: () => Promise<unknown>;
    };
  };
}

export interface PublicClient {
  oauth2: OAuth2PublicClient;
}

export interface ServerClient {
  auth: ServerAuthClient;
  content: ServerContentClient;
  oauth2: OAuth2ServerClient;
  quranReflect: ServerQuranReflectClient;
  search: ServerSearchClient;
}

// Helper to make authenticated API requests
const createAuthenticatedFetch = (session: StoredSession, config: ReturnType<typeof getConfig>) => {
  return async (url: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Use x-auth-token and x-client-id as per Quran Foundation docs
    const userSession = session.userSession as Record<string, unknown> | null;
    if (userSession?.accessToken || userSession?.access_token) {
      headers["x-auth-token"] = String(userSession.accessToken ?? userSession.access_token);
      headers["x-client-id"] = config.clientId;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Read the response body so callers can surface the upstream validation
      // message (e.g. a 422 with field-level errors) rather than a generic string.
      let detail = "";
      try {
        const ct = response.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const body = await response.json() as Record<string, unknown>;
          // Common shapes: { message }, { error }, { errors: [...] }
          const msg =
            body.message ??
            body.error ??
            (Array.isArray(body.errors)
              ? (body.errors as unknown[])
                  .map((e) =>
                    typeof e === "string"
                      ? e
                      : String((e as Record<string, unknown>).message ?? JSON.stringify(e)),
                  )
                  .join("; ")
              : null);
          if (msg) {
            detail = ` — ${String(msg)}`;
          } else {
            detail = ` — ${JSON.stringify(body)}`;
          }
        } else {
          const text = await response.text();
          if (text.trim()) detail = ` — ${text.trim().slice(0, 300)}`;
        }
      } catch {
        // ignore body-read errors; fall through to the generic message
      }
      const err = new Error(
        `API request failed: ${response.status} ${response.statusText}${detail}`,
      ) as Error & { status: number };
      err.status = response.status;
      throw err;
    }

    return response.json();
  };
};

// App token cache for client_credentials grant (used for content API)
let _appToken: { value: string; expiresAt: number } | null = null;

const getAppToken = async (clientId: string, clientSecret: string, oauth2BaseUrl: string): Promise<string> => {
  if (_appToken && _appToken.expiresAt > Date.now() + 30_000) {
    return _appToken.value;
  }
  const resp = await fetch(`${oauth2BaseUrl}/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
    },
    body: "grant_type=client_credentials&scope=content",
  });
  if (!resp.ok) throw new Error(`App token request failed: ${resp.status}`);
  const j = await resp.json() as { access_token: string; expires_in: number };
  _appToken = { value: j.access_token, expiresAt: Date.now() + j.expires_in * 1000 };
  return _appToken.value;
};

// Authenticated fetch for content API (uses app token + x-client-id header)
const createContentFetch = (config: ReturnType<typeof getConfig>) => {
  return async (url: string): Promise<unknown> => {
    const token = await getAppToken(config.clientId, config.clientSecret, config.oauth2BaseUrl);
    const response = await fetch(url, {
      headers: {
        "x-auth-token": token,
        "x-client-id": config.clientId,
        Accept: "application/json",
      },
    });
    if (!response.ok) throw new Error(`Content API request failed: ${response.status}`);
    return response.json();
  };
};

// Create a custom client implementation
const createCustomServerClient = (session: StoredSession, config: ReturnType<typeof getConfig>): ServerClient => {
  const authFetch = createAuthenticatedFetch(session, config);
  const contentFetch = createContentFetch(config);
  const gatewayUrl = config.services?.gatewayUrl ?? config.services?.authBaseUrl ?? "https://apis.quran.foundation";
  const contentUrl = config.services?.contentBaseUrl ?? "https://apis.quran.foundation/content";
  const oauth2Url = config.services?.oauth2BaseUrl ?? config.oauth2BaseUrl;
  const quranReflectUrl = config.services?.quranReflectBaseUrl ?? "https://quranreflect.com";

  // Helper to build content API URLs
  const buildContentUrl = (path: string) => {
    // If contentUrl already ends with /api/v4, don't add it again
    if (contentUrl.includes('/api/v4')) {
      return `${contentUrl}${path}`;
    }
    // If it ends with /content, add /api/v4
    if (contentUrl.endsWith('/content')) {
      return `${contentUrl}/api/v4${path}`;
    }
    // Otherwise assume it's a base URL
    return `${contentUrl}/v4${path}`;
  };

  return {
    auth: {
      v1: {
        bookmarks: {
          create: async (payload) => authFetch(`${gatewayUrl}/auth/v1/bookmarks`, {
            method: "POST",
            body: JSON.stringify(payload),
          }),
          list: async (params) => {
            const query = new URLSearchParams();
            if (params.first) query.set("first", String(params.first));
            if (params.mushafId) query.set("mushafId", String(params.mushafId));
            if (params.type) query.set("type", String(params.type));
            return authFetch(`${gatewayUrl}/auth/v1/bookmarks?${query}`);
          },
          remove: async (bookmarkId) => authFetch(`${gatewayUrl}/auth/v1/bookmarks/${bookmarkId}`, {
            method: "DELETE",
          }),
        },
        collections: {
          create: async (payload) => authFetch(`${gatewayUrl}/auth/v1/collections`, {
            method: "POST",
            body: JSON.stringify(payload),
          }),
          list: async (params) => {
            const query = new URLSearchParams();
            if (params.first) query.set("first", String(params.first));
            if (params.sortBy) query.set("sortBy", String(params.sortBy));
            return authFetch(`${gatewayUrl}/auth/v1/collections?${query}`);
          },
          remove: async (collectionId) => authFetch(`${gatewayUrl}/auth/v1/collections/${collectionId}`, {
            method: "DELETE",
          }),
        },
        goals: {
          create: async (payload) => authFetch(`${gatewayUrl}/auth/v1/goals`, {
            method: "POST",
            body: JSON.stringify(payload),
          }),
          getTodaysPlan: async () => authFetch(`${gatewayUrl}/auth/v1/goals/today`),
          remove: async (goalId) => authFetch(`${gatewayUrl}/auth/v1/goals/${goalId}`, {
            method: "DELETE",
          }),
          update: async (goalId, payload) => authFetch(`${gatewayUrl}/auth/v1/goals/${goalId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          }),
        },
        notes: {
          create: async (payload) => authFetch(`${gatewayUrl}/auth/v1/notes`, {
            method: "POST",
            body: JSON.stringify(payload),
          }),
          list: async () => authFetch(`${gatewayUrl}/auth/v1/notes`),
          remove: async (noteId) => authFetch(`${gatewayUrl}/auth/v1/notes/${noteId}`, {
            method: "DELETE",
          }),
        },
        preferences: {
          get: async () => authFetch(`${gatewayUrl}/auth/v1/preferences`),
          update: async (payload) => authFetch(`${gatewayUrl}/auth/v1/preferences`, {
            method: "PATCH",
            body: JSON.stringify(payload),
          }),
        },
      },
    },
    content: {
      v4: {
        chapters: {
          get: async (chapterId) => {
            return contentFetch(buildContentUrl(`/chapters/${chapterId}`));
          },
          list: async () => {
            return contentFetch(buildContentUrl(`/chapters`));
          },
        },
        verses: {
          byChapter: async (chapterId, params) => {
            const query = new URLSearchParams();
            if (params.page) query.set("page", String(params.page));
            if (params.perPage) query.set("per_page", String(params.perPage));
            if (params.translations && Array.isArray(params.translations)) {
              query.set("translations", params.translations.join(","));
            }
            if (params.audio) query.set("audio", String(params.audio));
            if (params.words === false) query.set("words", "false");
            if (params.fields && typeof params.fields === 'object') {
              const fieldsObj = params.fields as Record<string, unknown>;
              if (fieldsObj.textUthmani) query.set("fields", "text_uthmani");
            }
            return contentFetch(buildContentUrl(`/verses/by_chapter/${chapterId}?${query}`));
          },
          byKey: async (key, query) => {
            const queryParams = new URLSearchParams();
            if (query?.translations) {
              const trValue = Array.isArray(query.translations) ? query.translations.join(",") : String(query.translations);
              queryParams.set("translations", trValue);
            }
            if (query?.tafsirs) {
              const tafsirValue = Array.isArray(query.tafsirs) ? query.tafsirs.join(",") : String(query.tafsirs);
              queryParams.set("tafsirs", tafsirValue);
            }
            if (query?.words !== undefined) queryParams.set("words", String(query.words));
            if (query?.fields) queryParams.set("fields", String(query.fields));
            return contentFetch(buildContentUrl(`/verses/by_key/${key}?${queryParams}`));
          },
        },
        hadithReferences: {
          byAyah: async (key) => {
            return contentFetch(buildContentUrl(`/hadith_references/by_ayah/${key}`));
          },
          hadithsByAyah: async (key, query) => {
            const queryParams = new URLSearchParams();
            if (query?.page) queryParams.set("page", String(query.page));
            if (query?.per_page) queryParams.set("per_page", String(query.per_page));
            if (query?.limit) queryParams.set("per_page", String(query.limit));
            return contentFetch(buildContentUrl(`/hadith_references/hadiths_by_ayah/${key}?${queryParams}`));
          },
        },
        raw: {
          listSurahTranslations: async ({ path, query }) => {
            const queryParams = new URLSearchParams();
            if (query?.page) queryParams.set("page", String(query.page));
            if (query?.per_page) queryParams.set("per_page", String(query.per_page));
            return contentFetch(buildContentUrl(`/translations/${path.resource_id}/by_chapter/${path.chapter_number}?${queryParams}`));
          },
          listAyahTranslations: async ({ path, query }) => {
            const queryParams = new URLSearchParams();
            if (query?.per_page) queryParams.set("per_page", String(query.per_page));
            return contentFetch(buildContentUrl(`/translations/${path.resource_id}/by_ayah/${path.ayah_key}?${queryParams}`));
          },
          getAyahTafsir: async ({ path, query }) => {
            const queryParams = new URLSearchParams();
            if (query?.words) queryParams.set("words", String(query.words));
            return contentFetch(buildContentUrl(`/tafsirs/${path.tafsir_id}/by_ayah/${path.ayah_key}?${queryParams}`));
          },
          getHadithByAyah: async ({ path }) => {
            return contentFetch(buildContentUrl(`/hadith_references/by_ayah/${path.ayah_key}`));
          },
          getHadithsByAyah: async ({ path, query }) => {
            const queryParams = new URLSearchParams();
            if (query?.page) queryParams.set("page", String(query.page));
            if (query?.per_page) queryParams.set("per_page", String(query.per_page));
            return contentFetch(buildContentUrl(`/hadith_references/hadiths_by_ayah/${path.ayah_key}?${queryParams}`));
          },
          getVerseByKey: async ({ path, query }) => {
            const queryParams = new URLSearchParams();
            if (query?.translations) queryParams.set("translations", String(query.translations));
            if (query?.words) queryParams.set("words", String(query.words));
            return contentFetch(buildContentUrl(`/verses/by_key/${path.verse_key}?${queryParams}`));
          },
        },
      },
    },
    oauth2: {
      v1: {
        exchangeCode: async (params) => {
          const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: params.code,
            code_verifier: params.codeVerifier,
            redirect_uri: params.redirectUri,
          });

          const tokenUrl = `${oauth2Url}/oauth2/token`;

          const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: "Basic " + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64"),
            },
            body: body.toString(),
          });

          if (!response.ok) throw new Error(`Token exchange failed: ${response.status}`);
          const data = await response.json();
          
          // Normalize token response to camelCase for compatibility
          const normalized: Record<string, unknown> = {
            ...data,
            accessToken: data.access_token ?? data.accessToken,
            refreshToken: data.refresh_token ?? data.refreshToken,
            idToken: data.id_token ?? data.idToken,
            expiresAt: data.expires_at ?? (data.expires_in ? Date.now() + data.expires_in * 1000 : null),
            scope: data.scope,
            tokenType: data.token_type ?? data.tokenType,
          };

          // Update session with normalized tokens
          session.userSession = normalized;
          if (normalized.idToken && typeof normalized.idToken === "string") {
            session.oidcLogoutIdTokenHint = normalized.idToken;
          }
          
          return normalized;
        },
        getUserInfo: async () => {
          const userInfoUrl = `${oauth2Url}/oauth2/userinfo`;
          return authFetch(userInfoUrl);
        },
        refresh: async () => {
          const userSession = session.userSession as Record<string, unknown> | null;
          if (!userSession?.refreshToken && !userSession?.refresh_token) {
            throw new Error("No refresh token available");
          }

          const body = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: String(userSession.refreshToken ?? userSession.refresh_token),
          });

          const tokenUrl = `${oauth2Url}/oauth2/token`;

          const response = await fetch(tokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: "Basic " + Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64"),
            },
            body: body.toString(),
          });

          if (!response.ok) {
            // Clear session on refresh failure
            session.userSession = null;
            session.oidcLogoutIdTokenHint = null;
            throw new Error(`Token refresh failed: ${response.status}`);
          }

          const data = await response.json();
          
          // Normalize token response to camelCase
          const normalized: Record<string, unknown> = {
            ...data,
            accessToken: data.access_token ?? data.accessToken,
            refreshToken: data.refresh_token ?? data.refreshToken,
            idToken: data.id_token ?? data.idToken,
            expiresAt: data.expires_at ?? (data.expires_in ? Date.now() + data.expires_in * 1000 : null),
            scope: data.scope,
            tokenType: data.token_type ?? data.tokenType,
          };

          // Update session with refreshed tokens
          session.userSession = normalized;
          if (normalized.idToken && typeof normalized.idToken === "string") {
            session.oidcLogoutIdTokenHint = normalized.idToken;
          }
          
          return normalized;
        },
      },
    },
    quranReflect: {
      v1: {
        posts: {
          create: async (payload) => authFetch(`${quranReflectUrl}/v1/posts`, {
            method: "POST",
            body: JSON.stringify(payload),
          }),
          feed: async (params) => {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                query.set(key, String(value));
              }
            });
            return authFetch(`${quranReflectUrl}/v1/posts/feed?${query}`);
          },
        },
        users: {
          profile: async () => authFetch(`${quranReflectUrl}/v1/users/profile`),
        },
      },
    },
    search: {
      v1: {
        query: async (params) => {
          const query = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query.set(key, String(value));
            }
          });
          return authFetch(`${gatewayUrl}/search/v1/query?${query}`);
        },
      },
    },
  };
};

const createCustomPublicClient = (config: ReturnType<typeof getConfig>): PublicClient => {
  const oauth2Url = config.services?.oauth2BaseUrl ?? config.oauth2BaseUrl;
  
  return {
    oauth2: {
      v1: {
        authorizeUrl: (params) => {
          const query = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query.set(key, String(value));
            }
          });
          return `${oauth2Url}/oauth2/auth?${query}`;
        },
      },
    },
  };
};

export const createClients = async (session: StoredSession) => {
  const config = getConfig();

  return {
    publicClient: createCustomPublicClient(config),
    serverClient: createCustomServerClient(session, config),
  };
};

export const getSearchModeQuick = async (): Promise<string> => {
  return "quick";
};
