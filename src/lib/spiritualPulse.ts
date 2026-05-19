const STORAGE_KEY = "tadabbur-spiritual-pulse";

/**
 * IMPORTANT: Spiritual pulse check-ins should only be tracked for authenticated users.
 * This localStorage implementation is deprecated and should migrate to server-side storage.
 * 
 * TODO: Migrate to Neon DB (spiritual_pulse_checkins table)
 */

export const SPIRITUAL_EMOTIONS = {
  anxious: {
    label: "Anxious",
    arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    translation: "Unquestionably, by the remembrance of Allah hearts are assured.",
    ref: "13:28",
    surah: 13,
    verse: 28,
    prompt: "Take a slow breath. Let this verse anchor you before you continue your day.",
    dhikr: "La hawla wa la quwwata illa billah",
  },
  grateful: {
    label: "Grateful",
    arabic: "لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ",
    translation: "If you are grateful, I will surely increase you [in favor].",
    ref: "14:7",
    surah: 14,
    verse: 7,
    prompt: "What blessing came to mind today? Hold it as you read.",
    dhikr: "Alhamdulillah",
  },
  lost: {
    label: "Lost",
    arabic: "وَوَجَدَكَ ضَالًّا فَهَدَىٰ",
    translation: "And He found you lost and guided [you].",
    ref: "93:7",
    surah: 93,
    verse: 7,
    prompt: "Allah guided you before; trust the opening on your path now.",
    dhikr: "Hasbunallahu wa ni'mal wakeel",
  },
  sorrowful: {
    label: "Sorrowful",
    arabic: "وَلَا تَهِنُوا وَلَا تَحْزَنُوا",
    translation: "So do not weaken and do not grieve.",
    ref: "3:139",
    surah: 3,
    verse: 139,
    prompt: "Strength is not the absence of grief—let the Qur'an carry you for a moment.",
    dhikr: "Inna lillahi wa inna ilayhi raji'un",
  },
  seeking_peace: {
    label: "Seeking peace",
    arabic: "هُوَ اللَّهُ الَّذِي لَا إِلَٰهَ إِلَّا هُوَ ... السَّلَامُ",
    translation: "He is Allah—there is no deity except Him… the Giver of Peace.",
    ref: "59:23",
    surah: 59,
    verse: 23,
    prompt: "Let salām settle over your heart, even for one quiet minute.",
    dhikr: "SubhanAllah wa bihamdihi",
  },
  hopeful: {
    label: "Hopeful",
    arabic: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
    translation: "For indeed, with hardship [will be] ease.",
    ref: "94:5",
    surah: 94,
    verse: 5,
    prompt: "Hope is not wishful thinking—it is trust in Allah's promise.",
    dhikr: "Allahu Akbar",
  },
  overwhelmed: {
    label: "Overwhelmed",
    arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا",
    translation: "Allah does not burden a soul beyond that it can bear.",
    ref: "2:286",
    surah: 2,
    verse: 286,
    prompt: "You are not asked to carry more than you can. Breathe.",
    dhikr: "Hasbiyallah",
  },
  joyful: {
    label: "Joyful",
    arabic: "قُلْ بِفَضْلِ اللَّهِ وَبِرَحْمَتِهِ فَبِذَٰلِكَ فَلْيَفْرَحُوا",
    translation: "Say, 'In the bounty of Allah and in His mercy—in that let them rejoice.'",
    ref: "10:58",
    surah: 10,
    verse: 58,
    prompt: "True joy is rooted in recognizing Allah's mercy.",
    dhikr: "Alhamdulillah",
  },
  repentant: {
    label: "Repentant",
    arabic: "إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ",
    translation: "Indeed, Allah loves those who are constantly repentant.",
    ref: "2:222",
    surah: 2,
    verse: 222,
    prompt: "Return to Him—He is waiting with open mercy.",
    dhikr: "Astaghfirullah",
  },
  patient: {
    label: "Patient",
    arabic: "وَاصْبِرْ فَإِنَّ اللَّهَ لَا يُضِيعُ أَجْرَ الْمُحْسِنِينَ",
    translation: "And be patient, for indeed, Allah does not allow to be lost the reward of those who do good.",
    ref: "11:115",
    surah: 11,
    verse: 115,
    prompt: "Patience is not passive—it is active trust in Allah's timing.",
    dhikr: "SubhanAllah",
  },
  fearful: {
    label: "Fearful",
    arabic: "لَا تَخَفْ إِنَّنِي مَعَكُمَا أَسْمَعُ وَأَرَىٰ",
    translation: "Fear not. Indeed, I am with you both; I hear and I see.",
    ref: "20:46",
    surah: 20,
    verse: 46,
    prompt: "Allah sees your fear and is with you in it.",
    dhikr: "La ilaha illallah",
  },
  lonely: {
    label: "Lonely",
    arabic: "وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ",
    translation: "And He is with you wherever you are.",
    ref: "57:4",
    surah: 57,
    verse: 4,
    prompt: "You are never truly alone—His presence surrounds you.",
    dhikr: "Allah ma'i",
  },
  determined: {
    label: "Determined",
    arabic: "فَإِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللَّهِ",
    translation: "And when you have decided, then rely upon Allah.",
    ref: "3:159",
    surah: 3,
    verse: 159,
    prompt: "Determination paired with trust—this is the believer's way.",
    dhikr: "Tawakkaltu 'alallah",
  },
  confused: {
    label: "Confused",
    arabic: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا",
    translation: "And whoever fears Allah—He will make for him a way out.",
    ref: "65:2",
    surah: 65,
    verse: 2,
    prompt: "Clarity comes through taqwa—trust the path will reveal itself.",
    dhikr: "Hasbunallahu wa ni'mal wakeel",
  },
  content: {
    label: "Content",
    arabic: "أَلَا إِنَّ أَوْلِيَاءَ اللَّهِ لَا خَوْفٌ عَلَيْهِمْ وَلَا هُمْ يَحْزَنُونَ",
    translation: "Unquestionably, [for] the allies of Allah there will be no fear concerning them, nor will they grieve.",
    ref: "10:62",
    surah: 10,
    verse: 62,
    prompt: "Contentment is the fruit of closeness to Allah.",
    dhikr: "Alhamdulillah 'ala kulli hal",
  },
} as const;

export type PulseKey = keyof typeof SPIRITUAL_EMOTIONS;

interface PulseState {
  todayDate: string | null;
  todayPulse: PulseKey | null;
  checkInDates: string[];
}

const DEFAULT_STATE: PulseState = {
  todayDate: null,
  todayPulse: null,
  checkInDates: [],
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function load(): PulseState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function save(state: PulseState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetTodayIfNeeded(state: PulseState): PulseState {
  const today = todayKey();
  if (state.todayDate === today) return state;
  return { ...state, todayDate: today, todayPulse: null };
}

/**
 * @deprecated Returns empty state. Spiritual pulse should only be tracked for authenticated users.
 */
export function getSpiritualPulseState(): PulseState {
  return DEFAULT_STATE;
}

/**
 * @deprecated This function uses localStorage which should not be used for user data.
 */
export function recordSpiritualPulse(key: PulseKey): PulseState {
  console.warn('[DEPRECATED] recordSpiritualPulse: Spiritual pulse should only be tracked for authenticated users');
  return DEFAULT_STATE;
}

/**
 * @deprecated This function uses localStorage which should not be used for user data.
 */
export function clearTodaySpiritualPulse(): PulseState {
  console.warn('[DEPRECATED] clearTodaySpiritualPulse: Spiritual pulse should only be tracked for authenticated users');
  return DEFAULT_STATE;
}

/** Unique check-in days in the last 7 calendar days (including today). */
export function pulseCheckInsThisWeek(checkInDates: string[]): number {
  const today = new Date();
  const keys = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keys.add(d.toISOString().slice(0, 10));
  }
  return checkInDates.filter((d) => keys.has(d)).length;
}
