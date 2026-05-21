import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import {
  generateTadabburContent,
  isOpenAIConfigured,
  isTadabburAngle,
} from "@/lib/chatgpt";
import { getUserFromSession } from "@/lib/auth-helpers";
import {
  asTrimmedString,
  asBoundedInt,
  parseVerseKeyStrict,
  MAX_SHORT_STRING,
  MAX_MEDIUM_STRING,
} from "@/lib/validation";

/**
 * AI-backed tadabbur content generation. This calls OpenAI (and optionally
 * Tavily) per uncached `(circleId, day, angleType)` triple, so it must be
 * gated behind authentication. Previously this route was unauthenticated,
 * giving anyone a way to drain the API budget by enumerating IDs.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromSession(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const circleId = asTrimmedString(searchParams.get("circleId"), MAX_SHORT_STRING);
    const day = asBoundedInt(searchParams.get("day"), 1, 60);
    const angleType = asTrimmedString(searchParams.get("angleType"), MAX_SHORT_STRING);
    const verseKey = searchParams.get("verseKey");
    const verseText = asTrimmedString(searchParams.get("verseText"), MAX_MEDIUM_STRING);
    const verseTranslation = asTrimmedString(
      searchParams.get("verseTranslation"),
      MAX_MEDIUM_STRING,
    );

    if (!circleId || day == null || !angleType) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 },
      );
    }

    if (!isTadabburAngle(angleType)) {
      return NextResponse.json(
        { error: "Unknown angleType." },
        { status: 400 },
      );
    }

    // Make sure the circle actually exists before we cache rows against it.
    const circle = await prisma.tadabburCircle.findUnique({
      where: { id: circleId },
      select: { id: true, verseKey: true },
    });
    if (!circle) {
      return NextResponse.json({ error: "Unknown circle." }, { status: 404 });
    }

    // Check cache first
    const cached = await prisma.tadabburCachedContent.findUnique({
      where: {
        circleId_day_angleType: {
          circleId,
          day,
          angleType,
        },
      },
    });

    if (cached) {
      return NextResponse.json({
        content: cached.content,
        sources: cached.sources,
        cached: true,
      });
    }

    // Check if OpenAI is configured
    const configured = await isOpenAIConfigured();
    if (!configured) {
      return NextResponse.json(
        {
          error: "OpenAI API not configured",
          content:
            "This content requires OpenAI API integration. Please configure OPENAI_API_KEY in your environment variables.",
        },
        { status: 503 },
      );
    }

    // Generate content if not cached. Re-derive verse info from the circle so
    // a caller can't supply arbitrary verse text and pollute the cache.
    const parsed = parseVerseKeyStrict(verseKey ?? circle.verseKey);
    if (!parsed || !verseText || !verseTranslation) {
      return NextResponse.json(
        { error: "Verse information required for content generation" },
        { status: 400 },
      );
    }

    const result = await generateTadabburContent(
      parsed.verseKey,
      verseText,
      verseTranslation,
      angleType,
    );

    // Cache the result
    await prisma.tadabburCachedContent.create({
      data: {
        circleId,
        day,
        angleType,
        content: result.content,
        sources: result.sources || null,
      },
    });

    return NextResponse.json({
      content: result.content,
      sources: result.sources,
      cached: false,
    });
  } catch (error) {
    console.error("[/api/tadabbur/content GET]", error);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}
