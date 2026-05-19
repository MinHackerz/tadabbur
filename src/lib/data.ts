import "server-only";

import { DEFAULT_BOOKMARK_MUSHAF, DEFAULT_FEED_QUERY, LIST_PREVIEW_LIMIT, SESSION_EXPIRED_MESSAGE } from "@/lib/constants";
import { postMatchesVerse } from "@/lib/reflectPosts";
import { getConfig } from "@/lib/env";
import { decodeJwt } from "@/lib/oauth";
import type { StoredSession } from "@/lib/session/store";
import { createClients } from "@/lib/sdk";
import type {
  AyahTranslationItem,
  AyahTranslationsPayload,
  AyahTafsirPayload,
  BookmarkItem,
  BootstrapPayload,
  CollectionItem,
  ContentPreviewItem,
  FactItem,
  FeedItem,
  HadithByAyahPayload,
  HadithNarrationItem,
  HadithReferenceItem,
  VerseReflectionsPayload,
  NoteItem,
  ReaderPayload,
  SearchItem,
} from "@/lib/types";

type JsonObject = Record<string, unknown>;

const READER_PAGE_SIZE = 50;

/**
 * Translation resource IDs that are known to be available on the production
 * Quran Foundation Content API. Used to validate `?tr=` query parameters so a
 * stale or unknown id (for example a prelive-only id) does not cause the API
 * to return empty translations.
 */
const SUPPORTED_TRANSLATION_IDS = new Set<number>([
  85,  // Abdel Haleem
  20,  // Saheeh International
  203, // Hilali & Khan
  84,  // T. Usmani
  22,  // Yusuf Ali
  19,  // Pickthall
  95,  // Maududi (Tafhim)
  57,  // Transliteration
]);

const DEFAULT_TRANSLATION_ID = 85;

export { SUPPORTED_TRANSLATION_IDS, DEFAULT_TRANSLATION_ID };

const asObject = (value: unknown): JsonObject => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as JsonObject;
};

const asString = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
};

const asNullableString = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
};

const asNullableNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asNullableObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as Record<string, unknown>;
};

const toArray = (value: unknown, keys: string[] = []): JsonObject[] => {
  if (Array.isArray(value)) {
    return value.map(asObject);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  for (const key of keys) {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) {
      return nested.map(asObject);
    }
  }

  return [];
};

const formatError = (error: unknown): string => String((error as Error)?.message ?? error);

const formatTimestamp = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const milliseconds = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const getTranslationText = (
  translations: unknown,
  preferredResourceId: number,
): string | null => {
  const items = Array.isArray(translations) ? translations : [];
  if (items.length === 0) {
    return null;
  }

  const preferred = items.find((item) => {
    const translation = asObject(item);
    const resourceId = asNullableNumber(translation.resourceId ?? translation.resource_id);
    const text = asNullableString(translation.text);
    return resourceId === preferredResourceId && Boolean(text);
  });

  if (preferred) {
    const translation = asObject(preferred);
    const text = asNullableString(translation.text);
    if (text) {
      return text;
    }
  }

  const firstWithText = items.find((item) =>
    Boolean(asNullableString(asObject(item).text)),
  );

  if (!firstWithText) {
    return null;
  }

  return asNullableString(asObject(firstWithText).text);
};

export const buildReaderUrlFromKey = (key: string | null | undefined): string | null => {
  const normalized = String(key ?? "").trim();
  if (!normalized) {
    return null;
  }

  if (/^\d+$/.test(normalized)) {
    return `/read/${normalized}`;
  }

  if (/^\d+:\d+(?:-\d+)?$/.test(normalized)) {
    const parts = normalized.split(":");
    const verseNum = parts[1].split("-")[0];
    return `/read/${parts[0]}#verse-${verseNum}`;
  }

  return null;
};

export const getGrantedScopes = (session: StoredSession): string[] => {
  const userSession = session.userSession ?? {};
  const rawScopes =
    userSession.scope ??
    userSession.scopes ??
    userSession.grantedScopes ??
    [];

  if (Array.isArray(rawScopes)) {
    return rawScopes.filter(Boolean);
  }

  if (typeof rawScopes !== "string") {
    return [];
  }

  return rawScopes
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
};

const hasScope = (grantedScopes: string[], scope: string): boolean =>
  grantedScopes.includes(scope);

const summarizeIdToken = (idToken: unknown): Record<string, unknown> | null => {
  if (typeof idToken !== "string") {
    return null;
  }

  const payload = decodeJwt(idToken);
  if (!payload) {
    return null;
  }

  return {
    audience: payload.aud,
    email: payload.email ?? null,
    expiresAt: payload.exp ?? null,
    firstName: payload.first_name ?? null,
    issuedAt: payload.iat ?? null,
    issuer: payload.iss ?? null,
    lastName: payload.last_name ?? null,
    sessionId: payload.sid ?? null,
    subject: payload.sub ?? null,
  };
};

const buildSessionFacts = (
  userSession: Record<string, unknown>,
  grantedScopes: string[],
  idTokenSummary: Record<string, unknown> | null,
): FactItem[] => {
  const subject =
    String(idTokenSummary?.email ?? idTokenSummary?.subject ?? "Unknown user");

  return [
    {
      label: "Signed in as",
      value: subject,
    },
    {
      label: "Granted scopes",
      value: `${grantedScopes.length}`,
    },
    {
      label: "Refresh token",
      value: userSession.refreshToken ? "Available" : "Missing",
    },
    {
      label: "Expires at",
      value: formatTimestamp(userSession.expiresAt) ?? "Unknown",
    },
  ];
};

const buildUserInfoFacts = (userInfo: Record<string, unknown> | null): FactItem[] => {
  if (!userInfo) {
    return [];
  }

  return [
    { label: "Subject", value: String(userInfo.sub ?? "Unavailable") },
    { label: "Email", value: String(userInfo.email ?? "Unavailable") },
    { label: "Issuer", value: String(userInfo.iss ?? "Unavailable") },
  ];
};

const buildProfileFacts = (profile: Record<string, unknown> | null): FactItem[] => {
  if (!profile) {
    return [];
  }

  const displayName = [profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return [
    { label: "Username", value: String(profile.username ?? "Unavailable") },
    { label: "Display name", value: displayName || "Unavailable" },
    { label: "Posts", value: `${Number(profile.postsCount ?? 0)}` },
    { label: "Followers", value: `${Number(profile.followersCount ?? 0)}` },
  ];
};

const normalizeNoteItem = (note: unknown): NoteItem => {
  const entry = asObject(note);

  return {
    body: asString(entry.body),
    id: asNullableString(entry.id),
    ranges: Array.isArray(entry.ranges)
      ? entry.ranges.map((value) => asString(value)).filter(Boolean)
      : [],
  };
};

const normalizeBookmarkItem = (bookmark: unknown): BookmarkItem => {
  const entry = asObject(bookmark);
  const chapterKey = asNullableString(entry.key);
  const verseNumber = asNullableString(entry.verseNumber);
  const verseKey =
    chapterKey && verseNumber ? `${chapterKey}:${verseNumber}` : chapterKey ?? "?";

  return {
    id: asNullableString(entry.id),
    readerUrl: buildReaderUrlFromKey(verseKey),
    type: asString(entry.type, "ayah"),
    verseKey,
  };
};

const normalizeCollectionItem = (collection: unknown): CollectionItem => {
  const entry = asObject(collection);

  return {
    id: asNullableString(entry.id),
    name: asString(entry.name, "Untitled collection"),
    updatedAt: asNullableString(entry.updatedAt),
  };
};

const normalizeFeedItem = (post: unknown): FeedItem => {
  const entry = asObject(post);
  const references = Array.isArray(entry.references) ? entry.references : [];
  const firstReference = asObject(references[0]);
  const chapterId = asNullableString(firstReference.chapterId);
  const fromVerse = asNullableString(firstReference.from);
  const toVerse = asNullableString(firstReference.to);

  const referenceLabel = chapterId
    ? `${chapterId}:${fromVerse ?? "?"}${
        toVerse && toVerse !== fromVerse
          ? `-${toVerse}`
          : ""
      }`
    : null;

  const author = asObject(entry.author);

  return {
    authorName: asString(author.displayName ?? author.username, "QuranReflect author"),
    body: asString(entry.body),
    commentsCount: Number(asNullableNumber(entry.commentsCount) ?? 0),
    id: asNullableString(entry.id),
    likesCount: Number(asNullableNumber(entry.likesCount) ?? 0),
    postTypeName: asNullableString(entry.postTypeName ?? entry.post_type_name),
    publishedAt: formatTimestamp(entry.publishedAt ?? entry.published_at ?? entry.createdAt ?? entry.created_at),
    readerUrl: buildReaderUrlFromKey(referenceLabel),
    referenceLabel,
  };
};

const NAV_RESULT_TYPE_LABELS: Record<string, string> = {
  surah: "Surah",
  ayah: "Verse",
  juz: "Juz",
  page: "Page",
  hizb: "Hizb",
  manzil: "Manzil",
  rub: "Rub al-Hizb",
  ruku: "Ruku",
};

const stripSearchHighlights = (input: string): string =>
  input.replace(/<\/?em>/gi, "").replace(/\s+/g, " ").trim();

const navItemReaderUrl = (resultType: string, key: unknown): string | null => {
  const rawKey = asNullableString(key);
  if (!rawKey) return null;
  if (resultType === "ayah") return buildReaderUrlFromKey(rawKey);
  if (resultType === "surah") {
    const id = Number(rawKey);
    if (!Number.isFinite(id) || id < 1 || id > 114) return null;
    return `/read/${id}`;
  }
  return null;
};

const normalizeQuranCdnSearch = (response: unknown, query: string) => {
  const result = asObject(asObject(response).result);

  const navigationItems: SearchItem[] = toArray(result.navigation)
    .map((item) => {
      const resultType = asString(item.resultType ?? item.result_type, "ayah");
      const readerUrl = navItemReaderUrl(resultType, item.key);
      const label = asString(item.name ?? item.key, "Search result");
      const typeLabel = NAV_RESULT_TYPE_LABELS[resultType] ?? resultType;
      return {
        label,
        readerUrl,
        subtitle: typeLabel,
      } satisfies SearchItem;
    })
    .filter((item) => item.readerUrl !== null);

  const verseItems: SearchItem[] = toArray(result.verses)
    .map((item): SearchItem | null => {
      const verseKey = asNullableString(item.verseKey ?? item.verse_key);
      if (!verseKey) return null;
      const translations = toArray(item.translations);
      const firstTrText = translations
        .map((tr) => asNullableString(tr.text))
        .find((text): text is string => Boolean(text));
      const text = firstTrText ? stripSearchHighlights(firstTrText) : null;

      const words = toArray(item.words)
        .map((w) => asNullableString(w.text))
        .filter((value): value is string => Boolean(value) && value !== "");
      const arabic = words.length ? words.join(" ").trim() : null;

      return {
        readerUrl: buildReaderUrlFromKey(verseKey),
        subtitle: arabic,
        text: text ?? `Open ${verseKey} in the reader.`,
        verseKey,
      };
    })
    .filter((item): item is SearchItem => item !== null);

  return {
    error: null,
    navigationItems,
    query,
    verseItems,
  };
};

const createEmptySlice = (gatingMessage: string | null = null) => ({
  error: null,
  gatingMessage,
  items: [],
});

const createScopeGate = (scope: string): string => `Requires the \`${scope}\` scope.`;

const loadSafely = async (loader: () => Promise<unknown>) => {
  try {
    return {
      data: await loader(),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: formatError(error),
    };
  }
};

const didSdkClearSession = (
  initialUserSession: Record<string, unknown> | null | undefined,
  session: StoredSession,
): boolean => Boolean(initialUserSession && !session.userSession);

const normalizeNotes = (response: unknown): NoteItem[] =>
  toArray(response, ["data", "items", "rows"]).slice(0, LIST_PREVIEW_LIMIT).map(normalizeNoteItem);

const normalizeBookmarks = (response: unknown): BookmarkItem[] =>
  toArray(response, ["data", "items", "rows"]).slice(0, LIST_PREVIEW_LIMIT).map(normalizeBookmarkItem);

const normalizeCollections = (response: unknown): CollectionItem[] =>
  toArray(response, ["data", "items", "rows"]).slice(0, LIST_PREVIEW_LIMIT).map(normalizeCollectionItem);

const normalizeFeedItems = (response: unknown): FeedItem[] =>
  toArray(response, ["data", "items", "rows"]).slice(0, LIST_PREVIEW_LIMIT).map(normalizeFeedItem);

export const loadContentPreviewData = async (
  session: StoredSession,
): Promise<{ error: string | null; items: ContentPreviewItem[]; previewReaderUrl: string }> => {
  const config = getConfig();
  const { serverClient } = await createClients(session);

  const payload: {
    error: string | null;
    items: ContentPreviewItem[];
    previewReaderUrl: string;
  } = {
    error: null,
    items: [] as ContentPreviewItem[],
    previewReaderUrl: `/read/${config.defaultReaderChapter}`,
  };

  try {
    const chapters = await serverClient.content.v4.chapters.list();
    const items = toArray(chapters, ["data", "chapters"]);

    payload.items = items.map((chapter) => ({
      id: Number(asNullableNumber(chapter.id) ?? 0),
      nameArabic: asNullableString(chapter.nameArabic),
      nameSimple: asString(chapter.nameSimple, `Chapter ${asString(chapter.id)}`),
      readerUrl: `/read/${asString(chapter.id)}`,
      translatedName: asNullableString(asObject(chapter.translatedName).name),
      versesCount: asNullableNumber(chapter.versesCount),
    }));

    if (payload.items[0]?.readerUrl) {
      payload.previewReaderUrl = payload.items[0].readerUrl;
    }
  } catch (error) {
    payload.error = formatError(error);
  }

  return payload;
};

/** 
 * A broad pool of verses representing diverse topics across the Quran.
 * The daily verse rotates through this pool — one per day, cycling over 60 days
 * before repeating. Curated for variety: prophecy, law, wisdom, history, du'a,
 * comfort, nature, accountability, and character.
 */
const DAILY_VERSE_KEYS = [
  // Al-Fatihah
  "1:1", "1:5", "1:7",
  // Al-Baqarah
  "2:45", "2:62", "2:152", "2:153", "2:177", "2:183", "2:186", "2:201",
  "2:216", "2:255", "2:263", "2:269", "2:285", "2:286",
  // Ali 'Imran
  "3:8", "3:17", "3:31", "3:102", "3:110", "3:139", "3:173", "3:200",
  // An-Nisa
  "4:36", "4:103", "4:135",
  // Al-Ma'idah
  "5:2", "5:8",
  // Al-An'am
  "6:54", "6:162",
  // Al-A'raf
  "7:56", "7:156",
  // At-Tawbah
  "9:51", "9:119",
  // Yunus
  "10:57",
  // Hud
  "11:88",
  // Yusuf
  "12:87",
  // Ar-Ra'd
  "13:11", "13:28",
  // Ibrahim
  "14:7",
  // Al-Hijr
  "15:49",
  // An-Nahl
  "16:97", "16:128",
  // Al-Isra'
  "17:23", "17:36",
  // Al-Kahf
  "18:10", "18:46",
  // Maryam
  "19:96",
  // Ta Ha
  "20:14",
  // Al-Anbiya'
  "21:87",
  // Al-Mu'minun
  "23:1",
  // An-Nur
  "24:35",
  // Al-Furqan
  "25:63",
  // Al-Qasas
  "28:24",
  // Luqman
  "31:17",
  // As-Sajdah
  "32:16",
  // Al-Ahzab
  "33:21",
  // Az-Zumar
  "39:53",
  // Ghafir
  "40:60",
  // Fussilat
  "41:34",
  // Ash-Shura
  "42:25",
  // Al-Hujurat
  "49:10", "49:13",
  // Adh-Dhariyat
  "51:56",
  // Al-Hadid
  "57:4",
  // Al-Hashr
  "59:18",
  // Al-Mulk
  "67:2",
  // Al-Inshirah
  "94:5",
  // At-Tin
  "95:4",
  // Al-Qadr
  "97:1",
  // Al-'Asr
  "103:1",
  // Al-Ikhlas
  "112:1",
] as const;

const DAILY_VERSE_FALLBACK_KEYS = ["2:255", "2:286", "1:5", "39:53", "13:28"] as const;

export interface DailyVersePayload {
  verseKey: string;
  surahId: number;
  verseNumber: number;
  arabicText: string | null;
  translationText: string | null;
  error: string | null;
}

const findVerseOnChapterPage = async (
  serverClient: Awaited<ReturnType<typeof createClients>>["serverClient"],
  chapterId: string,
  verseNumber: number,
  translationResourceId: number,
) => {
  const targetPage = Math.max(1, Math.ceil(verseNumber / READER_PAGE_SIZE));
  const pagesToTry = [targetPage, targetPage - 1, targetPage + 1].filter((p) => p >= 1);

  for (const page of pagesToTry) {
    const response = await serverClient.content.v4.verses.byChapter(chapterId, {
      fields: { textUthmani: true },
      page,
      perPage: READER_PAGE_SIZE,
      translations: [translationResourceId],
      words: false,
    });

    const verses = toArray(response, ["data", "verses"]);
    const match = verses.find((item) => asNullableNumber(item.verseNumber) === verseNumber);
    if (match) {
      return match;
    }
  }

  return null;
};

const loadDailyVerseForKey = async (
  session: StoredSession,
  verseKey: string,
): Promise<DailyVersePayload | null> => {
  const config = getConfig();
  const [surahId, verseNumber] = verseKey.split(":").map(Number);
  const chapterId = String(surahId);
  const translationResourceId = config.translationIds[0] ?? 85;

  const { serverClient } = await createClients(session);
  const verse = await findVerseOnChapterPage(serverClient, chapterId, verseNumber, translationResourceId);

  if (!verse) {
    return null;
  }

  const arabicText = asNullableString(verse.textUthmani ?? verse.text_uthmani);
  const resolvedTranslation = getTranslationText(verse.translations, translationResourceId);

  if (!arabicText && !resolvedTranslation) {
    return null;
  }

  return {
    verseKey,
    surahId,
    verseNumber,
    arabicText,
    translationText: resolvedTranslation,
    error: null,
  };
};

export const loadDailyVerse = async (session: StoredSession): Promise<DailyVersePayload> => {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const primaryKey = DAILY_VERSE_KEYS[dayIndex % DAILY_VERSE_KEYS.length];
  const keysToTry = [
    primaryKey,
    ...DAILY_VERSE_FALLBACK_KEYS.filter((key) => key !== primaryKey),
  ];

  let lastError: string | null = null;

  for (const verseKey of keysToTry) {
    const [surahId, verseNumber] = verseKey.split(":").map(Number);
    const empty: DailyVersePayload = {
      verseKey,
      surahId,
      verseNumber,
      arabicText: null,
      translationText: null,
      error: null,
    };

    try {
      const loaded = await loadDailyVerseForKey(session, verseKey);
      if (loaded && (loaded.arabicText || loaded.translationText)) {
        return loaded;
      }
      lastError = loaded?.error || "Verse not found for today's selection.";
    } catch (error) {
      lastError = formatError(error);
      // If it's a 403, the credentials don't have access - continue to next verse
      if (lastError.includes("403") || lastError.includes("Forbidden")) {
        continue;
      }
    }
  }

  // If all attempts failed, return the primary key with error
  const [surahId, verseNumber] = primaryKey.split(":").map(Number);
  return {
    verseKey: primaryKey,
    surahId,
    verseNumber,
    arabicText: null,
    translationText: null,
    error: lastError || "Unable to load verse of the day. Please try again later.",
  };
};

export const loadSearchData = async (
  session: StoredSession,
  query: string | null,
  translationId?: number | null,
): Promise<{ error: string | null; navigationItems: SearchItem[]; query: string; verseItems: SearchItem[] }> => {
  const normalizedQuery = String(query ?? "").trim();

  if (!normalizedQuery) {
    return {
      error: null,
      navigationItems: [],
      query: "",
      verseItems: [],
    };
  }

  // The dedicated /search service requires the `search` OAuth scope, which the
  // production credentials do not have. Use the public Quran.com CDN search
  // endpoint instead - same data source, no authentication required.
  const config = getConfig();
  const resolvedTrId =
    translationId && SUPPORTED_TRANSLATION_IDS.has(translationId)
      ? translationId
      : config.translationIds.find((id) => SUPPORTED_TRANSLATION_IDS.has(id)) ??
        DEFAULT_TRANSLATION_ID;

  const params = new URLSearchParams({
    q: normalizedQuery,
    size: "20",
    language: "en",
    filter_translations: String(resolvedTrId),
  });

  try {
    const response = await fetch(
      `https://api.qurancdn.com/api/qdc/search?${params.toString()}`,
      {
        headers: { Accept: "application/json" },
        // Don't keep the search call alive longer than the page render.
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      throw new Error(`Search request failed: ${response.status}`);
    }

    const json = (await response.json()) as unknown;
    void session; // session is unused for the public search path
    return normalizeQuranCdnSearch(json, normalizedQuery);
  } catch (error) {
    return {
      error: formatError(error),
      navigationItems: [],
      query: normalizedQuery,
      verseItems: [],
    };
  }
};

export const loadReaderData = async (
  session: StoredSession,
  chapterId: string,
  trId?: string | null,
  auId?: string | null,
): Promise<ReaderPayload> => {
  const config = getConfig();
  const { serverClient } = await createClients(session);

  const chapterResponse = await serverClient.content.v4.chapters.get(chapterId);
  const chapterPayload = asObject(chapterResponse);
  const chapter = asObject(chapterPayload.chapter ?? chapterPayload);
  const versesCount = asNullableNumber(chapter.versesCount);
  const totalVersePages = Math.max(
    1,
    versesCount ? Math.ceil(versesCount / READER_PAGE_SIZE) : 1,
  );

  // Resolve the translation id we will actually request from the API. Anything
  // not in the supported set (e.g. a prelive-only id like 131) falls back to
  // the configured default so the reader never renders without translations.
  const requestedTrId = trId && !Number.isNaN(Number(trId)) ? Number(trId) : null;
  const configuredFallback =
    config.translationIds.find((id) => SUPPORTED_TRANSLATION_IDS.has(id)) ??
    DEFAULT_TRANSLATION_ID;
  const translationResourceId =
    requestedTrId !== null && SUPPORTED_TRANSLATION_IDS.has(requestedTrId)
      ? requestedTrId
      : configuredFallback;
  const activeAudioId = auId && !Number.isNaN(Number(auId)) ? Number(auId) : undefined;

  // Ask the API for translations inline with the verses so the reader has
  // both the Arabic text and the translation in a single round-trip per page.
  const versePageResponses = await Promise.all(
    Array.from({ length: totalVersePages }, (_value, index) =>
      serverClient.content.v4.verses.byChapter(chapterId, {
        audio: activeAudioId,
        fields: {
          textUthmani: true,
        },
        page: index + 1,
        perPage: READER_PAGE_SIZE,
        translations: [translationResourceId],
        words: false,
      }),
    ),
  );

  let chapterTranslations: Map<number, string> = new Map();

  const verses = versePageResponses
    .flatMap((response) => toArray(response, ["data", "verses"]))
    .map((verse) => {
      const audioUrl = asNullableString(asNullableObject(verse.audio)?.url);
      let finalAudioUrl = null;
      if (audioUrl) {
        if (audioUrl.startsWith('//')) {
          finalAudioUrl = `https:${audioUrl}`;
        } else if (audioUrl.startsWith('http')) {
          finalAudioUrl = audioUrl;
        } else {
          finalAudioUrl = `https://verses.quran.com/${audioUrl.replace(/^\/+/, '')}`;
        }
      }
      const verseNumber = asNullableNumber(verse.verseNumber);
      const verseKey =
        asNullableString(verse.verseKey) ??
        (verseNumber !== null ? `${chapterId}:${verseNumber}` : null);
      const inlineTranslation = getTranslationText(verse.translations, translationResourceId);

      return {
        arabicText: asString(verse.textUthmani),
        audioUrl: finalAudioUrl,
        id: asString(verse.id ?? verseKey ?? `${chapterId}-${asString(verse.verseNumber, "verse")}`),
        translationText: inlineTranslation,
        verseKey,
        verseNumber,
      };
    });

  // If inline translations were missing for any verse (rare, but possible on
  // some chapters), fall back to the per-chapter resource endpoint and finally
  // to per-ayah lookups so the reader is never left without text.
  const missingInline = verses.some((v) => !v.translationText?.trim());
  if (missingInline) {
    chapterTranslations = await loadChapterTranslationsByResource(
      serverClient,
      chapterId,
      translationResourceId,
    );
    for (const verse of verses) {
      if (verse.translationText?.trim()) continue;
      if (verse.verseNumber === null) continue;
      const fromChapter = chapterTranslations.get(verse.verseNumber) ?? null;
      if (fromChapter) {
        verse.translationText = fromChapter;
      }
    }

    await fillVerseTranslationsByAyah(serverClient, verses, translationResourceId);
  }

  return {
    chapter: {
      id: Number(asNullableNumber(chapter.id) ?? Number(chapterId)),
      nameArabic: asNullableString(chapter.nameArabic),
      nameSimple: asString(chapter.nameSimple, `Chapter ${chapterId}`),
      translatedName: asNullableString(asObject(chapter.translatedName).name),
      versesCount,
    },
    translationIds: [translationResourceId],
    verses,
  };
};

const createSignedOutBootstrap = ({
  authError,
  contentPreview,
  flashNotice,
  sessionStoreSummary,
}: {
  authError: string | null;
  contentPreview: BootstrapPayload["contentPreview"];
  flashNotice: BootstrapPayload["flashNotice"];
  sessionStoreSummary: string;
}): BootstrapPayload => ({
  authError,
  bookmarks: createEmptySlice(),
  collections: createEmptySlice(),
  contentPreview,
  flashNotice,
  goals: {
    data: null,
    error: null,
    gatingMessage: null,
  },
  grantedScopes: [],
  idTokenSummary: null,
  isLoggedIn: false,
  notes: createEmptySlice(),
  preferences: {
    data: null,
    error: null,
    gatingMessage: null,
  },
  quranReflect: {
    feed: createEmptySlice(),
    profile: {
      data: null,
      error: null,
      facts: [],
      gatingMessage: null,
    },
  },
  sessionFacts: [],
  sessionStoreSummary,
  userInfo: {
    data: null,
    error: null,
    facts: [],
    gatingMessage: null,
  },
});

export const loadBootstrapData = async (
  session: StoredSession,
  sessionStoreSummary: string,
): Promise<BootstrapPayload> => {
  const contentPreview = await loadContentPreviewData(session);
  const authError = session.authError ?? null;
  const flashNotice = session.flashNotice ?? null;
  session.authError = null;
  session.flashNotice = null;

  const initialUserSession = session.userSession;
  if (!initialUserSession) {
    return createSignedOutBootstrap({
      authError,
      contentPreview,
      flashNotice,
      sessionStoreSummary,
    });
  }

  const grantedScopes = getGrantedScopes(session);
  const { serverClient } = await createClients(session);

  const [
    userInfoResult,
    notesResult,
    bookmarksResult,
    collectionsResult,
    goalsResult,
    preferencesResult,
    profileResult,
    feedResult,
  ] = await Promise.all([
    loadSafely(() => serverClient.oauth2.v1.getUserInfo()),
    hasScope(grantedScopes, "note")
      ? loadSafely(() => serverClient.auth.v1.notes.list())
      : Promise.resolve({ data: null, error: null }),
    hasScope(grantedScopes, "bookmark")
      ? loadSafely(() =>
          serverClient.auth.v1.bookmarks.list({
            first: LIST_PREVIEW_LIMIT,
            mushafId: DEFAULT_BOOKMARK_MUSHAF,
            type: "ayah",
          }),
        )
      : Promise.resolve({ data: null, error: null }),
    hasScope(grantedScopes, "collection")
      ? loadSafely(() =>
          serverClient.auth.v1.collections.list({
            first: LIST_PREVIEW_LIMIT,
            sortBy: "recentlyUpdated",
          }),
        )
      : Promise.resolve({ data: null, error: null }),
    hasScope(grantedScopes, "goal")
      ? loadSafely(() => serverClient.auth.v1.goals.getTodaysPlan())
      : Promise.resolve({ data: null, error: null }),
    hasScope(grantedScopes, "preference")
      ? loadSafely(() => serverClient.auth.v1.preferences.get())
      : Promise.resolve({ data: null, error: null }),
    hasScope(grantedScopes, "user")
      ? loadSafely(() => serverClient.quranReflect.v1.users.profile())
      : Promise.resolve({ data: null, error: null }),
    hasScope(grantedScopes, "post")
      ? loadSafely(() => serverClient.quranReflect.v1.posts.feed(DEFAULT_FEED_QUERY))
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (didSdkClearSession(initialUserSession, session)) {
    return createSignedOutBootstrap({
      authError,
      contentPreview,
      flashNotice: {
        message: SESSION_EXPIRED_MESSAGE,
        type: "error",
      },
      sessionStoreSummary,
    });
  }

  const currentSession = (session.userSession ?? initialUserSession) as Record<string, unknown>;
  const currentScopes = getGrantedScopes(session);
  const idTokenSummary = summarizeIdToken(currentSession.idToken);
  const normalizedUserInfo = asNullableObject(userInfoResult.data);
  const normalizedGoals = asNullableObject(goalsResult.data);
  const normalizedPreferences = asNullableObject(preferencesResult.data);
  const normalizedProfile = asNullableObject(profileResult.data);

  return {
    authError,
    bookmarks: hasScope(currentScopes, "bookmark")
      ? {
          error: bookmarksResult.error,
          gatingMessage: null,
          items: normalizeBookmarks(bookmarksResult.data),
        }
      : createEmptySlice(createScopeGate("bookmark")),
    collections: hasScope(currentScopes, "collection")
      ? {
          error: collectionsResult.error,
          gatingMessage: null,
          items: normalizeCollections(collectionsResult.data),
        }
      : createEmptySlice(createScopeGate("collection")),
    contentPreview,
    flashNotice,
    goals: {
      data: normalizedGoals,
      error: goalsResult.error,
      gatingMessage: hasScope(currentScopes, "goal") ? null : createScopeGate("goal"),
    },
    grantedScopes: currentScopes,
    idTokenSummary,
    isLoggedIn: true,
    notes: hasScope(currentScopes, "note")
      ? {
          error: notesResult.error,
          gatingMessage: null,
          items: normalizeNotes(notesResult.data),
        }
      : createEmptySlice(createScopeGate("note")),
    preferences: {
      data: normalizedPreferences,
      error: preferencesResult.error,
      gatingMessage: hasScope(currentScopes, "preference") ? null : createScopeGate("preference"),
    },
    quranReflect: {
      feed: hasScope(currentScopes, "post")
        ? {
            error: feedResult.error,
            gatingMessage: null,
            items: normalizeFeedItems(feedResult.data),
          }
        : createEmptySlice(createScopeGate("post")),
      profile: {
        data: normalizedProfile,
        error: profileResult.error,
        facts: buildProfileFacts(normalizedProfile),
        gatingMessage: hasScope(currentScopes, "user") ? null : createScopeGate("user"),
      },
    },
    sessionFacts: buildSessionFacts(currentSession, currentScopes, idTokenSummary),
    sessionStoreSummary,
    userInfo: {
      data: normalizedUserInfo,
      error: userInfoResult.error,
      facts: buildUserInfoFacts(normalizedUserInfo),
      gatingMessage: null,
    },
  };
};

export const runUserAction = async <T>(
  session: StoredSession,
  action: (serverClient: import("@/lib/sdk").ServerClient) => Promise<T>,
): Promise<{ data: T | null; error: string | null; sessionExpired: boolean }> => {
  const initialUserSession = session.userSession;
  const { serverClient } = await createClients(session);

  try {
    return {
      data: await action(serverClient),
      error: null,
      sessionExpired: false,
    };
  } catch (error) {
    if (didSdkClearSession(initialUserSession, session)) {
      return {
        data: null,
        error: SESSION_EXPIRED_MESSAGE,
        sessionExpired: true,
      };
    }

    return {
      data: null,
      error: formatError(error),
      sessionExpired: false,
    };
  }
};

export const ensureUserScope = (
  session: StoredSession,
  scope: string,
):
  | { ok: true }
  | {
      gatingMessage?: string | null;
      message: string;
      ok: false;
      signedOut: boolean;
      status: number;
    } => {
  if (!session.userSession) {
    return {
      message: "Sign in first to use user-session actions.",
      ok: false,
      signedOut: true,
      status: 401,
    };
  }

  const grantedScopes = getGrantedScopes(session);
  if (!hasScope(grantedScopes, scope)) {
    return {
      gatingMessage: createScopeGate(scope),
      message: `This action requires the \`${scope}\` scope.`,
      ok: false,
      signedOut: false,
      status: 403,
    };
  }

  return {
    ok: true,
  };
};

export const parsePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed)) {
    return null;
  }

  return parsed;
};

type ContentV4Raw = {
  raw: Record<
    string,
    (request?: { path?: Record<string, string>; query?: Record<string, unknown> }) => Promise<unknown>
  >;
};

type ContentV4Extended = {
  hadithReferences: {
    byAyah: (key: string) => Promise<unknown>;
    hadithsByAyah: (key: string, query?: Record<string, unknown>) => Promise<unknown>;
  };
  verses: {
    byKey: (key: string, query?: Record<string, unknown>) => Promise<unknown>;
  };
};

const getContentV4 = (serverClient: Awaited<ReturnType<typeof createClients>>["serverClient"]) =>
  serverClient.content.v4 as unknown as ContentV4Extended;

const getContentV4Raw = (serverClient: Awaited<ReturnType<typeof createClients>>["serverClient"]) =>
  serverClient.content.v4 as unknown as ContentV4Raw;

const callContentRaw = async (
  serverClient: Awaited<ReturnType<typeof createClients>>["serverClient"],
  operation: string,
  path: Record<string, string>,
  query?: Record<string, unknown>,
) => {
  const op = getContentV4Raw(serverClient).raw[operation];
  if (!op) {
    throw new Error(`Content operation "${operation}" is not available.`);
  }
  return op({ path, query });
};

/** Official API: GET /translations/{resource_id}/by_chapter/{chapter_number} */
const loadChapterTranslationsByResource = async (
  serverClient: Awaited<ReturnType<typeof createClients>>["serverClient"],
  chapterId: string,
  resourceId: number,
): Promise<Map<number, string>> => {
  const byVerse = new Map<number, string>();
  let page = 1;
  let totalPages = 1;

  try {
    while (page <= totalPages) {
      const response = await callContentRaw(
        serverClient,
        "listSurahTranslations",
        {
          resource_id: String(resourceId),
          chapter_number: chapterId,
        },
        { page, per_page: READER_PAGE_SIZE },
      );

      const root = asObject(response);
      const pagination = asObject(root.pagination);
      totalPages =
        asNullableNumber(pagination.totalPages ?? pagination.total_pages) ?? totalPages;

      for (const item of toArray(root.translations)) {
        const verseNumber = asNullableNumber(item.verseNumber ?? item.verse_number);
        const text = asNullableString(item.text);
        if (verseNumber !== null && text) {
          byVerse.set(verseNumber, text);
        }
      }

      page += 1;
    }
  } catch {
    return byVerse;
  }

  return byVerse;
};

const AYAH_TRANSLATION_CHUNK = 20;

const normalizeAyahTranslations = (verse: unknown): AyahTranslationItem[] => {
  const root = asObject(verse);
  const items = toArray(root.translations, []);
  return items
    .map((item) => {
      const t = asObject(item);
      const text = asNullableString(t.text);
      const resourceId = asNullableNumber(t.resourceId ?? t.resource_id);
      if (!text || resourceId === null) return null;
      return {
        resourceId,
        resourceName: asString(t.resourceName ?? t.resource_name, `Translation ${resourceId}`),
        text,
      };
    })
    .filter((item): item is AyahTranslationItem => item !== null);
};

const extractAyahTranslationText = (
  response: unknown,
  resourceId: number,
): string | null => {
  const items = normalizeAyahTranslations(response);
  if (items.length > 0) {
    return (
      items.find((t) => t.resourceId === resourceId)?.text ??
      items[0]?.text ??
      null
    );
  }

  const root = asObject(response);
  const direct = asNullableString(root.text);
  if (direct) {
    return direct;
  }

  const nested = asObject(root.translation);
  return asNullableString(nested.text);
};

/** Official API: GET /translations/{resource_id}/by_ayah/{ayah_key} */
const loadAyahTranslationText = async (
  serverClient: Awaited<ReturnType<typeof createClients>>["serverClient"],
  verseKey: string,
  resourceId: number,
): Promise<string | null> => {
  try {
    const response = await callContentRaw(
      serverClient,
      "listAyahTranslations",
      {
        resource_id: String(resourceId),
        ayah_key: verseKey,
      },
      { per_page: 10 },
    );
    return extractAyahTranslationText(response, resourceId);
  } catch {
    return null;
  }
};

const fillVerseTranslationsByAyah = async (
  serverClient: Awaited<ReturnType<typeof createClients>>["serverClient"],
  verses: Array<{
    translationText: string | null;
    verseKey: string | null;
  }>,
  resourceId: number,
) => {
  const targets = verses.filter((v) => v.verseKey && !v.translationText?.trim());
  if (!targets.length) return;

  for (let i = 0; i < targets.length; i += AYAH_TRANSLATION_CHUNK) {
    const chunk = targets.slice(i, i + AYAH_TRANSLATION_CHUNK);
    await Promise.all(
      chunk.map(async (verse) => {
        const text = await loadAyahTranslationText(serverClient, verse.verseKey!, resourceId);
        if (text) {
          verse.translationText = text;
        }
      }),
    );
  }
};

const normalizeHadithReferences = (response: unknown): HadithReferenceItem[] => {
  const root = asObject(response);
  const items = toArray(root.hadithReferences ?? root.hadith_references, []);
  return items.map((item) => ({
    id: Number(item.id) || 0,
    collection: asString(item.collection, "unknown"),
    hadithNumber: asString(item.hadithNumber ?? item.hadith_number, ""),
    ourHadithNumber: asNullableNumber(item.ourHadithNumber ?? item.our_hadith_number),
    ayahStartNumber: asNullableNumber(item.ayahStartNumber ?? item.ayah_start_number),
    ayahEndNumber: asNullableNumber(item.ayahEndNumber ?? item.ayah_end_number),
  }));
};

const normalizeAyahTafsir = (
  verse: unknown,
  fallbackResourceId: number,
): Pick<AyahTafsirPayload, "resourceId" | "resourceName" | "text"> => {
  const root = asObject(verse);
  const items = toArray(root.tafsirs, []);
  const first = items[0] ? asObject(items[0]) : null;
  if (!first) {
    return { resourceId: fallbackResourceId, resourceName: null, text: null };
  }
  return {
    resourceId: asNullableNumber(first.resourceId ?? first.resource_id) ?? fallbackResourceId,
    resourceName: asNullableString(first.resourceName ?? first.resource_name),
    text: asNullableString(first.text),
  };
};

const normalizeHadithNarrations = (response: unknown): HadithNarrationItem[] => {
  const root = asObject(response);
  const items = toArray(root.hadiths, []);
  const narrations: HadithNarrationItem[] = [];

  for (const item of items) {
    const hadith = asObject(item);
    const segments = toArray(hadith.hadith, []);
    const preferred =
      segments.find((segment) => asString(asObject(segment).lang).toLowerCase().startsWith("en")) ??
      segments[0];
    const segment = preferred ? asObject(preferred) : null;
    const body = segment ? asNullableString(segment.body) : null;
    if (!body) continue;

    narrations.push({
      collection: asString(hadith.collection, "unknown"),
      hadithNumber: asString(hadith.hadithNumber ?? hadith.hadith_number, ""),
      title: asNullableString(hadith.name),
      body,
      lang: asString(segment?.lang, "en"),
    });
  }

  return narrations;
};

/**
 * Official API:
 *   GET /hadith_references/by_ayah/{ayah_key}            (returns reference list)
 *   GET /hadith_references/by_ayah/{ayah_key}/hadiths    (returns full narration bodies)
 *
 * The "/hadiths" variant frequently 504s on production for verses with several
 * references, so we always fetch the reference list first and only attempt the
 * narration bodies after, treating it as best-effort. The UI falls back to the
 * reference list when narration bodies are unavailable.
 */
export const loadHadithByAyah = async (
  session: StoredSession,
  verseKey: string,
): Promise<HadithByAyahPayload> => {
  let serverClient: Awaited<ReturnType<typeof createClients>>["serverClient"];
  try {
    ({ serverClient } = await createClients(session));
  } catch (error) {
    return { verseKey, error: formatError(error), references: [], hadiths: [] };
  }

  let references: HadithReferenceItem[] = [];
  let referencesError: string | null = null;
  try {
    const refResponse = await getContentV4(serverClient).hadithReferences.byAyah(verseKey);
    references = normalizeHadithReferences(refResponse);
  } catch (error) {
    referencesError = formatError(error);
  }

  let hadiths: HadithNarrationItem[] = [];
  try {
    const response = await getContentV4(serverClient).hadithReferences.hadithsByAyah(verseKey, {
      limit: 20,
    });
    hadiths = normalizeHadithNarrations(response);
    // Some responses also embed references inline; prefer those when our list is empty.
    if (!references.length) {
      references = normalizeHadithReferences(response);
    }
  } catch {
    // The /hadiths sub-endpoint frequently fails. Keep going with the reference list.
  }

  return {
    verseKey,
    error: references.length || hadiths.length ? null : referencesError,
    references,
    hadiths,
  };
};

/** Official API: GET /translations/{resource_id}/by_ayah/{ayah_key} */
export const loadAyahTranslations = async (
  session: StoredSession,
  verseKey: string,
  translationIds: number[],
): Promise<AyahTranslationsPayload> => {
  try {
    const { serverClient } = await createClients(session);
    const primaryId = translationIds[0];
    if (!primaryId) {
      return { verseKey, error: null, translations: [] };
    }

    const response = await callContentRaw(
      serverClient,
      "listAyahTranslations",
      {
        resource_id: String(primaryId),
        ayah_key: verseKey,
      },
      { per_page: 10 },
    );

    const translations = normalizeAyahTranslations(response);

    if (translations.length > 0) {
      return { verseKey, error: null, translations };
    }

    const extraIds = translationIds.slice(1, 4);
    const extra = await Promise.all(
      extraIds.map(async (id) => {
        try {
          const r = await callContentRaw(
            serverClient,
            "listAyahTranslations",
            { resource_id: String(id), ayah_key: verseKey },
            { per_page: 1 },
          );
          return normalizeAyahTranslations(r)[0] ?? null;
        } catch {
          return null;
        }
      }),
    );

    return {
      verseKey,
      error: null,
      translations: [...translations, ...extra.filter((t): t is AyahTranslationItem => t !== null)],
    };
  } catch (error) {
    return {
      verseKey,
      error: formatError(error),
      translations: [],
    };
  }
};

type QuranReflectV1Raw = {
  raw: Record<
    string,
    (request?: { path?: Record<string, string>; query?: Record<string, unknown> }) => Promise<unknown>
  >;
};

const getQuranReflectV1Raw = (serverClient: Awaited<ReturnType<typeof createClients>>["serverClient"]) =>
  serverClient.quranReflect.v1 as unknown as QuranReflectV1Raw;

const callQuranReflectRaw = async (
  serverClient: Awaited<ReturnType<typeof createClients>>["serverClient"],
  operation: string,
  path: Record<string, string>,
  query?: Record<string, unknown>,
) => {
  const op = getQuranReflectV1Raw(serverClient).raw[operation];
  if (!op) {
    throw new Error(`Quran Reflect operation "${operation}" is not available.`);
  }
  return op({ path, query });
};

const REFLECT_POSTS_PAGE_LIMIT = 30;
const REFLECT_POSTS_MAX_PAGES = 4;

/** Official API: GET /quran-reflect/v1/posts/by-verse/{verseKey} (user auth required) */
export const loadVerseReflections = async (
  session: StoredSession,
  verseKey: string,
): Promise<VerseReflectionsPayload> => {
  const needsSignIn = !session.userSession;

  // Reflections require a signed-in user — all QuranReflect endpoints are auth:"user".
  if (needsSignIn) {
    return { verseKey, error: null, posts: [], needsSignIn: true };
  }

  try {
    const { serverClient } = await createClients(session);
    const posts: FeedItem[] = [];
    const seen = new Set<string>();

    const addPost = (raw: unknown) => {
      const item = normalizeFeedItem(raw);
      const key = item.id ?? `${item.authorName}:${item.body.slice(0, 48)}`;
      if (seen.has(key) || !item.body.trim()) return;
      seen.add(key);
      posts.push(item);
    };

    // First try the direct by-verse endpoint (most precise).
    try {
      const response = await callQuranReflectRaw(
        serverClient,
        "postsControllerGetMyPostsByVerse",
        { verseKey },
        { limit: 20 },
      );
      for (const item of toArray(response, ["data"])) {
        addPost(item);
      }
    } catch {
      // endpoint not available or user has no posts for this verse — try feed fallback
    }

    // If direct lookup returned nothing, scan the feed filtered to this verse.
    if (posts.length < 8) {
      try {
        let page = 1;
        let totalPages = 1;
        while (page <= totalPages && page <= 3 && posts.length < 20) {
          const response = await callQuranReflectRaw(
            serverClient,
            "postsControllerFeed",
            {},
            { page, limit: 30, tab: "feed" },
          );
          const root = asObject(response);
          totalPages = Number(
            root.pages ?? root.totalPages ?? root.total_pages ?? 1,
          ) || 1;
          for (const item of toArray(response, ["data"])) {
            if (postMatchesVerse(item, verseKey)) {
              addPost(item);
            }
          }
          page += 1;
        }
      } catch {
        // feed unavailable
      }
    }

    return {
      verseKey,
      error: null,
      posts: posts.slice(0, 24),
      needsSignIn: false,
    };
  } catch (error) {
    return {
      verseKey,
      error: formatError(error),
      posts: [],
      needsSignIn,
    };
  }
};

export const loadAyahTafsir = async (
  session: StoredSession,
  verseKey: string,
  tafsirResourceId: number,
): Promise<AyahTafsirPayload> => {
  try {
    const { serverClient } = await createClients(session);
    const response = await getContentV4(serverClient).verses.byKey(verseKey, {
      tafsirs: [tafsirResourceId],
    });
    return {
      verseKey,
      error: null,
      ...normalizeAyahTafsir(response, tafsirResourceId),
    };
  } catch (error) {
    return {
      verseKey,
      error: formatError(error),
      resourceId: tafsirResourceId,
      resourceName: null,
      text: null,
    };
  }
};

export const parseVerseKey = (value: unknown): string | null => {
  const trimmed = String(value ?? "").trim();

  if (!/^\d+:\d+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
};

export const normalizeMutationPayload = {
  bookmark: normalizeBookmarkItem,
  collection: normalizeCollectionItem,
  note: normalizeNoteItem,
};
