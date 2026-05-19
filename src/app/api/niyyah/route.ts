import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { niyyahJourneys, niyyahJourneyDays } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth-helpers';

/**
 * GET /api/niyyah
 * Fetch the current user's active niyyah journey
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the most recent incomplete journey, or the most recent complete one
    const journeys = await db
      .select()
      .from(niyyahJourneys)
      .where(eq(niyyahJourneys.userId, user.sub))
      .orderBy(desc(niyyahJourneys.createdAt))
      .limit(1);

    if (journeys.length === 0) {
      return NextResponse.json({ journey: null });
    }

    const journey = journeys[0];

    // Fetch all completed days for this journey
    const days = await db
      .select()
      .from(niyyahJourneyDays)
      .where(eq(niyyahJourneyDays.journeyId, journey.id))
      .orderBy(niyyahJourneyDays.date);

    // Transform to match the frontend Journey type
    const response = {
      v: 1,
      id: journey.id,
      type: journey.type,
      recipientName: journey.recipientName,
      occasion: journey.occasion,
      personalDua: journey.personalDua,
      goalType: journey.goalType,
      goalValue: journey.goalValue,
      startDate: journey.startDate,
      targetDate: journey.targetDate,
      completedDays: days.map(d => ({
        date: d.date,
        versesRead: d.versesRead,
        surahRange: d.surahRange,
        startKey: d.startKey,
        endKey: d.endKey,
        reflection: d.reflection,
        isMercy: d.isMercy,
      })),
      currentStreak: journey.currentStreak,
      longestStreak: journey.longestStreak,
      mercyDayUsed: journey.mercyDayUsed,
      lastMercyWeek: journey.lastMercyWeek,
      isComplete: journey.isComplete,
      readerName: journey.readerName,
    };

    return NextResponse.json({ journey: response });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch journey' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/niyyah
 * Create a new niyyah journey
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      type,
      recipientName,
      occasion,
      personalDua,
      goalType,
      goalValue,
      startDate,
      targetDate,
      readerName,
    } = body;

    // Validate required fields
    if (!type || !recipientName || !occasion || !personalDua || !goalType || !goalValue || !startDate || !targetDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the journey
    const [journey] = await db
      .insert(niyyahJourneys)
      .values({
        userId: user.sub,
        type,
        recipientName,
        occasion,
        personalDua,
        goalType,
        goalValue,
        startDate,
        targetDate,
        readerName: readerName || null,
        currentStreak: 0,
        longestStreak: 0,
        mercyDayUsed: false,
        lastMercyWeek: null,
        isComplete: false,
      })
      .returning();

    return NextResponse.json({ journey }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create journey' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/niyyah
 * Update the current journey (streak, completion status, etc.)
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      journeyId,
      currentStreak,
      longestStreak,
      mercyDayUsed,
      lastMercyWeek,
      isComplete,
    } = body;

    if (!journeyId) {
      return NextResponse.json(
        { error: 'Journey ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const [existing] = await db
      .select()
      .from(niyyahJourneys)
      .where(
        and(
          eq(niyyahJourneys.id, journeyId),
          eq(niyyahJourneys.userId, user.sub)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Update the journey
    const [updated] = await db
      .update(niyyahJourneys)
      .set({
        currentStreak: currentStreak ?? existing.currentStreak,
        longestStreak: longestStreak ?? existing.longestStreak,
        mercyDayUsed: mercyDayUsed ?? existing.mercyDayUsed,
        lastMercyWeek: lastMercyWeek ?? existing.lastMercyWeek,
        isComplete: isComplete ?? existing.isComplete,
        updatedAt: new Date(),
      })
      .where(eq(niyyahJourneys.id, journeyId))
      .returning();

    return NextResponse.json({ journey: updated });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update journey' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/niyyah
 * Delete a journey (cascade deletes all days)
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const journeyId = searchParams.get('journeyId');

    if (!journeyId) {
      return NextResponse.json(
        { error: 'Journey ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership before deleting
    const [existing] = await db
      .select()
      .from(niyyahJourneys)
      .where(
        and(
          eq(niyyahJourneys.id, journeyId),
          eq(niyyahJourneys.userId, user.sub)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Delete the journey (cascade will delete days)
    await db
      .delete(niyyahJourneys)
      .where(eq(niyyahJourneys.id, journeyId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete journey' },
      { status: 500 }
    );
  }
}
