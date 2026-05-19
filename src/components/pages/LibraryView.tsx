"use client";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import type { BookmarkItem, BootstrapPayload, NoteItem } from "@/lib/types";
import type { Journey, JourneyDay } from "@/lib/niyyah";
import { totalVersesRead, formatLongDate, progressPct } from "@/lib/niyyah";
import {
  btnDanger,
  btnPrimary,
  btnSecondary,
  card,
  EmptyState,
  IconArrowRight,
  Label,
  PageContent,
  PageHero,
  SectionTitle,
  SignInBanner,
  TabBar,
  input as IN,
  textarea as TA,
} from "@/components/ui/primitives";

type Tab = "bookmarks" | "notes" | "journeys" | "goals";

const fetchJson = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url, { credentials: "include" });
  if (!r.ok) throw new Error("fetch failed");
  return r.json() as Promise<T>;
};

interface LibraryViewProps {
  isLoggedIn: boolean;
  data: BootstrapPayload;
  noteVK: string;
  setNoteVK: (v: string) => void;
  noteBody: string;
  setNoteBody: (v: string) => void;
  bmCh: string;
  setBmCh: (v: string) => void;
  bmV: string;
  setBmV: (v: string) => void;
  collName: string;
  setCollName: (v: string) => void;
  createNote: () => void;
  deleteNote: (id: string | null) => void;
  createBm: () => void;
  deleteBm: (id: string | null) => void;
  createColl: () => void;
  deleteColl: (id: string | null) => void;
  openReader: (surah?: number, hash?: string) => void;
}

export default function LibraryView({
  isLoggedIn,
  data,
  noteVK,
  setNoteVK,
  noteBody,
  setNoteBody,
  bmCh,
  setBmCh,
  bmV,
  setBmV,
  collName,
  setCollName,
  createNote,
  deleteNote,
  createBm,
  deleteBm,
  createColl,
  deleteColl,
  openReader,
}: LibraryViewProps) {
  const [tab, setTab] = useState<Tab>("bookmarks");
  const [showAdd, setShowAdd] = useState(false);

  const notes = data.notes.items;
  const bookmarks = data.bookmarks.items;

  // Fetch all niyyah journeys for the library tabs
  const { data: journeysData } = useSWR<{ journeys: Journey[] }>(
    isLoggedIn ? "/api/niyyah/all" : null,
    fetchJson,
    { revalidateOnFocus: false },
  );
  const allJourneys = journeysData?.journeys ?? [];
  const completedJourneys = allJourneys.filter((j) => j.isComplete);
  const activeJourneys = allJourneys.filter((j) => !j.isComplete);

  // Goals data from bootstrap
  const goalsData = data.goals.data;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "bookmarks", label: "Bookmarks", count: bookmarks.length },
    { id: "notes", label: "Notes", count: notes.length },
    { id: "journeys", label: "Journeys", count: allJourneys.length },
    { id: "goals", label: "Goals" },
  ];

  return (
    <PageContent>
      <PageHero
        title="Your library"
        subtitle="Bookmarks, notes, completed journeys, and reading goals — everything you save lives here."
      />

      {!isLoggedIn && <SignInBanner message="Sign in to sync bookmarks, notes, and journeys across devices." />}

      <TabBar tabs={tabs} active={tab} onChange={(id) => { setTab(id); setShowAdd(false); }} />

      {/* ── Bookmarks & Notes ── */}
      {(tab === "bookmarks" || tab === "notes") && (
        <div className={card + " feature-card mt-6"}>
          <div className="flex items-center justify-between gap-4 mb-5">
            <h3 className="font-bold text-ink text-[15px] tracking-[-0.01em]">
              {tab === "bookmarks" ? "Saved verses" : "Study notes"}
            </h3>
            {isLoggedIn && (
              <button type="button" className={btnSecondary + " !py-2 !px-4 text-[12px]"} onClick={() => setShowAdd(!showAdd)}>
                {showAdd ? "Cancel" : "+ Add new"}
              </button>
            )}
          </div>

          {showAdd && isLoggedIn && tab === "notes" && (
            <div className="p-4 mb-6 rounded-xl border border-border bg-surface-secondary/50 space-y-3">
              <div>
                <Label>Verse reference</Label>
                <input className={IN} value={noteVK} onChange={(e) => setNoteVK(e.target.value)} placeholder="e.g. 2:255" />
              </div>
              <div>
                <Label>Note</Label>
                <textarea className={TA} value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="What stood out to you?" />
              </div>
              <button type="button" className={btnPrimary + " w-full"} onClick={() => { createNote(); setShowAdd(false); }}>
                Save note
              </button>
            </div>
          )}

          {showAdd && isLoggedIn && tab === "bookmarks" && (
            <div className="p-4 mb-6 rounded-xl border border-border bg-surface-secondary/50 space-y-3">
              <Label>Verse to bookmark</Label>
              <div className="flex gap-3">
                <input className={IN} inputMode="numeric" value={bmCh} onChange={(e) => setBmCh(e.target.value)} placeholder="Surah" aria-label="Surah number" />
                <input className={IN} inputMode="numeric" value={bmV} onChange={(e) => setBmV(e.target.value)} placeholder="Ayah" aria-label="Ayah number" />
              </div>
              <button type="button" className={btnPrimary + " w-full"} onClick={() => { createBm(); setShowAdd(false); }}>
                Add bookmark
              </button>
            </div>
          )}

          {tab === "bookmarks" && (
            <LibraryList isEmpty={bookmarks.length === 0} error={data.bookmarks.error} gating={data.bookmarks.gatingMessage} empty="No bookmarks yet. Save verses from the reader with the bookmark icon.">
              {bookmarks.map((b) => (
                <BookmarkRow key={b.id ?? b.verseKey} item={b} onDelete={() => deleteBm(b.id)} />
              ))}
            </LibraryList>
          )}

          {tab === "notes" && (
            <LibraryList isEmpty={notes.length === 0} error={data.notes.error} gating={data.notes.gatingMessage} empty="No notes yet. Add insights while reading or tap + Add new.">
              {notes.map((n) => (
                <NoteRow key={n.id ?? n.body} item={n} onDelete={() => deleteNote(n.id)} openReader={openReader} />
              ))}
            </LibraryList>
          )}
        </div>
      )}

      {/* ── Journeys tab ── */}
      {tab === "journeys" && (
        <div className="mt-6 space-y-8">
          {!isLoggedIn ? (
            <SignInBanner message="Sign in to view your Niyyah journeys." />
          ) : allJourneys.length === 0 ? (
            <div className={card + " feature-card"}>
              <EmptyState message="No journeys yet. Start a Niyyah journey from the home page." />
              <div className="mt-4 text-center">
                <Link href="/" className={btnPrimary}>Begin a journey</Link>
              </div>
            </div>
          ) : (
            <>
              {activeJourneys.length > 0 && (
                <section>
                  <SectionTitle>Active journeys</SectionTitle>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {activeJourneys.map((j) => <JourneyCard key={j.id} journey={j} />)}
                  </div>
                </section>
              )}
              {completedJourneys.length > 0 && (
                <section>
                  <SectionTitle>Completed journeys</SectionTitle>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {completedJourneys.map((j) => <JourneyCard key={j.id} journey={j} completed />)}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Goals tab ── */}
      {tab === "goals" && (
        <div className="mt-6 space-y-6">
          {!isLoggedIn ? (
            <SignInBanner message="Sign in to view your reading goals." />
          ) : (
            <>
              {/* Active goal from QF API */}
              <div className={card + " feature-card"}>
                <SectionTitle>Active reading goal</SectionTitle>
                {goalsData ? (
                  <ActiveGoalCard goal={goalsData} />
                ) : (
                  <div>
                    <EmptyState message="No active goal. Set one to track your daily reading habit." />
                    <div className="mt-4 text-center">
                      <Link href="/goals" className={btnPrimary}>Set a goal</Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Reading history from tracker */}
              <ReadingHistorySection />
            </>
          )}
        </div>
      )}

      {(tab === "bookmarks" || tab === "notes") && (
        <p className="text-center text-[13px] text-ink-tertiary mt-8">
          Tip: bookmark and note directly from any verse in the{" "}
          <button type="button" className="text-accent font-semibold hover:underline" onClick={() => openReader()}>
            reader
          </button>
          .
        </p>
      )}
    </PageContent>
  );
}

/* ── Journey card ─────────────────────────────────────────────────── */

const JOURNEY_TYPE_LABELS: Record<string, string> = {
  living: "Gift to the Living",
  departed: "Memorial Read",
  personal: "Personal Milestone",
};

const JOURNEY_TYPE_COLORS: Record<string, string> = {
  living: "bg-amber-50 border-amber-200 text-amber-800",
  departed: "bg-orange-50 border-orange-200 text-orange-800",
  personal: "bg-emerald-50 border-emerald-200 text-emerald-800",
};

function JourneyCard({ journey, completed = false }: { journey: Journey; completed?: boolean }) {
  const verses = totalVersesRead(journey);
  const pct = progressPct(journey);
  const typeLabel = JOURNEY_TYPE_LABELS[journey.type] ?? journey.type;
  const typeColor = JOURNEY_TYPE_COLORS[journey.type] ?? "bg-surface-secondary border-border text-ink-secondary";

  function handleDownloadGift() {
    window.open(`/api/niyyah/gift?journeyId=${encodeURIComponent(journey.id)}`, "_blank");
  }

  async function handleShareGift() {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://tadabbur.app";
    const message =
      `A Qur'an reading was completed in dedication to ${journey.recipientName} — ${journey.occasion}. ` +
      `${journey.completedDays?.length ?? 0} days, ${verses} verses. May Allah accept it.\n\n` +
      `Start your own journey: ${appUrl}`;

    // Try Web Share API with the stored gift image
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        const res = await fetch(`/api/niyyah/gift?journeyId=${encodeURIComponent(journey.id)}`, { credentials: "include" });
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], `niyyah-gift-${journey.recipientName.replace(/[^a-z0-9]/gi, "-")}.png`, { type: "image/png" });
          const shareData: ShareData = { title: `Niyyah Gift — ${journey.recipientName}`, text: message };
          if (navigator.canShare?.({ files: [file] })) {
            shareData.files = [file];
          }
          await navigator.share(shareData);
          return;
        }
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // Fallback: WhatsApp with text + link
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener");
  }

  return (
    <article className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-accent/30 transition-colors">
      {completed && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-subtle text-accent text-[10px] font-bold uppercase tracking-wide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={10} height={10} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Complete
        </span>
      )}

      <div className="flex items-start gap-3 mb-3">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${typeColor}`}>
          {typeLabel}
        </span>
      </div>

      <h4 className="text-[16px] font-bold text-ink mb-0.5 pr-16">{journey.recipientName}</h4>
      <p className="text-[13px] text-ink-secondary italic mb-3">{journey.occasion}</p>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] font-semibold text-ink-secondary mb-1.5">
          <span>{journey.completedDays.length} / {journey.goalValue} days</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border">
        <Stat label="Verses" value={verses.toLocaleString()} />
        <Stat label="Days done" value={String(journey.completedDays.length)} />
        <Stat label="Streak" value={String(journey.currentStreak)} />
      </div>

      {/* Dates */}
      <div className="flex justify-between text-[11px] text-ink-tertiary mt-3 pt-2 border-t border-border/60">
        <span>Started {formatLongDate(journey.startDate)}</span>
        <span>Target {formatLongDate(journey.targetDate)}</span>
      </div>

      {journey.personalDua && (
        <p className="mt-3 text-[12px] italic text-ink-secondary leading-relaxed border-l-2 border-accent/30 pl-3">
          &ldquo;{journey.personalDua.slice(0, 120)}{journey.personalDua.length > 120 ? "…" : ""}&rdquo;
        </p>
      )}

      {completed && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/60">
          <button
            type="button"
            onClick={handleDownloadGift}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-accent-subtle text-accent hover:bg-accent/15 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={12} height={12}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download Gift
          </button>
          <button
            type="button"
            onClick={handleShareGift}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-surface-secondary text-ink-secondary hover:bg-surface-secondary/80 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={12} height={12}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
            </svg>
            Share
          </button>
        </div>
      )}

      {/* Reading history for completed/active journeys with days */}
      {journey.completedDays && journey.completedDays.length > 0 && (
        <JourneyHistory days={journey.completedDays} />
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[18px] font-bold text-ink leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-ink-tertiary mt-0.5">{label}</p>
    </div>
  );
}

/* ── Journey reading history ──────────────────────────────────────── */

function JourneyHistory({ days }: { days: JourneyDay[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? days : days.slice(-5);

  return (
    <div className="mt-4 pt-3 border-t border-border/60">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-tertiary m-0">
          Reading history
        </p>
        {days.length > 5 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-semibold text-accent hover:underline"
          >
            {expanded ? "Show less" : `Show all ${days.length} days`}
          </button>
        )}
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {visible.map((day, i) => (
          <div
            key={day.date + i}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-secondary/60 border border-border/40 text-[12px]"
          >
            <span className="w-6 h-6 flex items-center justify-center rounded-full bg-accent-subtle text-accent text-[10px] font-bold shrink-0">
              {days.indexOf(day) + 1}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-ink">{day.surahRange}</span>
              <span className="text-ink-tertiary ml-2">{day.versesRead}v</span>
            </div>
            <span className="text-ink-tertiary shrink-0">{formatLongDate(day.date)}</span>
            {day.isMercy && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-warm-subtle text-warm">
                Mercy
              </span>
            )}
          </div>
        ))}
      </div>
      {days.length > 0 && (
        <p className="text-[11px] text-ink-tertiary italic mt-2 m-0">
          {days.reduce((sum, d) => sum + d.versesRead, 0)} total verses across {days.length} days
        </p>
      )}
    </div>
  );
}

/* ── Active goal card ─────────────────────────────────────────────── */

function ActiveGoalCard({ goal }: { goal: Record<string, unknown> }) {
  const period = String(goal.period ?? "daily");
  const type = String(goal.type ?? "PAGES");
  const target = Number(goal.targetAmount ?? goal.target_amount ?? 0);
  const progress = goal.progress as Record<string, unknown> | undefined;
  const completed = Number(progress?.completedAmount ?? progress?.completed_amount ?? 0);
  const pct = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

  const TYPE_LABELS: Record<string, string> = { VERSES: "verses", TIME: "minutes", SURAHS: "surahs" };
  const unit = TYPE_LABELS[type] ?? type.toLowerCase();

  return (
    <div className="p-4 rounded-xl border border-accent/20 bg-accent-subtle/30">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[14px] font-bold text-ink capitalize">{period} · {type.charAt(0) + type.slice(1).toLowerCase()}</p>
          <p className="text-[12px] text-ink-secondary mt-0.5">Target: {target} {unit}</p>
        </div>
        <span className="text-[22px] font-bold text-accent tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-surface-secondary overflow-hidden">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
      {completed > 0 && (
        <p className="text-[12px] text-ink-secondary mt-2">{completed} / {target} {unit} today</p>
      )}
      <div className="mt-3">
        <Link href="/goals" className={btnSecondary + " !py-2 !px-4 text-[12px]"}>
          Manage goal <IconArrowRight />
        </Link>
      </div>
    </div>
  );
}

/* ── Reading history section ──────────────────────────────────────── */

interface ReadingSession {
  id: string;
  date: string;
  surahId: number;
  versesRead: number;
  minutesRead: number;
  pagesRead: number;
  firstVerseKey: string | null;
  lastVerseKey: string | null;
}

function ReadingHistorySection() {
  const { data, isLoading } = useSWR<ReadingSession[]>(
    "/api/reading/history",
    fetchJson,
    { revalidateOnFocus: false },
  );

  if (isLoading) {
    return (
      <div className={card + " feature-card"}>
        <SectionTitle>Reading history</SectionTitle>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-surface-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={card + " feature-card"}>
        <SectionTitle>Reading history</SectionTitle>
        <EmptyState message="No reading sessions recorded yet. Open the reader to start tracking." />
      </div>
    );
  }

  // Group by date
  const byDate = data.reduce<Record<string, ReadingSession[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className={card + " feature-card"}>
      <SectionTitle>Reading history</SectionTitle>
      <div className="space-y-5">
        {Object.entries(byDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 14)
          .map(([date, sessions]) => {
            const totalVerses = sessions.reduce((s, r) => s + r.versesRead, 0);
            const totalMins = sessions.reduce((s, r) => s + r.minutesRead, 0);
            const totalPages = sessions.reduce((s, r) => s + r.pagesRead, 0);
            return (
              <div key={date}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary mb-2">
                  {formatLongDate(date)}
                </p>
                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-surface-secondary/60 border border-border mb-2">
                  <div className="text-center">
                    <p className="text-[18px] font-bold text-ink">{totalVerses}</p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-tertiary">verses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[18px] font-bold text-ink">{totalMins}</p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-tertiary">minutes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[18px] font-bold text-ink">{totalPages}</p>
                    <p className="text-[10px] uppercase tracking-wide text-ink-tertiary">pages</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {sessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface border border-border/60 text-[12px]">
                      <span className="font-semibold text-ink">Surah {s.surahId}</span>
                      <span className="text-ink-secondary">{s.versesRead}v · {s.minutesRead}min · {s.pagesRead}p</span>
                      {s.firstVerseKey && (
                        <Link href={`/read/${s.surahId}#verse-${s.firstVerseKey.split(":")[1]}`} className="text-accent font-semibold hover:underline shrink-0">
                          Open <IconArrowRight />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* ── Shared list wrapper ──────────────────────────────────────────── */

function LibraryList({
  children,
  isEmpty,
  error,
  gating,
  empty,
}: {
  children: React.ReactNode;
  isEmpty: boolean;
  error: string | null;
  gating: string | null;
  empty: string;
}) {
  return (
    <div>
      {error && <p className="text-danger text-[13px] font-medium mb-4 p-3 bg-danger-subtle rounded-xl">{error}</p>}
      {gating && <p className="text-ink-tertiary text-[13px] font-medium mb-4">{gating}</p>}
      {isEmpty && !error ? <EmptyState message={empty} /> : <div className="space-y-2.5">{children}</div>}
    </div>
  );
}

function BookmarkRow({ item, onDelete }: { item: BookmarkItem; onDelete: () => void }) {
  const [ch, v] = item.verseKey.split(":");
  return (
    <div className="group flex items-center gap-3 p-4 bg-surface-secondary/60 border border-border rounded-xl hover:border-accent/30 transition-colors">
      <Link href={item.readerUrl ?? `/read/${ch}#verse-${v}`} className="flex-1 min-w-0">
        <span className="text-[15px] font-bold text-ink group-hover:text-accent transition-colors">{item.verseKey}</span>
        <span className="block text-[12px] text-ink-tertiary capitalize mt-0.5">{item.type}</span>
      </Link>
      <Link href={item.readerUrl ?? `/read/${ch}#verse-${v}`} className={btnSecondary + " !py-2 !px-3 text-[12px] shrink-0"}>
        Read <IconArrowRight />
      </Link>
      <button type="button" className={btnDanger + " shrink-0"} onClick={onDelete} aria-label="Remove bookmark">
        Remove
      </button>
    </div>
  );
}

function NoteRow({
  item,
  onDelete,
  openReader,
}: {
  item: NoteItem;
  onDelete: () => void;
  openReader: (surah?: number, hash?: string) => void;
}) {
  const range = item.ranges[0] ?? "";
  const verseKey = range.includes("-") ? range.split("-")[0] : range;
  const [ch] = verseKey.split(":");

  return (
    <div className="group p-4 bg-surface-secondary/60 border border-border rounded-xl hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <button
          type="button"
          onClick={() => openReader(parseInt(ch, 10) || 1, verseKey.includes(":") ? `#verse-${verseKey.split(":")[1]}` : undefined)}
          className="inline-block px-2.5 py-1 bg-accent-subtle rounded-lg text-[11px] font-bold text-accent hover:bg-accent/15 transition-colors"
        >
          {verseKey}
        </button>
        <button type="button" className={btnDanger + " shrink-0 md:opacity-0 md:group-hover:opacity-100"} onClick={onDelete}>
          Remove
        </button>
      </div>
      <p className="text-[14px] text-ink leading-relaxed">{item.body}</p>
    </div>
  );
}
