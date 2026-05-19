"use client";
import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { prefetchHadith, prefetchReflect, prefetchTafsir, prefetchTranslations } from "./insightApi";
import type { ContentPreviewItem, ReaderPayload } from "@/lib/types";
import { btnSecondary, IconArrowRight, input, Label } from "@/components/ui/primitives";
import ReaderAudioDock, { getPlayableVerses } from "./ReaderAudioDock";
import ReaderSurahHero from "./ReaderSurahHero";
import ReaderToolbar from "./ReaderToolbar";
import { recordReadingVisit } from "@/lib/readingEngagement";
import VerseCard from "./VerseCard";
import VerseInsightPanel from "./VerseInsightPanel";
import type { InsightTab } from "./insightTypes";
import { useReaderAudio } from "./useReaderAudio";
import { useReaderScrollCompact } from "./useReaderScrollCompact";
import { useReadingTracker } from "./useReadingTracker";
import { FONT_SIZE_MAP } from "./fontSizes";
import { READER_MODE_TABS } from "./readerModeTabs";
import { RECITERS, TRANSLATIONS } from "./readerSession";
import type { ReadingMode } from "./useReaderPrefs";

interface ReaderViewProps {
  chapterId: string;
  rData: ReaderPayload | undefined;
  rLoading: boolean;
  rErr: unknown;
  trId: string;
  auId: string;
  setTrId: (v: string) => void;
  setAuId: (v: string) => void;
  readerCh: string;
  setReaderCh: (v: string) => void;
  chapters: ContentPreviewItem[];
  bookmarkedKeys: Set<string>;
  notes: Array<{ id: string | null; body: string; ranges: string[] }>;
  isLoggedIn: boolean;
  onNavigateSurah: (id: number) => void;
  onJumpSurah: () => void;
  onBookmarkVerse: (chapter: number, verse: number) => void;
  onUnbookmarkVerse: (verseKey: string) => void;
  onNoteVerse: (verseKey: string, body: string) => void;
  onUpdateNote: (noteId: string, body: string) => void;
  onDeleteNote: (noteId: string) => void;
  onCopyVerse: (text: string) => void;
  readingMode: ReadingMode;
  fontSize: number;
  darkMode: boolean;
  setReadingMode: (m: ReadingMode) => void;
  setFontSize: (n: number) => void;
  toggleDarkMode: () => void;
}

export default function ReaderView({
  chapterId,
  rData,
  rLoading,
  rErr,
  trId,
  auId,
  setTrId,
  setAuId,
  readerCh,
  setReaderCh,
  chapters,
  bookmarkedKeys,
  notes,
  isLoggedIn,
  onNavigateSurah,
  onJumpSurah,
  onBookmarkVerse,
  onUnbookmarkVerse,
  onNoteVerse,
  onUpdateNote,
  onDeleteNote,
  onCopyVerse,
  readingMode,
  fontSize,
  darkMode,
  setReadingMode,
  setFontSize,
  toggleDarkMode,
}: ReaderViewProps) {
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [surahPickerOpen, setSurahPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noteModal, setNoteModal] = useState<{ verseKey: string; existingNote?: { id: string; body: string } } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [insightVerse, setInsightVerse] = useState<{
    verseKey: string;
    label: string;
    arabicPreview?: string;
    initialTab?: InsightTab;
    instant?: boolean;
  } | null>(null);

  const openInsights = (
    payload: NonNullable<typeof insightVerse>,
  ) => {
    prefetchTranslations(payload.verseKey, trId);
    if (payload.initialTab === "tafsir") prefetchTafsir(payload.verseKey);
    if (payload.initialTab === "hadith") prefetchHadith(payload.verseKey);
    if (payload.initialTab === "reflect") prefetchReflect(payload.verseKey);
    flushSync(() => setInsightVerse(payload));
  };

  const fontClasses = FONT_SIZE_MAP[fontSize] ?? FONT_SIZE_MAP[3];
  const cid = rData?.chapter.id ?? (parseInt(chapterId, 10) || 1);
  const readerAudio = useReaderAudio(setActiveVerse);
  const tracker = useReadingTracker(cid, isLoggedIn);

  useEffect(() => {
    readerAudio.stop();
    readerAudio.setSurahBarVisible(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset audio when surah changes
  }, [chapterId]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#verse-") || !rData) return;
    const n = parseInt(hash.replace("#verse-", ""), 10);
    if (!n) return;
    const t = setTimeout(() => {
      document.getElementById(`verse-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(t);
  }, [rData, chapterId]);

  useEffect(() => {
    if (!activeVerse || readerAudio.source !== "surah") return;
    const el = document.getElementById(`verse-${activeVerse}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeVerse, readerAudio.source]);

  const playable = useMemo(
    () => (rData ? getPlayableVerses(rData.verses) : []),
    [rData],
  );

  const verseProgressPct = useMemo(() => {
    if (!rData?.chapter.versesCount) return 0;
    const v = activeVerse ?? 1;
    return Math.round((v / rData.chapter.versesCount) * 100);
  }, [rData, activeVerse]);

  const verseProgressLabel = rData?.chapter.versesCount
    ? activeVerse
      ? `Ayah ${activeVerse} of ${rData.chapter.versesCount}`
      : `${rData.chapter.versesCount} ayahs`
    : undefined;

  const surahPlaying = readerAudio.source === "surah" && readerAudio.isPlaying;
  const surahAudioActive = readerAudio.source === "surah";
  const scrollCompact = useReaderScrollCompact(chapterId);

  // Helper to find note for a verse
  const findNoteForVerse = (verseKey: string) => {
    return notes.find((note) => 
      note.ranges.some((range) => {
        const [start, end] = range.split('-');
        return start === verseKey || end === verseKey || range === verseKey;
      })
    );
  };

  // Helper to toggle bookmark
  const handleToggleBookmark = (verseKey: string, chapter: number, verse: number) => {
    if (bookmarkedKeys.has(verseKey)) {
      onUnbookmarkVerse(verseKey);
    } else {
      onBookmarkVerse(chapter, verse);
    }
  };

  // Helper to open note modal (create or edit)
  const handleOpenNoteModal = (verseKey: string) => {
    const existingNote = findNoteForVerse(verseKey);
    if (existingNote && existingNote.id) {
      setNoteModal({ verseKey, existingNote: { id: existingNote.id, body: existingNote.body } });
      setNoteText(existingNote.body);
    } else {
      setNoteModal({ verseKey });
      setNoteText("");
    }
  };

  const handlePlaySurah = () => {
    if (!playable.length) return;
    if (readerAudio.source === "surah") {
      readerAudio.toggleSurahPlayback(playable, readerAudio.surahBarIndex);
      return;
    }
    readerAudio.playSurahAt(playable, 0);
  };

  useEffect(() => {
    if (!rData) return;
    recordReadingVisit(cid, activeVerse);
  }, [rData, cid, activeVerse]);

  return (
    <div className="reader-layout pb-32 md:pb-28">
      <ReaderToolbar
        compact={scrollCompact}
        surahLabel={rData ? rData.chapter.nameSimple : `Surah ${chapterId}`}
        surahPickerOpen={surahPickerOpen}
        onToggleSurahPicker={() => setSurahPickerOpen(!surahPickerOpen)}
        readingMode={readingMode}
        onReadingModeChange={setReadingMode}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen(!settingsOpen)}
        verseProgressPct={verseProgressPct}
        verseProgressLabel={verseProgressLabel}
        canPlaySurah={playable.length > 0}
        surahPlaying={surahPlaying}
        surahAudioActive={surahAudioActive}
        onPlaySurah={handlePlaySurah}
        settingsPanel={
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Translation</Label>
              <select className={input + " !py-2.5 appearance-none"} value={trId} onChange={(e) => setTrId(e.target.value)}>
                {TRANSLATIONS.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Reciter</Label>
              <select className={input + " !py-2.5 appearance-none"} value={auId} onChange={(e) => setAuId(e.target.value)}>
                {RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Go to another surah</Label>
              <div className="flex gap-2">
                <input
                  className={input + " !py-2.5"}
                  inputMode="numeric"
                  value={readerCh}
                  onChange={(e) => setReaderCh(e.target.value)}
                  placeholder="Surah number (1–114)"
                  onKeyDown={(e) => e.key === "Enter" && onJumpSurah()}
                />
                <button type="button" className={btnSecondary + " !py-2.5 shrink-0"} onClick={onJumpSurah}>
                  Open
                </button>
              </div>
            </div>
          </div>
        }
        surahPickerPanel={
          <div className="max-h-64 overflow-y-auto grid grid-cols-2 sm:grid-cols-4 gap-2">
            {chapters.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onNavigateSurah(c.id);
                  setSurahPickerOpen(false);
                }}
                className={`flex flex-col items-start p-2.5 rounded-lg text-left transition-colors ${
                  c.id === cid ? "bg-accent-subtle border border-accent/30" : "hover:bg-surface-secondary border border-transparent"
                }`}
              >
                <span className="text-[10px] font-semibold text-ink-quaternary tabular-nums">{c.id}</span>
                <span className="text-[12px] font-semibold text-ink truncate w-full">{c.nameSimple}</span>
              </button>
            ))}
          </div>
        }
      />


      {rLoading && (
        <div className="text-center py-24">
          <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ink-tertiary text-[14px] font-medium">Loading verses…</p>
        </div>
      )}

      {!!rErr && (
        <div className="p-4 bg-danger-subtle border border-danger/10 rounded-xl text-danger text-[14px] font-medium">
          Failed to load chapter. Please try again.
        </div>
      )}

      {rData && (
        <>
          <div className="reader-stage">
          <ReaderSurahHero
            chapter={rData.chapter}
            onNavigateSurah={onNavigateSurah}
            compact={scrollCompact}
          />

          {rData.chapter.id !== 1 && rData.chapter.id !== 9 && (
            <p
              className="text-warm text-center text-2xl md:text-4xl mb-12"
              dir="rtl"
              style={{ fontFamily: "var(--font-decorative)" }}
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          )}

          <div className="space-y-7 md:space-y-8">
            {rData.verses.map((v) => {
              const vk = v.verseKey ?? `${cid}:${v.verseNumber}`;
              const copyText = [v.arabicText, v.translationText].filter(Boolean).join("\n\n");
              const verseNote = findNoteForVerse(vk);
              return (
                <VerseCard
                  key={v.id}
                  verse={v}
                  chapterId={cid}
                  translationId={trId}
                  readingMode={readingMode}
                  fontClasses={fontClasses}
                  isBookmarked={bookmarkedKeys.has(vk)}
                  hasNote={!!verseNote}
                  isActive={activeVerse === v.verseNumber}
                  isAudioPlaying={
                    readerAudio.activeVerse === v.verseNumber &&
                    readerAudio.isPlaying &&
                    readerAudio.source === "verse"
                  }
                  isSurahHighlight={
                    readerAudio.source === "surah" &&
                    readerAudio.activeVerse === v.verseNumber
                  }
                  isLoggedIn={isLoggedIn}
                  onBookmark={() => handleToggleBookmark(vk, cid, v.verseNumber ?? 1)}
                  onNote={() => handleOpenNoteModal(vk)}
                  onCopy={() => onCopyVerse(copyText)}
                  onPlay={() =>
                    v.audioUrl && readerAudio.toggleVerse(v.audioUrl, v.verseNumber ?? 0)
                  }
                  onObserve={tracker.observeVerse}
                  onOpenInsights={(tab) => {
                    const initialTab = tab ?? "tafsir";
                    openInsights({
                      verseKey: vk,
                      label: `Surah ${cid}, Ayah ${v.verseNumber}`,
                      arabicPreview: v.arabicText ?? undefined,
                      initialTab,
                      instant:
                        initialTab === "tafsir" ||
                        initialTab === "hadith" ||
                        initialTab === "reflect",
                    });
                  }}
                />
              );
            })}
          </div>

          {rData.chapter.id < 114 && (
            <div className="reader-end-cta mt-12 p-8 rounded-2xl border border-border bg-surface-secondary/50 text-center">
              <p className="text-[15px] font-semibold text-ink mb-1">Finished {rData.chapter.nameSimple}?</p>
              <p className="text-[13px] text-ink-secondary mb-4">Continue your reading journey with the next surah.</p>
              <button
                type="button"
                onClick={() => onNavigateSurah(rData.chapter.id + 1)}
                className={btnSecondary}
              >
                Next surah <IconArrowRight />
              </button>
            </div>
          )}
          </div>

          {/* Reading tracker HUD — only shown when logged in and something has been read */}
          {isLoggedIn && tracker.versesRead > 0 && (
            <div
              className="fixed bottom-[4.5rem] md:bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
              aria-live="polite"
              aria-label="Reading progress"
            >
              <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-ink/90 text-white text-[12px] font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.25)] backdrop-blur-sm border border-white/10">
                <span className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                  {tracker.versesRead} verse{tracker.versesRead !== 1 ? "s" : ""}
                </span>
                <span className="w-px h-3 bg-white/25" aria-hidden />
                <span className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  {tracker.minutesRead} min
                </span>
                {tracker.pagesRead > 0 && (
                  <>
                    <span className="w-px h-3 bg-white/25" aria-hidden />
                    <span className="flex items-center gap-1.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      {tracker.pagesRead}p
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <ReaderAudioDock
            verses={rData.verses}
            chapterId={cid}
            surahName={rData.chapter.nameSimple}
            audio={readerAudio}
          />
        </>
      )}

      {insightVerse && (
        <VerseInsightPanel
          verseKey={insightVerse.verseKey}
          verseLabel={insightVerse.label}
          arabicPreview={insightVerse.arabicPreview}
          translationId={trId}
          initialTab={insightVerse.initialTab}
          instant={insightVerse.instant}
          isLoggedIn={isLoggedIn}
          onClose={() => setInsightVerse(null)}
        />
      )}

      {noteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px]" onClick={() => setNoteModal(null)}>
          <div 
            className="w-full max-w-md border border-border rounded-2xl p-6 shadow-xl" 
            style={{ backgroundColor: 'var(--color-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-ink text-[16px] mb-1">
              {noteModal.existingNote ? "Edit Note" : "Add Note"}
            </h3>
            <p className="text-[13px] text-ink-secondary mb-4">Verse {noteModal.verseKey}</p>
            <textarea
              className={input + " min-h-[120px] resize-y mb-4"}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your reflection on this verse…"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              {noteModal.existingNote && (
                <button 
                  type="button" 
                  className="inline-flex items-center px-5 py-2.5 rounded-xl font-semibold text-[13px] bg-danger-subtle text-danger hover:bg-danger/10 transition-colors mr-auto"
                  onClick={() => {
                    if (noteModal.existingNote?.id) {
                      onDeleteNote(noteModal.existingNote.id);
                      setNoteModal(null);
                      setNoteText("");
                    }
                  }}
                >
                  Delete
                </button>
              )}
              <button type="button" className={btnSecondary} onClick={() => setNoteModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center px-5 py-2.5 rounded-xl font-semibold text-[13px] bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!noteText.trim()}
                onClick={() => {
                  if (noteText.trim()) {
                    if (noteModal.existingNote?.id) {
                      onUpdateNote(noteModal.existingNote.id, noteText.trim());
                    } else {
                      onNoteVerse(noteModal.verseKey, noteText.trim());
                    }
                    setNoteModal(null);
                    setNoteText("");
                  }
                }}
              >
                {noteModal.existingNote ? "Update" : "Save to Library"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
