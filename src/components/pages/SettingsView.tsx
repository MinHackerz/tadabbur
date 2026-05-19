"use client";
import Link from "next/link";
import { READING_MODES, RECITERS, TRANSLATIONS, reciterLabel, translationLabel } from "@/components/reader/readerSession";
import type { ReadingMode } from "@/components/reader/useReaderPrefs";
import type { BootstrapPayload } from "@/lib/types";
import {
  btnPrimary,
  btnSecondary,
  card,
  EmptyState,
  Label,
  PageContent,
  PageHero,
  SectionTitle,
  input as IN,
} from "@/components/ui/primitives";

interface SettingsViewProps {
  isLoggedIn: boolean;
  data: BootstrapPayload;
  trId: string;
  setTrId: (v: string) => void;
  auId: string;
  setAuId: (v: string) => void;
  readingMode: ReadingMode;
  setReadingMode: (m: ReadingMode) => void;
  fontSize: number;
  setFontSize: (n: number) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  openReader: (surah?: number) => void;
}

export default function SettingsView({
  isLoggedIn,
  data,
  trId,
  setTrId,
  auId,
  setAuId,
  readingMode,
  setReadingMode,
  fontSize,
  setFontSize,
  darkMode,
  toggleDarkMode,
  openReader,
}: SettingsViewProps) {
  const user = data.userInfo.data as { firstName?: string; lastName?: string; email?: string } | null;

  return (
    <PageContent>
      <PageHero
        title="Settings"
        subtitle="Your account and how the reader looks and sounds. Changes apply on this device right away."
      />

      <div className="space-y-6 lg:space-y-8 mb-8">
        <div className={card + " feature-card"}>
          <SectionTitle>Account</SectionTitle>
          {data.userInfo.error ? (
            <p className="p-3 bg-danger-subtle text-danger text-[13px] font-medium rounded-xl">{data.userInfo.error}</p>
          ) : user ? (
            <div className="flex items-center gap-4 p-4 bg-surface-secondary border border-border rounded-xl mb-5">
              <div className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center text-xl font-bold shrink-0">
                {(user.firstName?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-[17px] font-bold text-ink truncate">
                  {[user.firstName, user.lastName].filter(Boolean).join(" ") || "Signed in"}
                </h4>
                {user.email && <p className="text-[13px] text-ink-secondary truncate">{user.email}</p>}
              </div>
            </div>
          ) : (
            <EmptyState message="You are browsing as a guest. Sign in to sync bookmarks, notes, and goals." />
          )}

          <div className="flex flex-wrap gap-3">
            {isLoggedIn ? (
              <a
                href="/api/auth/logout"
                className={btnSecondary + " !text-danger hover:!bg-danger-subtle hover:!border-danger/30"}
              >
                Sign out
              </a>
            ) : (
              <a href="/api/auth/start" className={btnPrimary}>
                Sign in with Quran.com
              </a>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 lg:gap-6">
          <Link href="/goals" className={card + " feature-card feature-card--link !py-4"}>
            <p className="text-[14px] font-bold text-ink">Reading goals</p>
            <p className="text-[12px] text-ink-tertiary mt-1">Set daily or weekly targets</p>
          </Link>
          <Link href="/library" className={card + " feature-card feature-card--link !py-4"}>
            <p className="text-[14px] font-bold text-ink">Library</p>
            <p className="text-[12px] text-ink-tertiary mt-1">Bookmarks, notes, and collections</p>
          </Link>
        </div>

        <div className={card + " feature-card"}>
          <SectionTitle>Reader preferences</SectionTitle>
          <p className="text-[13px] text-ink-tertiary mb-5 -mt-2">
            Pick your translation, reciter, and display style. Open the reader anytime to see how it feels.
          </p>

          <div className="space-y-5">
            <div>
              <Label>Translation</Label>
              <select className={IN + " !py-2.5"} value={trId} onChange={(e) => setTrId(e.target.value)}>
                {TRANSLATIONS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Reciter</Label>
              <select className={IN + " !py-2.5"} value={auId} onChange={(e) => setAuId(e.target.value)}>
                {RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Display mode</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {READING_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setReadingMode(m.id)}
                    className={`px-3 py-2 rounded-xl text-[12px] font-semibold border transition-colors ${
                      readingMode === m.id
                        ? "bg-accent text-white border-accent"
                        : "bg-surface border-border text-ink-secondary"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Text size</Label>
              <input
                type="range"
                min={1}
                max={5}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full mt-2 accent-accent"
                aria-valuetext={`Level ${fontSize} of 5`}
              />
              <div className="flex justify-between text-[11px] text-ink-tertiary mt-1">
                <span>Smaller</span>
                <span>Larger</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface-secondary/50">
              <div>
                <p className="text-[14px] font-semibold text-ink">Dark mode</p>
                <p className="text-[12px] text-ink-tertiary">Easier on the eyes at night</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={darkMode}
                onClick={toggleDarkMode}
                className={`relative w-12 h-7 rounded-full transition-colors ${darkMode ? "bg-accent" : "bg-border"}`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-5" : ""}`}
                />
              </button>
            </div>
          </div>

          <button type="button" className={btnPrimary + " w-full mt-6"} onClick={() => openReader()}>
            Open reader
          </button>
          <p className="text-center text-[12px] text-ink-tertiary mt-2">
            {translationLabel(trId)} · {reciterLabel(auId)}
          </p>
        </div>
      </div>
    </PageContent>
  );
}
