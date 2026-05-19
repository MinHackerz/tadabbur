export interface SacredMoment {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  surahId: number;
  surahName: string;
  cta: string;
  tone: "ramadan" | "laylatul-qadr" | "friday" | "fasting" | "default";
}

function hijriParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic", {
    day: "numeric",
    month: "numeric",
  }).formatToParts(date);

  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 0);
  return { day, month };
}

/** Contextual reading occasion based on the Islamic calendar and weekly sunnah. */
export function getSacredMoment(date = new Date()): SacredMoment | null {
  const weekday = date.getDay();
  const { day: hijriDay, month: hijriMonth } = hijriParts(date);

  if (hijriMonth === 9) {
    const lastTen = hijriDay >= 21;
    const oddNight = hijriDay % 2 === 1;

    if (lastTen && oddNight) {
      return {
        id: "laylatul-qadr",
        title: "Seek Laylatul Qadr",
        subtitle: "Last ten nights of Ramadan",
        detail: "Increase Quran, duʿā, and reflection tonight — odd nights hold special mercy.",
        surahId: 97,
        surahName: "Al-Qadr",
        cta: "Read Surah Al-Qadr",
        tone: "laylatul-qadr",
      };
    }

    return {
      id: "ramadan",
      title: "Ramadan reading",
      subtitle: "A month the Qur'an was revealed",
      detail: "Even a few ayahs after iftar renew your connection with the Book.",
      surahId: 2,
      surahName: "Al-Baqarah",
      cta: "Continue your khatm",
      tone: "ramadan",
    };
  }

  if (weekday === 5) {
    return {
      id: "friday-kahf",
      title: "Friday — Surah Al-Kahf",
      subtitle: "A light between two Fridays",
      detail: "The Prophet ﷺ encouraged reciting Surah Al-Kahf today — protection and reflection.",
      surahId: 18,
      surahName: "Al-Kahf",
      cta: "Open Surah Al-Kahf",
      tone: "friday",
    };
  }

  if (weekday === 1 || weekday === 4) {
    return {
      id: "fasting-days",
      title: "Monday or Thursday",
      subtitle: "Days deeds are presented",
      detail: "Pair optional fasting with a short, intentional recitation session.",
      surahId: 67,
      surahName: "Al-Mulk",
      cta: "Read Surah Al-Mulk",
      tone: "fasting",
    };
  }

  return null;
}
