"use client";
import Link from "next/link";
import { useState } from "react";
import type { BookmarkItem, BootstrapPayload, NoteItem } from "@/lib/types";
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

type Tab = "notes" | "bookmarks";

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
  const collections = data.collections.items;

  const tabs = [
    { id: "bookmarks" as const, label: "Bookmarks", count: bookmarks.length },
    { id: "notes" as const, label: "Notes", count: notes.length },
  ];

  return (
    <PageContent>
      <PageHero
        title="Your library"
        subtitle="Bookmarks and personal notes — everything you save while reading lives here."
      />

      {!isLoggedIn && <SignInBanner message="Sign in to sync bookmarks and notes across devices." />}

      <TabBar tabs={tabs} active={tab} onChange={(id) => { setTab(id); setShowAdd(false); }} />

      <div className={card + " feature-card mt-6"}>
        <div className="flex items-center justify-between gap-4 mb-5">
          <h3 className="font-bold text-ink text-[15px] tracking-[-0.01em]">
            {tab === "bookmarks" && "Saved verses"}
            {tab === "notes" && "Study notes"}
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
          <LibraryList
            isEmpty={bookmarks.length === 0}
            error={data.bookmarks.error}
            gating={data.bookmarks.gatingMessage}
            empty="No bookmarks yet. Save verses from the reader with the bookmark icon."
          >
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

      <p className="text-center text-[13px] text-ink-tertiary mt-8">
        Tip: bookmark and note directly from any verse in the{" "}
        <button type="button" className="text-accent font-semibold hover:underline" onClick={() => openReader()}>
          reader
        </button>
        .
      </p>
    </PageContent>
  );
}

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
      <button type="button" className={btnDanger + " shrink-0 md:opacity-0 md:group-hover:opacity-100"} onClick={onDelete} aria-label="Remove bookmark">
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
