import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClients } from "@/lib/sdk";
import { parseVerseKeyStrict } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Translation resources to fetch for comparison
const TRANSLATION_RESOURCES = [
  { id: 85, name: "Abdel Haleem", author: "M.A.S. Abdel Haleem" },
  { id: 20, name: "Saheeh International", author: "Saheeh International" },
  { id: 95, name: "Pickthall", author: "Mohammed Marmaduke Pickthall" },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = parseVerseKeyStrict(searchParams.get("verseKey"));

    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid verseKey format" },
        { status: 400 },
      );
    }

    const sessionContext = await getSession(req);
    const { serverClient } = await createClients(sessionContext.session);

    // Fetch verse with all translation IDs
    const translationIds = TRANSLATION_RESOURCES.map((t) => t.id);

    const response = await serverClient.content.v4.verses.byChapter(
      String(parsed.surahId),
      {
        fields: { textUthmani: true },
        page: 1,
        perPage: 300,
        translations: translationIds,
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
      return vNum === parsed.verseNumber;
    }) as Record<string, unknown> | undefined;

    if (!verse) {
      return NextResponse.json({ error: "Verse not found" }, { status: 404 });
    }

    // Extract translations
    const verseTranslations = Array.isArray(verse.translations)
      ? verse.translations
      : [];

    const translations = TRANSLATION_RESOURCES.map((resource) => {
      const found = (verseTranslations as unknown[]).find((t: unknown) => {
        const o = t as { resourceId?: number; resource_id?: number };
        const resourceId = o.resourceId ?? o.resource_id;
        return resourceId === resource.id;
      }) as { text?: string } | undefined;

      const text = found?.text ?? null;
      // Strip HTML tags from translation text
      const cleanText = text ? text.replace(/<[^>]+>/g, "") : null;

      return {
        id: resource.id,
        name: resource.name,
        author_name: resource.author,
        text: cleanText,
        language_name: "English",
      };
    }).filter((t) => t.text !== null); // Only return translations that have text

    return NextResponse.json({ translations, verseKey: parsed.verseKey });
  } catch (error) {
    console.error("[/api/tadabbur/translations GET]", error);
    return NextResponse.json({ error: "Failed to fetch translations" }, { status: 500 });
  }
}
