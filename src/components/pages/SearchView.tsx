"use client";
import Link from "next/link";
import {
  ChipButton,
  EmptyState,
  IconArrowRight,
  Label,
  PageContent,
  PageHero,
  input as IN,
} from "@/components/ui/primitives";

const SUGGESTIONS = [
  { label: "Patience", query: "patience" },
  { label: "Mercy", query: "mercy" },
  { label: "Al-Fatiha", query: "fatiha" },
  { label: "Ayat al-Kursi", query: "2:255" },
  { label: "Gratitude", query: "grateful" },
  { label: "Forgiveness", query: "forgive" },
];

interface SearchViewProps {
  searchIn: string;
  setSearchIn: (v: string) => void;
  clearSearch: () => void;
  sLoading: boolean;
  sData?: {
    error: string | null;
    navigationItems: { label?: string; readerUrl: string | null; subtitle?: string | null }[];
    query: string;
    verseItems: { readerUrl: string | null; subtitle?: string | null; text?: string; verseKey?: string | null }[];
  };
}

export default function SearchView({
  searchIn,
  setSearchIn,
  clearSearch,
  sLoading,
  sData,
}: SearchViewProps) {
  const hasQuery = searchIn.trim().length > 0;
  const navCount = sData?.navigationItems?.length ?? 0;
  const verseCount = sData?.verseItems?.length ?? 0;
  const hasResults = navCount + verseCount > 0;
  const searched = hasQuery && !sLoading;

  return (
    <PageContent>
      <PageHero
        title="Search the Quran"
        subtitle="Find surahs, topics, or exact verse references. Results open in the reader."
      >
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-tertiary pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            width={20}
            height={20}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            className={IN + " !pl-12 !pr-24 !py-4 !text-[16px] !rounded-2xl shadow-sm"}
            value={searchIn}
            onChange={(e) => setSearchIn(e.target.value)}
            placeholder="Try “mercy”, “Yusuf”, or 2:255…"
            autoFocus
            aria-label="Search the Quran"
          />
          {searchIn && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-ink-secondary bg-surface-hover hover:bg-border transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-[12px] text-ink-tertiary mt-3">Results appear as you type — no need to press Enter.</p>
      </PageHero>

      {!hasQuery && (
        <div className="mb-10">
          <Label>Popular searches</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {SUGGESTIONS.map((s) => (
              <ChipButton key={s.query} onClick={() => setSearchIn(s.query)}>
                {s.label}
              </ChipButton>
            ))}
          </div>
        </div>
      )}

      {sLoading && (
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
          <p className="text-ink-tertiary text-[14px] font-medium">Searching…</p>
        </div>
      )}

      {sData?.error && (
        <div className="p-4 bg-danger-subtle border border-danger/10 rounded-xl text-danger text-[14px] font-medium mb-6">
          {sData.error}
        </div>
      )}

      {searched && !hasResults && !sData?.error && (
        <EmptyState message="No matches found. Try a shorter phrase or a verse key like 2:255." />
      )}

      {hasResults && !sLoading && (
        <div className="space-y-10">
          {navCount > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <Label>Surahs & topics</Label>
                <span className="text-[12px] font-bold text-ink-tertiary">{navCount}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {sData!.navigationItems.map((it, i) => (
                  <Link
                    key={i}
                    href={it.readerUrl ?? "/read/1"}
                    className="group flex flex-col p-4 bg-surface border border-border rounded-xl hover:border-accent/40 hover:shadow-md transition-all"
                  >
                    <strong className="text-[15px] font-semibold text-ink group-hover:text-accent transition-colors flex items-center justify-between gap-2">
                      {it.label}
                      <span className="text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                        <IconArrowRight />
                      </span>
                    </strong>
                    {it.subtitle && <span className="text-[13px] text-ink-tertiary mt-1">{it.subtitle}</span>}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {verseCount > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <Label>Matching verses</Label>
                <span className="text-[12px] font-bold text-ink-tertiary">{verseCount}</span>
              </div>
              <div className="space-y-3">
                {sData!.verseItems.map((it, i) => (
                  <Link
                    key={i}
                    href={it.readerUrl ?? "/read/1"}
                    className="group block p-5 bg-surface border border-border rounded-xl hover:border-accent/40 hover:shadow-md transition-all"
                  >
                    {it.verseKey && (
                      <span className="inline-block px-2.5 py-1 bg-accent-subtle rounded-lg text-[11px] font-bold text-accent mb-3">
                        {it.verseKey}
                      </span>
                    )}
                    {it.subtitle && (
                      <p
                        className="text-[19px] text-ink leading-[1.95] text-right mb-3"
                        dir="rtl"
                        style={{ fontFamily: "var(--font-arabic)" }}
                      >
                        {it.subtitle}
                      </p>
                    )}
                    <p className="text-[14px] text-ink-secondary leading-relaxed line-clamp-4">{it.text}</p>
                    <span className="inline-flex items-center gap-1 mt-3 text-[12px] font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                      Open in reader <IconArrowRight />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!hasQuery && !sLoading && (
        <div className="text-center py-12 px-6 border border-dashed border-border rounded-2xl bg-surface-secondary/30">
          <p className="text-[15px] font-semibold text-ink mb-2">Start with a word or verse</p>
          <p className="text-[13px] text-ink-tertiary max-w-lg mx-auto">
            Search across translations and navigation. Tap a suggestion above or type your own query.
          </p>
        </div>
      )}
    </PageContent>
  );
}
