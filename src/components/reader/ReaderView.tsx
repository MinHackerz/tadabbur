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
  isLoggedIn: boolean;
  onNavigateSurah: (id: number) => void;
  onJumpSurah: () => void;
  onBookmarkVerse: (chapter: number, verse: number) => void;
  onNoteVerse: (verseKey: string, body: string) => void;
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
  isLoggedIn,
  onNavigateSurah,
  onJumpSurah,
  onBookmarkVerse,
  onNoteVerse,
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
  const [noteModal, setNoteModal] = useState<{ verseKey: string } | null>(null);
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
              return (
                <VerseCard
                  key={v.id}
                  verse={v}
                  chapterId={cid}
                  translationId={trId}
                  readingMode={readingMode}
                  fontClasses={fontClasses}
                  isBookmarked={bookmarkedKeys.has(vk)}
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
                  onBookmark={() => onBookmarkVerse(cid, v.verseNumber ?? 1)}
                  onNote={() => {
                    setNoteModal({ verseKey: vk });
                    setNoteText("");
                  }}
                  onCopy={() => onCopyVerse(copyText)}
                  onPlay={() =>
                    v.audioUrl && readerAudio.toggleVerse(v.audioUrl, v.verseNumber ?? 0)
                  }
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/10 backdrop-blur-[2px]">
          <div 
            className="w-full max-w-md border border-border rounded-2xl p-6 shadow-xl" 
            style={{ backgroundColor: 'var(--color-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-ink text-[16px] mb-1">Add Note</h3>
            <p className="text-[13px] text-ink-secondary mb-4">Verse {noteModal.verseKey}</p>
            <textarea
              className={input + " min-h-[120px] resize-y mb-4"}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your reflection on this verse…"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button type="button" className={btnSecondary} onClick={() => setNoteModal(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="inline-flex items-center px-5 py-2.5 rounded-xl font-semibold text-[13px] bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!noteText.trim()}
                onClick={() => {
                  if (noteText.trim()) onNoteVerse(noteModal.verseKey, noteText.trim());
                  setNoteModal(null);
                  setNoteText("");
                }}
              >
                Save to Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
