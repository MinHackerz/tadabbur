import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClients } from "@/lib/sdk";
import { getConfig } from "@/lib/env";

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
    const verseKey = searchParams.get("verseKey");

    if (!verseKey) {
      return NextResponse.json({ error: "verseKey is required" }, { status: 400 });
    }

    const [chapterStr, verseStr] = verseKey.split(":");
    const chapterId = chapterStr;
    const verseNumber = parseInt(verseStr, 10);

    if (!chapterId || !verseNumber) {
      return NextResponse.json({ error: "Invalid verseKey format" }, { status: 400 });
    }

    const sessionContext = await getSession(req);
    const { serverClient } = await createClients(sessionContext.session);

    // Fetch verse with all translation IDs
    const translationIds = TRANSLATION_RESOURCES.map(t => t.id);
    
    const response = await serverClient.content.v4.verses.byChapter(chapterId, {
      fields: { textUthmani: true },
      page: 1,
      perPage: 300,
      translations: translationIds,
      words: false,
    });

    // Extract verses from response
    const responseData = response as any;
    const data = responseData.data || responseData;
    const verses = Array.isArray(data.verses) ? data.verses : [];

    // Find the specific verse
    const verse = verses.find((v: any) => {
      const vNum = v.verseNumber ?? v.verse_number;
      return vNum === verseNumber;
    });

    if (!verse) {
      return NextResponse.json({ error: "Verse not found" }, { status: 404 });
    }

    // Extract translations
    const verseTranslations = Array.isArray(verse.translations) ? verse.translations : [];
    
    const translations = TRANSLATION_RESOURCES.map(resource => {
      const found = verseTranslations.find((t: any) => {
        const resourceId = t.resourceId ?? t.resource_id;
        return resourceId === resource.id;
      });

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
    }).filter(t => t.text !== null); // Only return translations that have text

    return NextResponse.json({ translations, verseKey });
  } catch (error) {
    console.error("[/api/tadabbur/translations GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch translations", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
