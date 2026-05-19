"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type AudioSource = "verse" | "surah" | null;

export interface PlayableVerse {
  audioUrl: string;
  verseNumber: number | null;
}

export function useReaderAudio(onActiveVerse?: (verseNumber: number | null) => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const surahQueueRef = useRef<PlayableVerse[]>([]);
  const surahIndexRef = useRef(0);

  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [source, setSource] = useState<AudioSource>(null);
  const [surahBarIndex, setSurahBarIndex] = useState(0);
  const [surahBarVisible, setSurahBarVisible] = useState(false);

  const notifyActive = useCallback(
    (verseNumber: number | null) => {
      setActiveVerse(verseNumber);
      onActiveVerse?.(verseNumber);
    },
    [onActiveVerse],
  );

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return audioRef.current;
  }, []);

  const detachHandlers = useCallback((audio: HTMLAudioElement) => {
    audio.onended = null;
    audio.onerror = null;
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      detachHandlers(audio);
    }
    setIsPlaying(false);
    setSource(null);
    notifyActive(null);
    surahQueueRef.current = [];
    surahIndexRef.current = 0;
  }, [detachHandlers, notifyActive]);

  const playAudio = useCallback(
    (audio: HTMLAudioElement, url: string, verseNumber: number | null, nextSource: AudioSource) => {
      detachHandlers(audio);
      audio.pause();
      audio.src = url;
      setSource(nextSource);
      if (nextSource === "verse") {
        surahQueueRef.current = [];
        setSurahBarVisible(false);
      }
      notifyActive(verseNumber);
      audio.onended = () => stop();
      audio.onerror = () => stop();
      return audio.play().then(() => setIsPlaying(true)).catch(() => {
        stop();
      });
    },
    [detachHandlers, notifyActive, stop],
  );

  const toggleVerse = useCallback(
    (url: string, verseNumber: number) => {
      const audio = getAudio();

      if (source === "verse" && activeVerse === verseNumber) {
        if (isPlaying) {
          audio.pause();
          setIsPlaying(false);
          return;
        }
        if (audio.src && audio.paused) {
          audio.play().then(() => setIsPlaying(true)).catch(() => stop());
          return;
        }
      }

      void playAudio(audio, url, verseNumber, "verse");
    },
    [activeVerse, getAudio, isPlaying, playAudio, source, stop],
  );

  const playSurahAt = useCallback(
    (playable: PlayableVerse[], index: number) => {
      const verse = playable[index];
      if (!verse?.audioUrl || verse.verseNumber === null) return;

      surahQueueRef.current = playable;
      surahIndexRef.current = index;
      setSurahBarIndex(index);
      setSurahBarVisible(true);

      const audio = getAudio();
      detachHandlers(audio);

      const playNextInQueue = (i: number) => {
        const item = surahQueueRef.current[i];
        if (!item?.audioUrl || item.verseNumber === null) {
          stop();
          return;
        }

        surahIndexRef.current = i;
        setSurahBarIndex(i);
        setSource("surah");
        notifyActive(item.verseNumber);
        audio.src = item.audioUrl;
        audio.onended = () => {
          if (i + 1 < surahQueueRef.current.length) {
            playNextInQueue(i + 1);
          } else {
            stop();
            setSurahBarVisible(false);
          }
        };
        audio.onerror = () => stop();
        audio
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => stop());
      };

      playNextInQueue(index);
    },
    [detachHandlers, getAudio, notifyActive, stop],
  );

  const toggleSurahPlayback = useCallback(
    (playable: PlayableVerse[], index: number) => {
      if (source === "surah" && isPlaying) {
        getAudio().pause();
        setIsPlaying(false);
        return;
      }
      if (source === "surah" && !isPlaying && audioRef.current?.src) {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => stop());
        return;
      }
      playSurahAt(playable, index);
    },
    [getAudio, isPlaying, playSurahAt, source, stop],
  );

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return {
    activeVerse,
    isPlaying,
    source,
    surahBarIndex,
    surahBarVisible,
    setSurahBarVisible,
    toggleVerse,
    playSurahAt,
    toggleSurahPlayback,
    stop,
  };
}
