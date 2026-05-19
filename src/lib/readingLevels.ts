export interface ReadingLevel {
  title: string;
  subtitle: string;
  minStreakDays: number;
}

export const READING_LEVELS: ReadingLevel[] = [
  { minStreakDays: 0, title: "Seeker", subtitle: "Beginning the path" },
  { minStreakDays: 3, title: "Steadfast Reader", subtitle: "Building rhythm" },
  { minStreakDays: 7, title: "Companion of the Qur'an", subtitle: "A week of presence" },
  { minStreakDays: 21, title: "Reciter", subtitle: "Habits taking root" },
  { minStreakDays: 40, title: "Hafiz Student", subtitle: "Forty days of devotion" },
  { minStreakDays: 90, title: "Guardian of the Word", subtitle: "Honouring the trust" },
];

export function getReadingLevel(streakDays: number): ReadingLevel {
  let level = READING_LEVELS[0];
  for (const candidate of READING_LEVELS) {
    if (streakDays >= candidate.minStreakDays) {
      level = candidate;
    }
  }
  return level;
}
