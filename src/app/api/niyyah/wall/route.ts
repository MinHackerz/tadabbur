import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { niyyahJourneys } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';

/**
 * GET /api/niyyah/wall
 * Fetch anonymized community data for the Amanah Wall
 * No authentication required - this is public, anonymized data
 */
export async function GET() {
  try {
    // Get recent journeys (last 50) with anonymized data
    const journeys = await db
      .select({
        type: niyyahJourneys.type,
        occasion: niyyahJourneys.occasion,
        goalValue: niyyahJourneys.goalValue,
        isComplete: niyyahJourneys.isComplete,
        createdAt: niyyahJourneys.createdAt,
        // Calculate days completed using a subquery
        daysCompleted: sql<number>`(
          SELECT COUNT(*) 
          FROM niyyah_journey_days 
          WHERE journey_id = ${niyyahJourneys.id}
        )`,
      })
      .from(niyyahJourneys)
      .orderBy(desc(niyyahJourneys.createdAt))
      .limit(50);

    // Transform to AmanahWallItem format
    const wallItems = journeys.map((j) => {
      // Only show completed journeys from today
      const today = new Date().toISOString().split('T')[0];
      const journeyDate = new Date(j.createdAt).toISOString().split('T')[0];
      const isCompletedToday = j.isComplete && journeyDate === today;

      return {
        type: j.type,
        occasion: j.type === 'living' ? j.occasion : undefined,
        day: Number(j.daysCompleted),
        total: j.goalValue,
        region: 'Community',
        isComplete: isCompletedToday,
      };
    });

    // Filter to show a mix of active and recently completed
    const activeJourneys = wallItems.filter(w => !w.isComplete).slice(0, 6);
    const completedToday = wallItems.filter(w => w.isComplete).slice(0, 2);
    
    // Combine and shuffle
    const displayItems = [...activeJourneys, ...completedToday]
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);

    return NextResponse.json({ 
      items: displayItems,
      liveCount: activeJourneys.length,
      completedToday: completedToday.length,
    });
  } catch (error) {
    // Log only in development to avoid exposing data in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching amanah wall:', error);
    }
    
    // Return empty data on error (graceful degradation)
    return NextResponse.json({ 
      items: [],
      liveCount: 0,
      completedToday: 0,
    });
  }
}
