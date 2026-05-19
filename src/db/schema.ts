import { pgTable, text, timestamp, varchar, uuid, integer, boolean, date, pgEnum } from 'drizzle-orm/pg-core';

export const userNotesMeta = pgTable('user_notes_meta', {
  id: varchar('id', { length: 255 }).primaryKey(), // Maps to QF Note ID
  userId: varchar('user_id', { length: 255 }).notNull(), // Maps to QF user sub claim
  richTextContent: text('rich_text_content'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  // For semantic search (vector extension) - can be added later
  // embedding: vector('embedding', { dimensions: 1536 }) 
});

export const userCollectionsMeta = pgTable('user_collections_meta', {
  id: varchar('id', { length: 255 }).primaryKey(), // Maps to QF Collection ID
  userId: varchar('user_id', { length: 255 }).notNull(),
  coverImageUrl: varchar('cover_image_url', { length: 1024 }),
});

// Niyyah Journey System - Database Schema
export const journeyTypeEnum = pgEnum('journey_type', ['living', 'departed', 'personal']);
export const goalTypeEnum = pgEnum('goal_type', ['days', 'khatm', 'juz', 'custom']);

export const niyyahJourneys = pgTable('niyyah_journeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(), // Maps to QF user sub claim
  type: journeyTypeEnum('type').notNull(),
  recipientName: text('recipient_name').notNull(),
  occasion: text('occasion').notNull(),
  personalDua: text('personal_dua').notNull(),
  goalType: goalTypeEnum('goal_type').notNull(),
  goalValue: integer('goal_value').notNull(),
  startDate: date('start_date').notNull(), // ISO date string yyyy-mm-dd
  targetDate: date('target_date').notNull(),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  mercyDayUsed: boolean('mercy_day_used').notNull().default(false),
  lastMercyWeek: varchar('last_mercy_week', { length: 50 }), // ISO week key
  isComplete: boolean('is_complete').notNull().default(false),
  readerName: text('reader_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const niyyahJourneyDays = pgTable('niyyah_journey_days', {
  id: uuid('id').primaryKey().defaultRandom(),
  journeyId: uuid('journey_id').notNull().references(() => niyyahJourneys.id, { onDelete: 'cascade' }),
  date: date('date').notNull(), // ISO date string yyyy-mm-dd
  versesRead: integer('verses_read').notNull(),
  surahRange: text('surah_range').notNull(),
  startKey: varchar('start_key', { length: 50 }).notNull(), // e.g., "2:1"
  endKey: varchar('end_key', { length: 50 }).notNull(), // e.g., "2:286"
  reflection: text('reflection'),
  isMercy: boolean('is_mercy').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
