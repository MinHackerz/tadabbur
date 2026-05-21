import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { verifyAdminRequest } from "@/lib/admin-auth";

/**
 * One-time migration to add timerEnabled field to existing user progress.
 * Run this once after deploying the timerEnabled feature.
 *
 * Auth: requires `Authorization: Bearer ${ADMIN_SECRET}` (or `CRON_SECRET`).
 * Previously fell back to a hard-coded "dev-secret-change-in-production"
 * literal — that has been removed.
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
    // Update all existing progress records to have timerEnabled=true
    // Use raw SQL since Prisma types might not be updated yet
    const result = await prisma.$executeRaw`
      UPDATE tadabbur_user_progress 
      SET timer_enabled = true 
      WHERE timer_enabled IS NULL
    `;

    return NextResponse.json({
      success: true,
      message: `Updated ${result} user progress records with timerEnabled=true`,
      updatedCount: result,
    });
  } catch (error) {
    console.error("[/api/tadabbur/migrate-timer POST]", error);
    return NextResponse.json(
      { error: "Failed to migrate timer field" },
      { status: 500 },
    );
  }
}

// Allow GET in development for testing; production-only POST is enforced by auth.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Only available in development" },
      { status: 403 },
    );
  }
  return POST(req);
}
