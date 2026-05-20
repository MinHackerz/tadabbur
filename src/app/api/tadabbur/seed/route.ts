import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { selectRandomVerse, getCurrentHijriDate } from "@/lib/tadabbur-helpers";

/**
 * Seed endpoint for initial circle creation
 * This is a simplified version that creates one circle
 * For production use, use /api/tadabbur/auto-generate instead
 */
export async function POST() {
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
        message: "Circle already exists for this verse and year" 
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
      message: "Created new circle" 
    });
  } catch (error) {
    console.error("[/api/tadabbur/seed POST]", error);
    return NextResponse.json({ error: "Failed to seed circle" }, { status: 500 });
  }
}
