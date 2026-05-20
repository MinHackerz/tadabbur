import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClients } from "@/lib/sdk";
import { getConfig } from "@/lib/env";

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
    // For shorter chapters, always use page 1
    const response = await serverClient.content.v4.verses.byChapter(chapterId, {
      fields: {
        textUthmani: true,
      },
      page: 1, // Always fetch from page 1 for simplicity
      perPage: 300, // Increase to cover all verses in any chapter
      translations: [translationId],
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

    // Extract translation - check multiple possible field names
    const translations = Array.isArray(verse.translations) ? verse.translations : [];
    const translation = translations.find((t: any) => {
      const resourceId = t.resourceId ?? t.resource_id;
      return resourceId === translationId;
    });

    // Try multiple possible field names for translation text
    let translationText = translation?.text ?? translation?.translationText ?? null;
    
    // If still null, try the first translation available
    if (!translationText && translations.length > 0) {
      translationText = translations[0]?.text ?? translations[0]?.translationText ?? null;
    }

    const arabicText = verse.textUthmani ?? verse.text_uthmani ?? null;

    return NextResponse.json({
      verseKey,
      arabic: arabicText,
      translation: translationText,
      verseNumber,
      chapterId: parseInt(chapterId, 10),
    });
  } catch (error) {
    console.error("[/api/verse/[verseKey] GET] Error:", error);
    console.error("[/api/verse/[verseKey] GET] Error stack:", error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: "Failed to fetch verse data", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
