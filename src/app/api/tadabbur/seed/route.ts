import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { selectRandomVerse, getCurrentHijriDate } from "@/lib/tadabbur-helpers";
import { verifyAdminRequest } from "@/lib/admin-auth";

/**
 * Admin-only: seed a single circle if one doesn't already exist for the
 * randomly chosen verse this Hijri year. Prefer `/api/tadabbur/auto-generate`
 * for routine population.
 *
 * Now requires `Authorization: Bearer ${ADMIN_SECRET}`.
 */
export async function POST(req: NextRequest) {
  const auth = verifyAdminRequest(req);
  if (auth === "missing_secret") {
    return NextResponse.json(
      { error: "Server is missing CRON_SECRET / ADMIN_SECRET configuration." },
      { status: 503 },
    );
  }
  if (auth !== "ok") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const hijriDate = getCurrentHijriDate();
    const verseKey = selectRandomVerse();

    // Check if this verse already exists for this year
    const existing = await prisma.tadabburCircle.findFirst({
      where: {
        verseKey,
        hijriYear: hijriDate.year,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        circle: existing,
        message: "Circle already exists for this verse and year",
      });
    }

    // Create new circle with dynamic dates
    const startDate = new Date(now);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 15);

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

    return NextResponse.json({
      success: true,
      circle,
      message: "Created new circle",
    });
  } catch (error) {
    console.error("[/api/tadabbur/seed POST]", error);
    return NextResponse.json({ error: "Failed to seed circle" }, { status: 500 });
  }
}
