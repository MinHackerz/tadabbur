"use client";
import type { ReactNode } from "react";
import { READER_MODE_TABS } from "./readerModeTabs";
import type { ReadingMode } from "./useReaderPrefs";

interface ReaderToolbarProps {
  surahLabel: string;
  surahPickerOpen: boolean;
  onToggleSurahPicker: () => void;
  readingMode: ReadingMode;
  onReadingModeChange: (m: ReadingMode) => void;
  fontSize: number;
  onFontSizeChange: (n: number) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  showTransliteration: boolean;
  onToggleTransliteration: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  verseProgressPct: number;
  verseProgressLabel?: string;
  canPlaySurah?: boolean;
  surahPlaying?: boolean;
  surahAudioActive?: boolean;
  onPlaySurah?: () => void;
  settingsPanel?: ReactNode;
  surahPickerPanel?: ReactNode;
  compact?: boolean;
}

export default function ReaderToolbar({
  surahLabel,
  surahPickerOpen,
  onToggleSurahPicker,
  readingMode,
  onReadingModeChange,
  fontSize,
  onFontSizeChange,
  darkMode,
  onToggleDarkMode,
  showTransliteration,
  onToggleTransliteration,
  settingsOpen,
  onToggleSettings,
  verseProgressPct,
  verseProgressLabel,
  canPlaySurah = false,
  surahPlaying = false,
  surahAudioActive = false,
  onPlaySurah,
  settingsPanel,
  surahPickerPanel,
  compact = false,
}: ReaderToolbarProps) {
  return (
    <div
      className={`reader-toolbar-bar sticky top-14 z-30 ${compact ? "reader-toolbar-bar--compact mb-3" : "mb-8"}`}
    >
      <div className={`reader-toolbar-bar__inner ${compact ? "reader-toolbar-bar__inner--compact" : ""}`}>
        <div className={`reader-toolbar-bar__row ${compact ? "reader-toolbar-bar__row--compact" : ""}`}>
          <button
            type="button"
            onClick={onToggleSurahPicker}
            aria-expanded={surahPickerOpen}
            className={`reader-toolbar-surah ${surahPickerOpen ? "reader-toolbar-surah--open" : ""} ${compact ? "reader-toolbar-surah--compact" : ""}`}
          >
            <span className="reader-toolbar-surah__icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </span>
            <span className="reader-toolbar-surah__text">
              <span className="reader-toolbar-surah__label">Surah</span>
              <span className="reader-toolbar-surah__name">{surahLabel}</span>
            </span>
            <svg
              className={`reader-toolbar-surah__chevron ${surahPickerOpen ? "reader-toolbar-surah__chevron--open" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              width={16}
              height={16}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          <div
            className={`reader-toolbar-modes ${compact ? "reader-toolbar-modes--compact" : ""}`}
            role="tablist"
            aria-label="Reading display"
          >
            {READER_MODE_TABS.map((m) => {
              const active = readingMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={m.title}
                  onClick={() => onReadingModeChange(m.id)}
                  className={`reader-toolbar-mode ${active ? "reader-toolbar-mode--active" : ""}`}
                >
                  <span className="reader-toolbar-mode__label reader-toolbar-mode__label--long">
                    {m.label}
                  </span>
                  <span className="reader-toolbar-mode__label reader-toolbar-mode__label--short">
                    {m.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="reader-toolbar-actions">
            {onPlaySurah && (
              <button
                type="button"
                onClick={onPlaySurah}
                aria-pressed={surahPlaying}
                disabled={!canPlaySurah}
                className={`reader-toolbar-play ${surahPlaying ? "reader-toolbar-play--active" : surahAudioActive ? "reader-toolbar-play--paused" : ""} ${!canPlaySurah ? "opacity-40 cursor-not-allowed" : ""}`}
                aria-label={
                  surahPlaying
                    ? "Pause surah recitation"
                    : surahAudioActive
                      ? "Resume surah recitation"
                      : "Play surah recitation"
                }
              >
                {surahPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18} aria-hidden>
                    <rect x="6" y="5" width="4" height="14" rx="1" />
                    <rect x="14" y="5" width="4" height="14" rx="1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18} aria-hidden>
                    <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" />
                  </svg>
                )}
                <span className="reader-toolbar-play__label">Listen</span>
              </button>
            )}

            <ToolbarIconButton
              label="Decrease font size"
              onClick={() => onFontSizeChange(fontSize - 1)}
              disabled={fontSize <= 1}
            >
              <span className="text-[13px] font-bold">A−</span>
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Increase font size"
              onClick={() => onFontSizeChange(fontSize + 1)}
              disabled={fontSize >= 5}
            >
              <span className="text-[13px] font-bold">A+</span>
            </ToolbarIconButton>
            <ToolbarIconButton label={darkMode ? "Light mode" : "Dark mode"} onClick={onToggleDarkMode}>
              {darkMode ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={18} height={18}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={18} height={18}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                </svg>
              )}
            </ToolbarIconButton>
            <ToolbarIconButton 
              label={showTransliteration ? "Hide transliteration" : "Show transliteration"} 
              onClick={onToggleTransliteration}
              active={showTransliteration}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={18} height={18}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
              </svg>
            </ToolbarIconButton>
            <ToolbarIconButton label="Reader settings" onClick={onToggleSettings} active={settingsOpen}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={18} height={18}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </ToolbarIconButton>
          </div>
        </div>

        <div
          className={`reader-toolbar-bar__progress ${compact ? "reader-toolbar-bar__progress--compact" : ""}`}
        >
          <div
            className="reader-toolbar-bar__progress-fill"
            style={{ width: `${Math.min(100, Math.max(0, verseProgressPct))}%` }}
          />
          {verseProgressLabel && !compact && (
            <span className="reader-toolbar-bar__progress-label">{verseProgressLabel}</span>
          )}
        </div>

        {surahPickerOpen && surahPickerPanel && (
          <div className="reader-toolbar-bar__panel">{surahPickerPanel}</div>
        )}
        {settingsOpen && settingsPanel && (
          <div className="reader-toolbar-bar__panel">{settingsPanel}</div>
        )}
      </div>
    </div>
  );
}

function ToolbarIconButton({
  children,
  label,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`reader-toolbar-icon ${active ? "reader-toolbar-icon--active" : ""}`}
    >
      {children}
    </button>
  );
}
