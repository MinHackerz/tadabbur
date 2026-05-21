import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClients } from "@/lib/sdk";
import { getConfig } from "@/lib/env";
import { parseVerseKeyStrict } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Use the app's configured translation IDs
const getTranslationId = () => {
  const config = getConfig();
  return config.translationIds[0] ?? 85; // Default to Abdel Haleem
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ verseKey: string }> },
) {
  try {
    const { verseKey } = await context.params;
    const sessionContext = await getSession(request);
    const { serverClient } = await createClients(sessionContext.session);

    const translationId = getTranslationId();

    // Strict parse — both chapter and verse must be valid integers in range.
    // Previously we left chapterId as a string, which let `chapterId="0"`
    // pass the `!chapterId` check and reach the upstream API.
    const parsed = parseVerseKeyStrict(verseKey);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Invalid verse key format. Expected format: chapter:verse (e.g., 2:286)",
        },
        { status: 400 },
      );
    }
    const { surahId: chapterId, verseNumber } = parsed;

    // Fetch the specific verse with translation
    // For shorter chapters, always use page 1
    const response = await serverClient.content.v4.verses.byChapter(
      String(chapterId),
      {
        fields: {
          textUthmani: true,
        },
        page: 1, // Always fetch from page 1 for simplicity
        perPage: 300, // Increase to cover all verses in any chapter
        translations: [translationId],
        words: false,
      },
    );

    // Extract verses from response
    const responseData = response as Record<string, unknown> & {
      data?: Record<string, unknown>;
      verses?: unknown[];
    };
    const data = (responseData.data ?? responseData) as Record<string, unknown>;
    const verses = Array.isArray(data.verses) ? data.verses : [];

    // Find the specific verse
    const verse = verses.find((v: unknown) => {
      const o = v as { verseNumber?: number; verse_number?: number };
      const vNum = o.verseNumber ?? o.verse_number;
      return vNum === verseNumber;
    }) as Record<string, unknown> | undefined;

    if (!verse) {
      return NextResponse.json({ error: "Verse not found" }, { status: 404 });
    }

    // Extract translation - check multiple possible field names
    const translations = Array.isArray((verse as { translations?: unknown[] }).translations)
      ? ((verse as { translations: unknown[] }).translations)
      : [];
    const translation = (translations as unknown[]).find((t: unknown) => {
      const o = t as { resourceId?: number; resource_id?: number };
      const resourceId = o.resourceId ?? o.resource_id;
      return resourceId === translationId;
    }) as { text?: string; translationText?: string } | undefined;

    // Try multiple possible field names for translation text
    let translationText: string | null =
      translation?.text ?? translation?.translationText ?? null;

    // If still null, try the first translation available
    if (!translationText && translations.length > 0) {
      const t0 = translations[0] as { text?: string; translationText?: string };
      translationText = t0.text ?? t0.translationText ?? null;
    }

    const arabicText =
      ((verse as { textUthmani?: string; text_uthmani?: string }).textUthmani ??
        (verse as { textUthmani?: string; text_uthmani?: string }).text_uthmani) ??
      null;

    return NextResponse.json({
      verseKey: parsed.verseKey,
      arabic: arabicText,
      translation: translationText,
      verseNumber,
      chapterId,
    });
  } catch (error) {
    console.error("[/api/verse/[verseKey] GET] Error:", error);
    console.error(
      "[/api/verse/[verseKey] GET] Error stack:",
      error instanceof Error ? error.stack : "No stack",
    );
    return NextResponse.json({ error: "Failed to fetch verse data" }, { status: 500 });
  }
}
