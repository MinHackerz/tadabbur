import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";
import { getTimeUntilNextDay } from "@/lib/tadabbur-helpers";

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { progressId, day, action } = body;

    if (!progressId || !day || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const progress = await prisma.tadabburUserProgress.findFirst({
      where: { id: progressId, userId: user.sub },
      include: { circle: true },
    });

    if (!progress) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    }

    // Handle different actions
    if (action === "complete_day") {
      // Check if 24 hours have passed since last completion (only if timer is enabled)
      const timeCheck = getTimeUntilNextDay(progress.lastCompletedAt);
      const timerEnabled = progress.timerEnabled ?? true; // Default to true for existing users
      
      if (timerEnabled && !timeCheck.canUnlock && progress.completedDays.length > 0) {
        return NextResponse.json({
          error: "Next day not yet unlocked",
          hoursRemaining: timeCheck.hoursRemaining,
          minutesRemaining: timeCheck.minutesRemaining,
        }, { status: 403 });
      }

      const completedDays = Array.from(new Set([...progress.completedDays, day])).sort((a, b) => a - b);
      const isComplete = completedDays.length === progress.circle.totalDays;
      const nextDay: number = Math.min(day + 1, progress.circle.totalDays);

      const updated = await prisma.tadabburUserProgress.update({
        where: { id: progressId },
        data: {
          completedDays: completedDays,
          currentDay: nextDay,
          lastCompletedAt: new Date(),
          isComplete: isComplete,
          completedAt: isComplete ? new Date() : null,
        },
      });

      return NextResponse.json({ progress: updated });
    }

    if (action === "check_unlock") {
      const timeCheck = getTimeUntilNextDay(progress.lastCompletedAt);
      return NextResponse.json(timeCheck);
    }

    if (action === "update_statement") {
      const { personalStatement } = body;
      const updated = await prisma.tadabburUserProgress.update({
        where: { id: progressId },
        data: { personalStatement },
      });

      return NextResponse.json({ progress: updated });
    }

    if (action === "toggle_memorised") {
      const updated = await prisma.tadabburUserProgress.update({
        where: { id: progressId },
        data: { verseMemorised: !progress.verseMemorised },
      });

      return NextResponse.json({ progress: updated });
    }

    if (action === "toggle_dua") {
      const updated = await prisma.tadabburUserProgress.update({
        where: { id: progressId },
        data: { duaLearned: !progress.duaLearned },
      });

      return NextResponse.json({ progress: updated });
    }

    if (action === "toggle_timer") {
      const updated = await prisma.tadabburUserProgress.update({
        where: { id: progressId },
        data: { timerEnabled: !progress.timerEnabled },
      });

      return NextResponse.json({ progress: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[/api/tadabbur/progress PUT]", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
