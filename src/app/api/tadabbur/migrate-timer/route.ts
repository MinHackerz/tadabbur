import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";

/**
 * One-time migration to add timerEnabled field to existing user progress
 * Run this once after deploying the timerEnabled feature
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin secret
    const authHeader = req.headers.get("authorization");
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET || "dev-secret-change-in-production";
    
    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      error: "Failed to migrate timer field",
      details: errorMessage,
    }, { status: 500 });
  }
}

// Allow GET in development for testing
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  return POST(req);
}
