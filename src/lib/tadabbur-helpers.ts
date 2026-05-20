// Helper functions for Tadabbur Circle

export function getTimeUntilNextDay(lastCompletedAt: Date | null): {
  canUnlock: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
} {
  if (!lastCompletedAt) {
    return { canUnlock: true, hoursRemaining: 0, minutesRemaining: 0, secondsRemaining: 0 };
  }

  const now = new Date();
  const nextUnlockTime = new Date(lastCompletedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
  const diffMs = nextUnlockTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { canUnlock: true, hoursRemaining: 0, minutesRemaining: 0, secondsRemaining: 0 };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  return {
    canUnlock: false,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    secondsRemaining: seconds,
  };
}

export function selectRandomVerse(): string {
  // Total verses in Quran: 6236
  // Surah:Verse format
  const verses = [
    // Al-Fatihah (7 verses)
    ...Array.from({ length: 7 }, (_, i) => `1:${i + 1}`),
    // Al-Baqarah (286 verses)
    ...Array.from({ length: 286 }, (_, i) => `2:${i + 1}`),
    // ... (This is a simplified version - in production, you'd have all 6236 verses)
  ];

  // For now, select from a curated list of meaningful verses
  const curatedVerses = [
    "2:286", // Allah does not burden a soul
    "2:155", // We will test you with fear and hunger
    "3:159", // Consult them in the matter
    "4:58", // Allah commands justice
    "13:28", // Hearts find rest in remembrance of Allah
    "16:97", // Whoever does righteousness
    "17:36", // Do not pursue that of which you have no knowledge
    "18:46", // Wealth and children are adornment
    "20:114", // My Lord, increase me in knowledge
    "25:63", // Servants of the Most Merciful
    "29:69", // Those who strive for Us
    "31:18", // Do not turn your cheek in scorn
    "39:53", // Do not despair of Allah's mercy
    "41:34", // Repel evil with that which is better
    "49:13", // Most noble is the most righteous
    "55:13", // Which favors of your Lord will you deny
    "94:5", // With hardship comes ease
    "103:1", // By time, indeed mankind is in loss
  ];

  const randomIndex = Math.floor(Math.random() * curatedVerses.length);
  return curatedVerses[randomIndex];
}

export function getHijriMonthName(monthIndex: number): string {
  const months = [
    "Muharram",
    "Safar",
    "Rabi' al-Awwal",
    "Rabi' al-Thani",
    "Jumada al-Awwal",
    "Jumada al-Thani",
    "Rajab",
    "Sha'ban",
    "Ramadan",
    "Shawwal",
    "Dhul Qa'dah",
    "Dhul Hijjah",
  ];
  return months[monthIndex] || "Unknown";
}

export function getCurrentHijriDate(): { month: string; year: number } {
  // Simplified Hijri calculation (in production, use a proper library like hijri-date)
  const gregorianDate = new Date();
  const gregorianYear = gregorianDate.getFullYear();
  const gregorianMonth = gregorianDate.getMonth();
  
  // Approximate conversion (Hijri year is about 11 days shorter)
  const hijriYear = Math.floor((gregorianYear - 622) * 1.030684);
  const hijriMonth = (gregorianMonth + 1) % 12;
  
  return {
    month: getHijriMonthName(hijriMonth),
    year: hijriYear,
  };
}

export function formatTimeRemaining(hours: number, minutes: number): string {
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
