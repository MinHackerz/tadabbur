import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { niyyahJourneys, niyyahJourneyDays } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth-helpers';

/**
 * POST /api/niyyah/days
 * Add a completed day to a journey
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      journeyId,
      date,
      versesRead,
      surahRange,
      startKey,
      endKey,
      reflection,
      isMercy,
    } = body;

    // Validate required fields
    if (!journeyId || !date || !versesRead || !surahRange || !startKey || !endKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify journey ownership
    const [journey] = await db
      .select()
      .from(niyyahJourneys)
      .where(
        and(
          eq(niyyahJourneys.id, journeyId),
          eq(niyyahJourneys.userId, user.sub)
        )
      )
      .limit(1);

    if (!journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Create the day entry
    const [day] = await db
      .insert(niyyahJourneyDays)
      .values({
        journeyId,
        date,
        versesRead,
        surahRange,
        startKey,
        endKey,
        reflection: reflection || null,
        isMercy: isMercy || false,
      })
      .returning();

    return NextResponse.json({ day }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add day' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/niyyah/days
 * Update a specific day (e.g., add reflection)
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { dayId, journeyId, reflection } = body;

    if (!dayId || !journeyId) {
      return NextResponse.json(
        { error: 'Day ID and Journey ID are required' },
        { status: 400 }
      );
    }

    // Verify journey ownership
    const [journey] = await db
      .select()
      .from(niyyahJourneys)
      .where(
        and(
          eq(niyyahJourneys.id, journeyId),
          eq(niyyahJourneys.userId, user.sub)
        )
      )
      .limit(1);

    if (!journey) {
      return NextResponse.json(
        { error: 'Journey not found' },
        { status: 404 }
      );
    }

    // Update the day
    const [updated] = await db
      .update(niyyahJourneyDays)
      .set({
        reflection: reflection ?? null,
      })
      .where(
        and(
          eq(niyyahJourneyDays.id, dayId),
          eq(niyyahJourneyDays.journeyId, journeyId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Day not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ day: updated });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update day' },
      { status: 500 }
    );
  }
}
