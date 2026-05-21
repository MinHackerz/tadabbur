import { NextRequest } from "next/server";
import { getConfig } from "@/lib/env";
import { getSession } from "@/lib/session";
import { withSessionJson } from "@/lib/route-helpers";
import {
  SUPPORTED_TRANSLATION_IDS,
  DEFAULT_TRANSLATION_ID,
  parsePositiveInteger,
} from "@/lib/data";
import { getAppToken } from "@/lib/sdk";
import { getUserFromSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

// Curated seed verse keys per emotion — used as deterministic fallback and to
// ensure at least one relevant result even when search is unavailable.
const EMOTION_VERSE_POOLS: Record<string, string[]> = {
  anxious: [
    "13:28", "2:286", "94:5", "94:6", "65:3", "2:155", "3:173", "9:51",
    "2:45", "11:88", "28:7", "93:5",
  ],
  grateful: [
    "14:7", "16:114", "2:172", "31:12", "27:40", "39:7", "34:13", "17:3",
    "76:3", "55:13", "7:144", "2:152",
  ],
  lost: [
    "93:7", "93:8", "2:269", "18:10", "10:35", "6:125", "4:175",
    "57:28", "2:257", "24:35", "47:5",
  ],
  sorrowful: [
    "3:139", "12:87", "39:53", "21:83", "2:286", "94:1", "94:5",
    "48:4", "9:40", "5:26", "7:126",
  ],
  seeking_peace: [
    "59:23", "13:28", "2:112", "41:30", "10:62", "46:13", "98:8",
    "89:27", "89:28", "3:200", "48:18",
  ],
  hopeful: [
    "94:5", "94:6", "2:286", "3:139", "12:87", "65:3", "39:53",
    "2:153", "29:2", "3:200", "8:46",
  ],
  overwhelmed: [
    "2:286", "65:3", "94:5", "13:28", "2:153", "3:173", "8:49",
    "11:88", "29:69", "2:45", "39:53",
  ],
  joyful: [
    "10:58", "14:7", "16:114", "39:7", "55:13", "27:40", "2:152",
    "76:3", "34:13", "17:3", "31:12",
  ],
  repentant: [
    "2:222", "39:53", "25:70", "4:110", "73:20", "11:90", "2:160",
    "3:135", "4:17", "66:8", "24:31",
  ],
  patient: [
    "11:115", "2:153", "3:200", "16:127", "46:35", "70:5", "103:3",
    "2:45", "2:177", "8:46", "31:17",
  ],
  fearful: [
    "20:46", "3:173", "3:175", "9:51", "2:38", "41:30", "46:13",
    "10:62", "2:112", "5:69", "43:68",
  ],
  lonely: [
    "57:4", "2:186", "50:16", "58:7", "4:108", "11:61", "2:153",
    "29:69", "94:1", "93:7", "20:46",
  ],
  determined: [
    "3:159", "65:3", "8:49", "11:88", "29:69", "4:100", "9:51",
    "3:173", "64:13", "58:21", "48:29",
  ],
  confused: [
    "65:2", "65:3", "2:269", "18:10", "6:125", "93:7", "20:50",
    "10:35", "24:35", "39:9", "4:175",
  ],
  content: [
    "10:62", "13:28", "2:112", "89:27", "89:28", "98:8", "5:119",
    "9:72", "58:22", "48:18", "3:15",
  ],
};

// Search queries that reliably return on-theme verses from the Quran CDN.
const EMOTION_SEARCH_QUERIES: Record<string, string> = {
  anxious:       "reassurance trust Allah relief",
  grateful:      "gratitude blessings thankful",
  lost:          "guidance path Allah",
  sorrowful:     "do not grieve patience sorrow",
  seeking_peace: "peace tranquility serenity heart",
  hopeful:       "hope ease hardship relief",
  overwhelmed:   "burden ease Allah help",
  joyful:        "rejoice bounty mercy blessings",
  repentant:     "forgiveness repentance mercy",
  patient:       "patience reward perseverance",
  fearful:       "fear not protection Allah",
  lonely:        "Allah with you near close",
  determined:    "rely trust Allah strength",
  confused:      "guidance clarity way out",
  content:       "contentment peace satisfaction",
};

interface EmotionVerseResult {
  verses: Array<{
    verseKey: string;
    surahId: number;
    verseNumber: number;
    arabicText: string | null;
    translationText: string | null;
  }>;
  error: string | null;
}

function seedFromDayAndEmotion(emotion: string): number {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  // Simple deterministic hash combining day + emotion key
  let hash = dayIndex;
  for (let i = 0; i < emotion.length; i++) {
    hash = (hash * 31 + emotion.charCodeAt(i)) & 0xfffffff;
  }
  return Math.abs(hash);
}

export async function GET(request: NextRequest) {
  // Require an authenticated user. This endpoint fans out to the upstream
  // content API (token-cost) and previously had no auth, making it an easy
  // abuse vector. Reading verses by emotion is a logged-in feature.
  const sessionContext = await getSession(request);
  const user = await getUserFromSession(request);
  if (!user) {
    return withSessionJson(
      sessionContext,
      { error: "Unauthorized", verses: [] },
      401,
    );
  }

  const emotion = (request.nextUrl.searchParams.get("emotion") ?? "")
    .trim()
    .toLowerCase();
  const trParam = request.nextUrl.searchParams.get("tr");
  const config = getConfig();
  const trId =
    trParam && SUPPORTED_TRANSLATION_IDS.has(parsePositiveInteger(trParam) ?? -1)
      ? (parsePositiveInteger(trParam) as number)
      : config.translationIds.find((id) => SUPPORTED_TRANSLATION_IDS.has(id)) ??
        DEFAULT_TRANSLATION_ID;

  const pool = EMOTION_VERSE_POOLS[emotion];
  const searchQuery = EMOTION_SEARCH_QUERIES[emotion];

  if (!pool || !searchQuery) {
    return withSessionJson(
      sessionContext,
      {
        error: `Unknown emotion: ${emotion}. Valid emotions: ${Object.keys(
          EMOTION_VERSE_POOLS,
        ).join(", ")}.`,
        verses: [],
      },
      400,
    );
  }

  const seed = seedFromDayAndEmotion(emotion);

  // Try to get a verse from the search API, broadening our pool.
  const allCandidates: string[] = [...pool];
  try {
    const params = new URLSearchParams({
      q: searchQuery,
      size: "15",
      language: "en",
      filter_translations: String(trId),
    });
    const resp = await fetch(
      `https://api.qurancdn.com/api/qdc/search?${params.toString()}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5_000) },
    );
    if (resp.ok) {
      const json = (await resp.json()) as {
        result?: { verses?: { verse_key?: string }[] };
      };
      const fromSearch: string[] = (json.result?.verses ?? [])
        .map((v) => v.verse_key ?? "")
        .filter(Boolean);
      // Merge search results and deduplicate, keeping the curated pool as fallback.
      const seen = new Set(allCandidates);
      for (const key of fromSearch) {
        if (!seen.has(key)) {
          seen.add(key);
          allCandidates.push(key);
        }
      }
    }
  } catch {
    // Search unavailable — fall through to the curated pool.
  }

  // Pick 4-6 verses deterministically from the merged pool using today's seed.
  // We aim for more to ensure at least 2 make it through after filtering.
  const COUNT = Math.min(6, allCandidates.length);
  const pickedKeys: string[] = [];
  for (let i = 0; i < COUNT; i++) {
    const idx = (seed + i * 7) % allCandidates.length;
    const key = allCandidates[idx];
    if (!pickedKeys.includes(key)) {
      pickedKeys.push(key);
    }
  }

  // Fetch all verses in parallel
  const contentBase =
    config.services?.contentBaseUrl ?? "https://apis.quran.foundation/content";
  const oauth2Base = config.services?.oauth2BaseUrl ?? config.oauth2BaseUrl;

  try {
    const token = await getAppToken(config.clientId, config.clientSecret, oauth2Base);

    const versePromises = pickedKeys.map(async (pickedKey) => {
      const [surahIdStr, verseNumberStr] = pickedKey.split(":");
      const surahId = Number(surahIdStr);
      const verseNumber = Number(verseNumberStr);

      try {
        const PAGE_SIZE = 50;
        const page = Math.max(1, Math.ceil(verseNumber / PAGE_SIZE));
        const contentParams = new URLSearchParams({
          translations: String(trId),
          fields: "text_uthmani",
          per_page: String(PAGE_SIZE),
          page: String(page),
        });
        const url = `${contentBase}/api/v4/verses/by_chapter/${surahId}?${contentParams.toString()}`;

        const contentResp = await fetch(url, {
          headers: {
            "x-auth-token": token,
            "x-client-id": config.clientId,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(8_000),
        });

        if (contentResp.ok) {
          const data = (await contentResp.json()) as {
            verses?: {
              verse_number?: number;
              text_uthmani?: string;
              translations?: { text?: string }[];
            }[];
          };
          const verse = (data.verses ?? []).find((v) => v.verse_number === verseNumber);
          if (verse) {
            return {
              verseKey: pickedKey,
              surahId,
              verseNumber,
              arabicText: verse.text_uthmani ?? null,
              translationText:
                verse.translations?.[0]?.text?.replace(/<[^>]+>/g, "") ?? null,
            };
          }
        }
      } catch {
        // Silently fail - graceful degradation
      }

      return null;
    });

    const fetchedVerses = (await Promise.all(versePromises)).filter(
      (v): v is NonNullable<typeof v> =>
        v !== null && v.arabicText !== null && v.translationText !== null,
    );

    // Return exactly 2 verses
    if (fetchedVerses.length >= 2) {
      const result: EmotionVerseResult = {
        verses: fetchedVerses.slice(0, 2),
        error: null,
      };
      return withSessionJson(sessionContext, result);
    }
  } catch {
    // Silently fail - will fall through to fallback
  }

  // Fallback: if API fails completely, return the static verse pool keys
  // This ensures users always see something
  return withSessionJson(sessionContext, {
    verses: pickedKeys.slice(0, 2).map((key) => {
      const [surahIdStr, verseNumberStr] = key.split(":");
      return {
        verseKey: key,
        surahId: Number(surahIdStr),
        verseNumber: Number(verseNumberStr),
        arabicText: null,
        translationText: null,
      };
    }),
    error: "Could not fetch verses. Please check your connection.",
  });
}
