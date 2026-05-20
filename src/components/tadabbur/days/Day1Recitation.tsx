"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  verseKey: string;
  audioUrl: string;
  onJournalSave: (content: string) => void;
  existingJournal?: string;
}

export default function Day1Recitation({ verseKey, audioUrl, onJournalSave, existingJournal }: Props) {
  const [playCount, setPlayCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [journalContent, setJournalContent] = useState(existingJournal || "");
  const [saved, setSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (playCount < 7) {
        setPlayCount(prev => prev + 1);
        audio.currentTime = 0;
        audio.play();
      } else {
        setIsPlaying(false);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [playCount]);

  const handlePlay = () => {
    if (audioRef.current && playCount === 0) {
      setPlayCount(1);
      audioRef.current.play();
    }
  };

  const handleSave = () => {
    onJournalSave(journalContent);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <audio ref={audioRef} src={audioUrl} preload="auto" />
      
      <div className="bg-accent-subtle border border-accent/20 rounded-xl p-6 text-center">
        <p className="text-[14px] text-ink-secondary mb-6">
          Close your eyes. Listen to this verse 7 times. Let the sound wash over you without analyzing.
        </p>
        
        <button
          onClick={handlePlay}
          disabled={playCount >= 7 || isPlaying}
          className="bg-accent hover:bg-accent-hover text-white px-8 py-4 rounded-xl font-medium text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-3"
        >
          {playCount === 0 && (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play 7 Times
            </>
          )}
          {playCount > 0 && playCount < 7 && (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Playing {playCount}/7...
            </>
          )}
          {playCount >= 7 && (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Completed 7 Plays
            </>
          )}
        </button>

        {playCount > 0 && playCount < 7 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i < playCount ? "bg-accent" : "bg-border"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {playCount >= 7 && (
        <div className="bg-surface border border-border rounded-xl p-6 animate-fade-in">
          <label className="block text-[13px] font-medium text-ink-secondary mb-3">
            What is the first word or feeling that came to you?
          </label>
          <textarea
            value={journalContent}
            onChange={(e) => setJournalContent(e.target.value)}
            className="w-full min-h-[150px] p-4 border border-border rounded-xl text-[14px] text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none bg-surface"
            placeholder="The first word or feeling that came to me was..."
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-[12px] text-ink-tertiary">
              {journalContent.length} characters
            </span>
            <button
              onClick={handleSave}
              disabled={!journalContent.trim()}
              className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saved ? "Saved ✓" : "Save Reflection"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
