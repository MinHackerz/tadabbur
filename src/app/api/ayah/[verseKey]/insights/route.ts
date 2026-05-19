import { NextRequest } from "next/server";

import {
  loadAyahTafsir,
  loadAyahTranslations,
  loadHadithByAyah,
  loadVerseReflections,
  parsePositiveInteger,
  parseVerseKey,
} from "@/lib/data";
import { TRANSLATIONS } from "@/components/reader/readerSession";
import { getSession } from "@/lib/session";
import { withSessionJson } from "@/lib/route-helpers";

export const dynamic = "force-dynamic";

type InsightType = "hadith" | "translations" | "tafsir" | "reflect";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ verseKey: string }> },
) {
  const { verseKey: rawKey } = await context.params;
  const sessionContext = await getSession(request);
  const verseKey = parseVerseKey(decodeURIComponent(rawKey));

  if (!verseKey) {
    return withSessionJson(
      sessionContext,
      { message: "Invalid verse key. Use chapter:verse (e.g. 2:255).", ok: false },
      400,
    );
  }

  const type = request.nextUrl.searchParams.get("type") as InsightType | null;
  if (!type || !["hadith", "translations", "tafsir", "reflect"].includes(type)) {
    return withSessionJson(
      sessionContext,
      { message: "Query param type must be hadith, translations, tafsir, or reflect.", ok: false },
      400,
    );
  }

  try {
    if (type === "hadith") {
      const payload = await loadHadithByAyah(sessionContext.session, verseKey);
      return withSessionJson(sessionContext, payload);
    }

    if (type === "reflect") {
      const payload = await loadVerseReflections(sessionContext.session, verseKey);
      return withSessionJson(sessionContext, payload);
    }

    if (type === "translations") {
      const trParam = request.nextUrl.searchParams.get("tr");
      const ids = trParam
        ? trParam.split(",").map((v) => parsePositiveInteger(v.trim())).filter((n): n is number => n !== null)
        : TRANSLATIONS.map((t) => Number(t.id));
      const payload = await loadAyahTranslations(sessionContext.session, verseKey, ids);
      return withSessionJson(sessionContext, payload);
    }

    const tafsirId = parsePositiveInteger(request.nextUrl.searchParams.get("tafsirId") ?? "168") ?? 168;
    const payload = await loadAyahTafsir(sessionContext.session, verseKey, tafsirId);
    return withSessionJson(sessionContext, payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return withSessionJson(sessionContext, { message, ok: false }, 500);
  }
}
