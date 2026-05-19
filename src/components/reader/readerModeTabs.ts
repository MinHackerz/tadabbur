import type { ReadingMode } from "./useReaderPrefs";

export const READER_MODE_TABS: {
  id: ReadingMode;
  label: string;
  shortLabel: string;
  title: string;
}[] = [
  { id: "both", label: "Both", shortLabel: "Both", title: "Arabic and translation together" },
  { id: "arabic", label: "Arabic", shortLabel: "Arabic", title: "Arabic text only" },
  {
    id: "translation",
    label: "Translation",
    shortLabel: "Trans.",
    title: "Translation only — loads ayah text from Quran Foundation",
  },
];
