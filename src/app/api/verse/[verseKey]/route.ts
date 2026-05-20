import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClients } from "@/lib/sdk";

export const dynamic = "force-dynamic";

const DEFAULT_TRANSLATION_ID = 131; // Dr. Mustafa Khattab - The Clear Quran

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ verseKey: string }> },
) {
  try {
    const { verseKey } = await context.params;
    const sessionContext = await getSession(request);
    const { serverClient } = await createClients(sessionContext.session);

    // Parse verse key (e.g., "2:286" -> chapter 2, verse 286)
    const [chapterStr, verseStr] = verseKey.split(":");
    const chapterId = chapterStr;
    const verseNumber = parseInt(verseStr, 10);

    if (!chapterId || !verseNumber) {
      return NextResponse.json(
        { error: "Invalid verse key format. Expected format: chapter:verse (e.g., 2:286)" },
        { status: 400 }
      );
    }

    // Fetch the specific verse with translation
    const response = await serverClient.content.v4.verses.byChapter(chapterId, {
      fields: {
        textUthmani: true,
      },
      page: Math.ceil(verseNumber / 50), // 50 verses per page
      perPage: 50,
      translations: [DEFAULT_TRANSLATION_ID],
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
      return NextResponse.json(
        { error: "Verse not found" },
        { status: 404 }
      );
    }

    // Extract translation
    const translations = Array.isArray(verse.translations) ? verse.translations : [];
    const translation = translations.find((t: any) => {
      const resourceId = t.resourceId ?? t.resource_id;
      return resourceId === DEFAULT_TRANSLATION_ID;
    });

    const translationText = translation?.text ?? null;
    const arabicText = verse.textUthmani ?? verse.text_uthmani ?? null;

    return NextResponse.json({
      verseKey,
      arabic: arabicText,
      translation: translationText,
      verseNumber,
      chapterId: parseInt(chapterId, 10),
    });
  } catch (error) {
    console.error("[/api/verse/[verseKey] GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch verse data" },
      { status: 500 }
    );
  }
}
