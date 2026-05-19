"use client";
import type { ReaderVerse } from "@/lib/types";
import type { useReaderAudio } from "./useReaderAudio";

type ReaderAudio = ReturnType<typeof useReaderAudio>;

interface AudioPlayerBarProps {
  verses: ReaderVerse[];
  chapterId: number;
  audio: ReaderAudio;
}

export default function AudioPlayerBar({ verses, chapterId, audio }: AudioPlayerBarProps) {
  const playable = verses.filter(
    (v): v is ReaderVerse & { audioUrl: string; verseNumber: number } =>
      Boolean(v.audioUrl) && v.verseNumber !== null,
  );

  if (!playable.length) return null;

  const current = playable[audio.surahBarIndex] ?? playable[0];
  const { surahBarVisible, surahBarIndex, isPlaying, source } = audio;
  const surahActive = source === "surah";

  return (
    <>
      <div
        className={`fixed bottom-16 md:bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
          surahBarVisible ? "translate-y-0" : "translate-y-full pointer-events-none md:pointer-events-auto md:translate-y-0"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-8 pb-3 md:pb-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-ink text-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-white/10">
            <button
              type="button"
              onClick={() => audio.toggleSurahPlayback(playable, surahBarIndex)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 transition-colors shrink-0"
              aria-label={surahActive && isPlaying ? "Pause surah" : "Play surah"}
            >
              {surahActive && isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18}>
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18}>
                  <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate">
                Ayah {current.verseNumber} · Surah {chapterId}
              </p>
              <p className="text-[11px] text-white/60">
                {surahBarIndex + 1} of {playable.length} verses with audio
              </p>
            </div>
            <button
              type="button"
              disabled={surahBarIndex <= 0}
              onClick={() => audio.playSurahAt(playable, Math.max(0, surahBarIndex - 1))}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
              aria-label="Previous ayah"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              disabled={surahBarIndex >= playable.length - 1}
              onClick={() => audio.playSurahAt(playable, surahBarIndex + 1)}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 transition-colors"
              aria-label="Next ayah"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                audio.stop();
                audio.setSurahBarVisible(false);
              }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors md:hidden"
              aria-label="Close player"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={16} height={16}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {!surahBarVisible && (
        <button
          type="button"
          onClick={() => audio.playSurahAt(playable, 0)}
          className="fixed bottom-20 md:bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent text-white text-[13px] font-semibold shadow-lg hover:bg-accent-hover transition-all"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16}>
            <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" />
          </svg>
          Play Surah
        </button>
      )}
    </>
  );
}
