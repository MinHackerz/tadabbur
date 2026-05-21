import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { selectRandomVerse, getCurrentHijriDate } from "@/lib/tadabbur-helpers";
import { verifyAdminRequest } from "@/lib/admin-auth";

/**
 * Auto-generate new Tadabbur circles when existing ones complete.
 * Called by a cron job (e.g. Vercel Cron) at most once per day.
 *
 * Auth: requires `Authorization: Bearer ${CRON_SECRET}` (or `ADMIN_SECRET`).
 * The previous version trusted the `user-agent` header and accepted requests
 * with no auth at all when the env was unset — both have been removed.
 */
async function authorize(req: NextRequest): Promise<NextResponse | null> {
  const result = verifyAdminRequest(req);
  if (result === "ok") return null;
  if (result === "missing_secret") {
    // Refuse rather than fail open.
    return NextResponse.json(
      { error: "Server is missing CRON_SECRET / ADMIN_SECRET configuration." },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const denied = await authorize(req);
  if (denied) return denied;

  try {
    const now = new Date();
    const TARGET_ACTIVE_CIRCLES = 10;

    // Count ONLY currently active circles (not expired)
    const activeCircles = await prisma.tadabburCircle.findMany({
      where: {
        isActive: true,
        endDate: {
          gte: now.toISOString(), // Only circles that haven't expired
        },
      },
      orderBy: {
        startDate: "asc",
      },
    });

    const currentActiveCount = activeCircles.length;
    const circlesToGenerate = TARGET_ACTIVE_CIRCLES - currentActiveCount;

    // If we already have 10 active circles, do nothing
    if (circlesToGenerate <= 0) {
      return NextResponse.json({
        success: true,
        message: `Target of ${TARGET_ACTIVE_CIRCLES} active circles already met`,
        activeCircles: currentActiveCount,
        action: "none",
      });
    }

    // Generate the needed circles to reach 10 active
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
      // If latest circle hasn't ended yet, start new circles after it
      if (latestEndDate > now) {
        baseStartDate = new Date(latestEndDate);
        baseStartDate.setDate(baseStartDate.getDate() + 1);
      }
      // Otherwise start from today
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
    const usedVerseKeys = new Set(existingVerses.map((v) => v.verseKey));

    for (let i = 0; i < circlesToGenerate; i++) {
      // Try to find a verse that hasn't been used this year
      let verseKey = selectRandomVerse();
      let attempts = 0;
      const maxAttempts = 50;

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
      endDate.setDate(endDate.getDate() + 15); // 15-day circles

      try {
        const circle = await prisma.tadabburCircle.create({
          data: {
            verseKey,
            hijriMonth: hijriDate.month,
            hijriYear: hijriDate.year,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            isActive: true,
          },
        });

        newCircles.push(circle);
        usedVerseKeys.add(verseKey);
      } catch (error) {
        if (error instanceof Error && error.message.includes("Unique constraint")) {
          errors.push(`Verse ${verseKey} already exists for year ${hijriDate.year}`);
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${newCircles.length} new circles to reach target of ${TARGET_ACTIVE_CIRCLES}`,
      circlesGenerated: newCircles.length,
      previousActiveCount: currentActiveCount,
      newActiveCount: currentActiveCount + newCircles.length,
      circles: newCircles.map((c) => ({
        id: c.id,
        verseKey: c.verseKey,
        startDate: c.startDate,
        endDate: c.endDate,
      })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[/api/tadabbur/auto-generate POST]", error);
    // Don't leak internal error details to the caller.
    return NextResponse.json(
      { error: "Failed to auto-generate circles" },
      { status: 500 },
    );
  }
}

// GET endpoint for Vercel Cron (Vercel Cron uses GET by default).
// The same auth check runs again because we delegate straight to POST.
export async function GET(req: NextRequest) {
  return POST(req);
}
