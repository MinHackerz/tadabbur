import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

const toIso = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    
    // Get all active circles
    const activeCircles = await prisma.tadabburCircle.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (activeCircles.length === 0) {
      return NextResponse.json({ circles: [], userProgress: [] });
    }

    // Get user's progress for all circles if logged in
    let userProgressList: any[] = [];
    if (user) {
      userProgressList = await prisma.tadabburUserProgress.findMany({
        where: { userId: user.sub },
        include: {
          journals: { orderBy: { day: "asc" } },
          actions: { orderBy: { day: "asc" } },
          certificate: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    // Get today's date for expiry check
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build response with stats for each circle
    const circlesWithStats = await Promise.all(
      activeCircles.map(async (circle) => {
        const allProgress = await prisma.tadabburUserProgress.findMany({
          where: { circleId: circle.id },
          select: { completedDays: true },
        });

        const dayProgress: Record<number, number> = {};
        for (let day = 1; day <= circle.totalDays; day++) {
          dayProgress[day] = allProgress.filter(p => p.completedDays.includes(day)).length;
        }

        const userProgress = userProgressList.find(p => p.circleId === circle.id);
        
        // Check if circle is expired (past end date)
        const circleEndDate = new Date(circle.endDate);
        circleEndDate.setHours(0, 0, 0, 0);
        const isExpired = today > circleEndDate;
        
        // If circle is expired and user hasn't joined, skip it
        if (isExpired && !userProgress) {
          return null;
        }

        return {
          id: circle.id,
          verseKey: circle.verseKey,
          hijriMonth: circle.hijriMonth,
          hijriYear: circle.hijriYear,
          startDate: toIso(circle.startDate),
          endDate: toIso(circle.endDate),
          totalDays: circle.totalDays,
          participantCount: circle.participantCount,
          dayProgress,
          userProgress: userProgress ? {
            id: userProgress.id,
            currentDay: userProgress.currentDay,
            completedDays: userProgress.completedDays,
            lastCompletedAt: userProgress.lastCompletedAt?.toISOString() || null,
            startedDate: toIso(userProgress.startedDate),
            isComplete: userProgress.isComplete,
            completedAt: userProgress.completedAt ? toIso(userProgress.completedAt) : null,
            personalStatement: userProgress.personalStatement,
            verseMemorised: userProgress.verseMemorised,
            duaLearned: userProgress.duaLearned,
            timerEnabled: userProgress.timerEnabled ?? true, // Default to true for existing users
            journals: userProgress.journals.map((j: any) => ({
              day: j.day,
              content: j.content,
              isPublic: j.isPublic,
              region: j.region,
            })),
            actions: userProgress.actions.map((a: any) => ({
              day: a.day,
              completed: a.completed,
              note: a.note,
            })),
          } : null,
        };
      })
    );

    // Filter out null values (expired circles without user progress)
    const filteredCircles = circlesWithStats.filter(circle => circle !== null);

    return NextResponse.json({
      circles: filteredCircles,
    });
  } catch (error) {
    console.error("[/api/tadabbur GET]", error);
    return NextResponse.json({ error: "Failed to fetch tadabbur data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { circleId, timerEnabled } = body;

    if (!circleId) {
      return NextResponse.json({ error: "Circle ID is required" }, { status: 400 });
    }

    // Check if circle exists
    const circle = await prisma.tadabburCircle.findUnique({
      where: { id: circleId },
    });

    if (!circle) {
      return NextResponse.json({ error: "Circle not found" }, { status: 404 });
    }

    // Check if circle is expired (past end date)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const circleEndDate = new Date(circle.endDate);
    circleEndDate.setHours(0, 0, 0, 0);
    
    if (today > circleEndDate) {
      return NextResponse.json({ 
        error: "Circle expired", 
        message: "This circle is no longer accepting new participants." 
      }, { status: 400 });
    }

    // Create or get user progress
    const progress = await prisma.tadabburUserProgress.upsert({
      where: {
        userId_circleId: {
          userId: user.sub,
          circleId,
        },
      },
      create: {
        userId: user.sub,
        circleId,
        currentDay: 1,
        completedDays: [],
        startedDate: new Date(),
        timerEnabled: timerEnabled !== undefined ? timerEnabled : true,
      },
      update: {},
      include: {
        journals: true,
        actions: true,
      },
    });

    // Increment participant count if this is a new join
    if (progress.createdAt.getTime() === progress.updatedAt.getTime()) {
      await prisma.tadabburCircle.update({
        where: { id: circleId },
        data: { participantCount: { increment: 1 } },
      });
    }

    return NextResponse.json({
      progress: {
        id: progress.id,
        currentDay: progress.currentDay,
        completedDays: progress.completedDays,
        lastCompletedAt: progress.lastCompletedAt?.toISOString() || null,
        startedDate: toIso(progress.startedDate),
        isComplete: progress.isComplete,
        journals: progress.journals,
        actions: progress.actions,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[/api/tadabbur POST]", error);
    return NextResponse.json({ error: "Failed to join circle" }, { status: 500 });
  }
}
