import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { generateTadabburContent, isOpenAIConfigured } from "@/lib/chatgpt";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const circleId = searchParams.get("circleId");
    const day = searchParams.get("day");
    const angleType = searchParams.get("angleType");
    const verseKey = searchParams.get("verseKey");
    const verseText = searchParams.get("verseText");
    const verseTranslation = searchParams.get("verseTranslation");

    if (!circleId || !day || !angleType) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Check cache first
    const cached = await prisma.tadabburCachedContent.findUnique({
      where: {
        circleId_day_angleType: {
          circleId,
          day: parseInt(day),
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
      return NextResponse.json({
        error: "OpenAI API not configured",
        content: "This content requires OpenAI API integration. Please configure OPENAI_API_KEY in your environment variables.",
      }, { status: 503 });
    }

    // Generate content if not cached
    if (!verseKey || !verseText || !verseTranslation) {
      return NextResponse.json({ error: "Verse information required for content generation" }, { status: 400 });
    }

    const result = await generateTadabburContent(
      verseKey,
      verseText,
      verseTranslation,
      angleType
    );

    // Cache the result
    await prisma.tadabburCachedContent.create({
      data: {
        circleId,
        day: parseInt(day),
        angleType,
        content: result.content,
        sources: result.sources || null,
      },
    });

    return NextResponse.json({
      content: result.content,
      sources: result.sources,
      tavilyResults: result.tavilyResults,
      cached: false,
    });
  } catch (error) {
    console.error("[/api/tadabbur/content GET]", error);
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Failed to fetch content", detail: msg }, { status: 500 });
  }
}
