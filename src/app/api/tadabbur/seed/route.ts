import { NextResponse } from "next/server";
import { prisma } from "@/db";

export async function POST() {
  try {
    // Create the first Tadabbur Circle for Al-Baqarah 2:286
    const circle = await prisma.tadabburCircle.upsert({
      where: {
        hijriMonth_hijriYear: {
          hijriMonth: "Dhul Qa'dah",
          hijriYear: 1447,
        },
      },
      create: {
        verseKey: "2:286",
        hijriMonth: "Dhul Qa'dah",
        hijriYear: 1447,
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-05-30"),
        isActive: true,
      },
      update: {
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, circle });
  } catch (error) {
    console.error("[/api/tadabbur/seed POST]", error);
    return NextResponse.json({ error: "Failed to seed circle" }, { status: 500 });
  }
}
