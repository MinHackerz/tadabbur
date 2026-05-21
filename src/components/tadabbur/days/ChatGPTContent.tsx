"use client";

import { useState, useEffect, useMemo } from "react";

interface Props {
  circleId: string;
  day: number;
  angleType: string;
  verseKey: string;
  verseText: string;
  verseTranslation: string;
  title: string;
  description: string;
}

interface ParsedSource {
  index: number;
  title: string;
  host: string;
  url: string;
}

export default function ChatGPTContent({
  circleId,
  day,
  angleType,
  verseKey,
  verseText,
  verseTranslation,
  title,
  description,
}: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [sourcesRaw, setSourcesRaw] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circleId, day, angleType]);

  async function fetchContent() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        circleId,
        day: day.toString(),
        angleType,
        verseKey,
        verseText,
        verseTranslation,
      });

      const res = await fetch(`/api/tadabbur/content?${params}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch content");
      }

      setContent(data.content);
      setSourcesRaw(data.sources ?? null);
      setCached(data.cached);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  /**
   * Strip residual markdown emphasis that older cached responses may carry
   * (the new generator strips it server-side, but we defend the rendering
   * layer too so cached pre-update entries stay clean).
   */
  const cleanContent = useMemo(() => {
    if (!content) return null;
    return content
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      .replace(/__([^_\n]+)__/g, "$1")
      .replace(/(^|[^*\n])\*([^*\n]+)\*(?!\*)/g, "$1$2")
      .replace(/(^|[^_\n])_([^_\n]+)_(?!_)/g, "$1$2")
      .replace(/[ \t]+$/gm, "")
      .trim();
  }, [content]);

  /**
   * Parse sources block. New format: "N. Title | host | url" per line.
   * Falls back to plain text rendering if the format doesn't match.
   */
  const parsedSources = useMemo<ParsedSource[] | null>(() => {
    if (!sourcesRaw) return null;
    const lines = sourcesRaw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: ParsedSource[] = [];
    for (const line of lines) {
      // "1. Title | host | url"
      const m = line.match(/^(\d+)\.\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(https?:\/\/\S+)\s*$/);
      if (m) {
        parsed.push({
          index: Number(m[1]),
          title: m[2],
          host: m[3],
          url: m[4],
        });
      }
    }
    return parsed.length ? parsed : null;
  }, [sourcesRaw]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center">
          <div className="absolute h-12 w-12 rounded-full border border-warm/30 animate-pulse" />
          <div className="h-9 w-9 rounded-full border-2 border-border border-t-warm animate-spin" />
        </div>
        <p className="text-[14px] font-medium text-ink">
          {cached ? "Loading reflection…" : "Composing your reflection"}
        </p>
        <p className="mt-1 text-[12px] text-ink-tertiary">
          Drawing on classical and contemporary scholarship
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger-subtle/60 p-6">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 shrink-0 text-danger mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <div>
            <h4 className="mb-1 text-[14px] font-semibold text-danger">
              Reflection unavailable
            </h4>
            <p className="text-[13px] text-danger/80">{error}</p>
            {error.includes("OpenAI") && (
              <p className="mt-2 text-[12px] text-danger/70">
                Configure OPENAI_API_KEY in your environment to enable this angle.
              </p>
            )}
            <button
              onClick={fetchContent}
              className="mt-3 text-[13px] font-semibold text-danger hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Angle intro — matches the warm parchment / gold accent used across the site */}
      <div className="relative overflow-hidden rounded-2xl border border-warm/20 bg-gradient-to-br from-warm-subtle/60 via-surface to-accent-subtle/40 p-6 shadow-sm">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-warm/10 blur-3xl"
        />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-warm">
            <span className="h-1 w-6 rounded-full bg-warm" />
            Tadabbur Reflection
          </div>
          <h3 className="mb-1.5 font-niyyah-display text-[20px] font-semibold leading-tight text-ink">
            {title}
          </h3>
          <p className="text-[13px] leading-relaxed text-ink-secondary">{description}</p>
          {cached && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-subtle/70 px-2.5 py-1 text-[11px] font-semibold text-accent">
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Shared reflection
            </div>
          )}
        </div>
      </div>

      {/* The reflection itself */}
      {cleanContent && (
        <article className="rounded-2xl border border-border bg-surface px-6 py-7 shadow-sm md:px-8 md:py-8">
          <ProseRenderer
            text={cleanContent}
            sourceCount={parsedSources?.length ?? 0}
          />
        </article>
      )}

      {/* References — minimal, numbered, professional */}
      {parsedSources && parsedSources.length > 0 ? (
        <ReferencesBlock sources={parsedSources} />
      ) : sourcesRaw ? (
        <div className="rounded-2xl border border-border bg-surface-secondary/60 p-5">
          <ReferencesHeader />
          <p className="mt-3 whitespace-pre-wrap text-[12px] leading-relaxed text-ink-secondary">
            {sourcesRaw}
          </p>
        </div>
      ) : null}

      {/* Disclosure — quieter, in the parchment tone */}
      <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-surface-secondary/50 px-4 py-3.5">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-ink-tertiary"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="text-[12px] leading-relaxed text-ink-tertiary">
          Generated with AI from classical and contemporary Islamic scholarship and reviewed
          against authentic sources. For binding religious matters, consult a qualified scholar.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────── prose renderer ───────────────────── */

function ProseRenderer({ text, sourceCount }: { text: string; sourceCount: number }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  return (
    <div className="space-y-5">
      {blocks.map((block, idx) => {
        if (block.kind === "heading") {
          return (
            <div key={idx} className="space-y-2">
              {idx > 0 && (
                <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
              )}
              <h4 className="font-niyyah-display text-[18px] font-semibold leading-snug text-ink md:text-[19px]">
                <span className="mr-2 inline-block text-warm">✦</span>
                {block.text}
              </h4>
            </div>
          );
        }
        if (block.kind === "bullets") {
          return (
            <ul key={idx} className="space-y-2 pl-1">
              {block.items.map((item, i) => (
                <li
                  key={i}
                  className="relative pl-5 text-[14px] leading-relaxed text-ink-secondary"
                >
                  <span
                    aria-hidden
                    className="absolute left-0 top-[0.62em] h-1.5 w-1.5 rounded-full bg-warm/70"
                  />
                  {renderInline(item, sourceCount)}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p
            key={idx}
            className="text-[14.5px] leading-[1.75] text-ink"
            style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
          >
            {renderInline(block.text, sourceCount)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.split(/\r?\n/);
  const blocks: Block[] = [];
  let para: string[] = [];
  let bullets: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: "paragraph", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushBullets = () => {
    if (bullets.length) {
      blocks.push({ kind: "bullets", items: bullets.slice() });
      bullets = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushPara();
      flushBullets();
      continue;
    }
    if (/^#{1,6}\s+/.test(line)) {
      flushPara();
      flushBullets();
      blocks.push({ kind: "heading", text: line.replace(/^#{1,6}\s+/, "").trim() });
      continue;
    }
    if (/^[-•]\s+/.test(line)) {
      flushPara();
      bullets.push(line.replace(/^[-•]\s+/, "").trim());
      continue;
    }
    flushBullets();
    para.push(line);
  }
  flushPara();
  flushBullets();
  return blocks;
}

/**
 * Render inline text, turning `[1]` / `[1, 2]` into compact citation pills.
 */
function renderInline(text: string, sourceCount: number) {
  if (!text) return null;
  const parts: Array<string | { cites: number[] }> = [];
  const re = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) parts.push(text.slice(lastIndex, m.index));
    const nums = m[1]
      .split(",")
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isFinite(n));
    parts.push({ cites: nums });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return parts.map((part, i) => {
    if (typeof part === "string") return <span key={i}>{part}</span>;
    return (
      <span key={i} className="ml-0.5 inline-flex gap-0.5 align-baseline">
        {part.cites.map((n) => {
          const valid = sourceCount > 0 && n >= 1 && n <= sourceCount;
          return (
            <a
              key={n}
              href={`#source-${n}`}
              onClick={(e) => {
                if (!valid) e.preventDefault();
              }}
              className={
                "inline-flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none tabular-nums " +
                (valid
                  ? "bg-warm/15 text-warm hover:bg-warm/25 transition-colors"
                  : "bg-surface-secondary text-ink-tertiary")
              }
              aria-label={`Reference ${n}`}
            >
              {n}
            </a>
          );
        })}
      </span>
    );
  });
}

/* ───────────────────── references ───────────────────── */

function ReferencesHeader() {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-warm/15 text-warm">
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </span>
      <h4 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-secondary">
        References
      </h4>
    </div>
  );
}

function ReferencesBlock({ sources }: { sources: ParsedSource[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-secondary/60 px-5 py-4">
      <ReferencesHeader />
      <ol className="mt-3 space-y-2">
        {sources.map((s) => (
          <li
            key={s.index}
            id={`source-${s.index}`}
            className="flex items-start gap-3 text-[13px] leading-relaxed scroll-mt-24"
          >
            <span className="mt-0.5 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-md bg-warm/12 px-1 text-[10px] font-bold tabular-nums text-warm">
              {s.index}
            </span>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex-1 min-w-0 -mt-0.5"
            >
              <span className="block truncate font-medium text-ink group-hover:text-accent transition-colors">
                {s.title}
              </span>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-mono text-ink-tertiary group-hover:text-accent transition-colors">
                {s.host}
                <svg
                  className="h-2.5 w-2.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </span>
            </a>
          </li>
        ))}
      </ol>
      <p className="mt-3 border-t border-border/60 pt-2.5 text-[10.5px] uppercase tracking-[0.1em] text-ink-tertiary">
        Curated from peer-reviewed Islamic publications
      </p>
    </div>
  );
}
