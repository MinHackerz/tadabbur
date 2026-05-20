import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { selectRandomVerse, getCurrentHijriDate } from "@/lib/tadabbur-helpers";

/**
 * Auto-generate new Tadabbur circles when existing ones complete
 * This endpoint should be called by a cron job daily
 * 
 * Cron setup (using Vercel Cron or similar):
 * - Schedule: 0 0 * * * (daily at midnight UTC)
 * - Endpoint: POST /api/tadabbur/auto-generate
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    // Vercel Cron sends special headers
    const authHeader = req.headers.get("authorization");
    const vercelCronHeader = req.headers.get("x-vercel-cron");
    const vercelSignature = req.headers.get("x-vercel-signature");
    const cronSecret = process.env.CRON_SECRET || "dev-secret-change-in-production";
    
    // Log headers for debugging
    console.log("[auto-generate] Headers:", {
      hasAuth: !!authHeader,
      vercelCron: vercelCronHeader,
      hasSignature: !!vercelSignature,
      userAgent: req.headers.get("user-agent"),
    });
    
    // Allow if:
    // 1. Has Vercel Cron header (any value)
    // 2. Has Vercel Signature (Vercel's way of authenticating)
    // 3. Has correct Bearer token
    // 4. User agent is vercel-cron
    const userAgent = req.headers.get("user-agent") || "";
    const isVercelCron = vercelCronHeader !== null || 
                         vercelSignature !== null || 
                         userAgent.includes("vercel-cron");
    const hasValidToken = authHeader === `Bearer ${cronSecret}`;
    const isAuthorized = isVercelCron || hasValidToken;
    
    if (!isAuthorized) {
      console.error("[auto-generate] Unauthorized attempt");
      return NextResponse.json({ 
        error: "Unauthorized",
        hint: "This endpoint requires Vercel Cron or valid Bearer token"
      }, { status: 401 });
    }
    
    console.log("[auto-generate] Authorized via:", isVercelCron ? "Vercel Cron" : "Bearer token");

    const now = new Date();
    const TARGET_ACTIVE_CIRCLES = 10; // Generate 10 unique circles
    
    // Check currently active circles AND upcoming circles (within next 15 days)
    // This ensures we maintain a pipeline of circles and generate new ones as they complete
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + 15);
    
    const activeAndUpcomingCircles = await prisma.tadabburCircle.findMany({
      where: {
        startDate: {
          lte: futureDate.toISOString(),
        },
        endDate: {
          gte: now.toISOString(),
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    const currentCount = activeAndUpcomingCircles.length;
    const circlesToGenerate = TARGET_ACTIVE_CIRCLES - currentCount;

    // If we need more circles to reach the target
    if (circlesToGenerate > 0) {
      const newCircles = [];
      const errors = [];

      // Find the latest end date to stagger new circles after it
      const allCircles = await prisma.tadabburCircle.findMany({
        orderBy: {
          endDate: "desc",
        },
        take: 1,
      });

      let baseStartDate = new Date(now);
      if (allCircles.length > 0) {
        const latestEndDate = new Date(allCircles[0].endDate);
        // Start new circles 1 day after the latest circle ends
        baseStartDate = new Date(latestEndDate);
        baseStartDate.setDate(baseStartDate.getDate() + 1);
      }

      // Get all existing verse keys for the current Hijri year to avoid duplicates
      const hijriDate = getCurrentHijriDate();
      const existingVerses = await prisma.tadabburCircle.findMany({
        where: {
          hijriYear: hijriDate.year,
        },
        select: {
          verseKey: true,
        },
      });
      const usedVerseKeys = new Set(existingVerses.map(v => v.verseKey));

      for (let i = 0; i < circlesToGenerate; i++) {
        // Try to find a verse that hasn't been used this year
        let verseKey = selectRandomVerse();
        let attempts = 0;
        const maxAttempts = 50; // Prevent infinite loop
        
        while (usedVerseKeys.has(verseKey) && attempts < maxAttempts) {
          verseKey = selectRandomVerse();
          attempts++;
        }

        if (usedVerseKeys.has(verseKey)) {
          errors.push(`Could not find unused verse after ${maxAttempts} attempts`);
          continue;
        }

        const startDate = new Date(baseStartDate);
        startDate.setDate(startDate.getDate() + i); // Stagger start dates
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 15);

        try {
          const circle = await prisma.tadabburCircle.create({
            data: {
              verseKey,
              hijriMonth: hijriDate.month,
              hijriYear: hijriDate.year,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            },
          });

          newCircles.push(circle);
          usedVerseKeys.add(verseKey); // Mark as used
        } catch (error) {
          // If unique constraint fails, skip this verse
          if (error instanceof Error && error.message.includes('Unique constraint')) {
            errors.push(`Verse ${verseKey} already exists for year ${hijriDate.year}`);
          } else {
            throw error;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Generated ${newCircles.length} new circles (${currentCount} were already active/upcoming)`,
        circlesGenerated: newCircles.length,
        previousCount: currentCount,
        totalCount: currentCount + newCircles.length,
        circles: newCircles,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Target of ${TARGET_ACTIVE_CIRCLES} active/upcoming circles already met`,
      activeAndUpcomingCircles: currentCount,
    });
  } catch (error) {
    console.error("[/api/tadabbur/auto-generate POST]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    return NextResponse.json({ 
      error: "Failed to auto-generate circles",
      details: errorMessage,
      stack: process.env.NODE_ENV === "development" ? errorStack : undefined
    }, { status: 500 });
  }
}

// Manual trigger endpoint for testing
export async function GET(req: NextRequest) {
  try {
    // Allow manual trigger in development
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Only available in development" }, { status: 403 });
    }

    // Call the POST handler
    const response = await POST(req);
    return response;
  } catch (error) {
    console.error("[/api/tadabbur/auto-generate GET]", error);
    return NextResponse.json({ error: "Failed to auto-generate circles" }, { status: 500 });
  }
}
