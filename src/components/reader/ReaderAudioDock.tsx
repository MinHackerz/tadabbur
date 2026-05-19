"use client";
import type { ReaderVerse } from "@/lib/types";
import type { useReaderAudio } from "./useReaderAudio";

type ReaderAudio = ReturnType<typeof useReaderAudio>;

interface ReaderAudioDockProps {
  verses: ReaderVerse[];
  chapterId: number;
  surahName: string;
  audio: ReaderAudio;
}

export function getPlayableVerses(verses: ReaderVerse[]) {
  return verses.filter(
    (v): v is ReaderVerse & { audioUrl: string; verseNumber: number } =>
      Boolean(v.audioUrl) && v.verseNumber !== null,
  );
}

export default function ReaderAudioDock({ verses, chapterId, surahName, audio }: ReaderAudioDockProps) {
  const playable = getPlayableVerses(verses);
  if (!playable.length) return null;

  const { surahBarVisible, surahBarIndex, isPlaying, source, activeVerse } = audio;
  const surahActive = source === "surah";
  const showDock = surahBarVisible || surahActive;

  if (!showDock) return null;

  const current = playable[surahBarIndex] ?? playable[0];
  const progressPct = playable.length > 1 ? ((surahBarIndex + 1) / playable.length) * 100 : 100;

  return (
    <div
      className="reader-audio-dock fixed left-0 right-0 z-40 bottom-16 md:bottom-0"
      role="region"
      aria-label="Surah audio player"
    >
      <div className="mx-auto max-w-[56rem] px-6 sm:px-10 pb-3 md:pb-5 pt-2">
        <div className="overflow-hidden rounded-2xl bg-ink text-white shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-white/10 reader-dock-enter">
          <div className="h-1 bg-white/10">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => audio.toggleSurahPlayback(playable, surahBarIndex)}
              className="flex items-center justify-center w-11 h-11 rounded-full bg-accent hover:bg-accent-hover transition-colors shrink-0 shadow-lg"
              aria-label={surahActive && isPlaying ? "Pause recitation" : "Play recitation"}
            >
              {surahActive && isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width={20} height={20}>
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width={20} height={20}>
                  <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate">
                {surahName} · Ayah {current.verseNumber}
              </p>
              <p className="text-[11px] text-white/55">
                Surah {chapterId} · {surahBarIndex + 1} / {playable.length}
                {activeVerse && surahActive ? " · Following along" : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={surahBarIndex <= 0}
              onClick={() => audio.playSurahAt(playable, Math.max(0, surahBarIndex - 1))}
              className="p-2.5 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-colors"
              aria-label="Previous ayah"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              disabled={surahBarIndex >= playable.length - 1}
              onClick={() => audio.playSurahAt(playable, surahBarIndex + 1)}
              className="p-2.5 rounded-xl hover:bg-white/10 disabled:opacity-30 transition-colors"
              aria-label="Next ayah"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                audio.stop();
                audio.setSurahBarVisible(false);
              }}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors"
              aria-label="Stop and close player"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
