/**
 * Niyyah API Client
 * Handles all communication with the niyyah backend API
 */

import type { Journey, JourneyDay, NewJourneyInput } from '@/lib/niyyah';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Fetch the current user's active journey from the database
 */
export async function fetchJourney(): Promise<Journey | null> {
  try {
    const response = await fetch('/api/niyyah', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      // Read the body so we can log the real server error
      const body = await response.json().catch(() => ({})) as { error?: string; detail?: string };
      const msg = body.detail ?? body.error ?? response.statusText;
      console.error('[fetchJourney] server error:', response.status, msg);
      throw new Error(`Failed to fetch journey: ${msg}`);
    }

    const data = await response.json();
    return data.journey || null;
  } catch (error) {
    console.error('Error fetching journey:', error);
    return null;
  }
}

/**
 * Create a new journey in the database
 */
export async function createJourney(input: NewJourneyInput & { startDate: string; targetDate: string }): Promise<Journey | null> {
  try {
    const response = await fetch('/api/niyyah', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create journey');
    }

    const data = await response.json();
    return data.journey;
  } catch (error) {
    console.error('Error creating journey:', error);
    throw error;
  }
}

/**
 * Update journey metadata (streak, completion status, etc.)
 */
export async function updateJourney(
  journeyId: string,
  updates: {
    currentStreak?: number;
    longestStreak?: number;
    mercyDayUsed?: boolean;
    lastMercyWeek?: string | null;
    isComplete?: boolean;
    isActive?: boolean;
  }
): Promise<boolean> {
  try {
    const response = await fetch('/api/niyyah', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        journeyId,
        ...updates,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update journey');
    }

    return true;
  } catch (error) {
    console.error('Error updating journey:', error);
    return false;
  }
}

/**
 * Delete a journey (and all its days via cascade)
 */
export async function deleteJourney(journeyId: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/niyyah?journeyId=${journeyId}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete journey');
    }

    return true;
  } catch (error) {
    console.error('Error deleting journey:', error);
    return false;
  }
}

/**
 * Add a completed day to the journey
 */
export async function addJourneyDay(
  journeyId: string,
  day: Omit<JourneyDay, 'id'>
): Promise<boolean> {
  try {
    const response = await fetch('/api/niyyah/days', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        journeyId,
        date: day.date,
        versesRead: day.versesRead,
        surahRange: day.surahRange,
        startKey: day.startKey,
        endKey: day.endKey,
        reflection: day.reflection || null,
        isMercy: day.isMercy || false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add journey day');
    }

    return true;
  } catch (error) {
    console.error('Error adding journey day:', error);
    return false;
  }
}

/**
 * Update a journey day (e.g., add reflection)
 */
export async function updateJourneyDay(
  journeyId: string,
  dayId: string,
  updates: {
    reflection?: string | null;
  }
): Promise<boolean> {
  try {
    const response = await fetch('/api/niyyah/days', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        journeyId,
        dayId,
        ...updates,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update journey day');
    }

    return true;
  } catch (error) {
    console.error('Error updating journey day:', error);
    return false;
  }
}

/**
 * Migrate localStorage journey to database
 * This is a one-time operation for existing users
 */
export async function migrateLocalStorageToDatabase(journey: Journey): Promise<boolean> {
  try {
    // First, create the journey
    const created = await createJourney({
      type: journey.type,
      recipientName: journey.recipientName,
      occasion: journey.occasion,
      personalDua: journey.personalDua,
      goalType: journey.goalType,
      goalValue: journey.goalValue,
      readerName: journey.readerName,
      startDate: journey.startDate,
      targetDate: journey.targetDate,
    });

    if (!created) {
      throw new Error('Failed to create journey during migration');
    }

    // Then, add all completed days
    for (const day of journey.completedDays) {
      await addJourneyDay(created.id, day);
    }

    // Update journey metadata
    await updateJourney(created.id, {
      currentStreak: journey.currentStreak,
      longestStreak: journey.longestStreak,
      mercyDayUsed: journey.mercyDayUsed,
      lastMercyWeek: journey.lastMercyWeek,
      isComplete: journey.isComplete,
    });

    return true;
  } catch (error) {
    console.error('Error migrating journey:', error);
    return false;
  }
}
