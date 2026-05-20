import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { selectRandomVerse, getCurrentHijriDate } from "@/lib/tadabbur-helpers";

export async function POST() {
  try {
    // Deactivate any existing active circles
    await prisma.tadabburCircle.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Select a random verse
    const verseKey = selectRandomVerse();
    const hijriDate = getCurrentHijriDate();
    
    // Calculate start and end dates (15-day period)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 15);

    // Create new circle
    const circle = await prisma.tadabburCircle.create({
      data: {
        verseKey,
        hijriMonth: hijriDate.month,
        hijriYear: hijriDate.year,
        startDate,
        endDate,
        isActive: true,
        totalDays: 15,
        participantCount: 0,
      },
    });

    return NextResponse.json({
      success: true,
      circle: {
        id: circle.id,
        verseKey: circle.verseKey,
        hijriMonth: circle.hijriMonth,
        hijriYear: circle.hijriYear,
        startDate: circle.startDate.toISOString(),
        endDate: circle.endDate.toISOString(),
        totalDays: circle.totalDays,
      },
    });
  } catch (error) {
    console.error("[/api/tadabbur/create-circle POST]", error);
    return NextResponse.json({ error: "Failed to create circle" }, { status: 500 });
  }
}
