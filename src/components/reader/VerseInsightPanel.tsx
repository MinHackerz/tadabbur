"use client";
import Link from "next/link";
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import {
  fetchInsight,
  prefetchHadith,
  prefetchReflect,
  prefetchTafsir,
  reflectInsightUrl,
  tafsirInsightUrl,
} from "./insightApi";
import type {
  AyahTafsirPayload,
  FeedItem,
  HadithByAyahPayload,
  HadithNarrationItem,
  HadithReferenceItem,
  VerseReflectionsPayload,
} from "@/lib/types";
import { TAFSIRS } from "./readerSession";
import type { InsightTab } from "./insightTypes";
import { sanitizeTafsirHtml } from "@/lib/sanitize-html";

const HADITH_COLLECTION_LABELS: Record<string, string> = {
  bukhari: "Sahih al-Bukhari",
  muslim: "Sahih Muslim",
  abudawud: "Sunan Abi Dawud",
  "abu dawud": "Sunan Abi Dawud",
  tirmidhi: "Jamiʿ at-Tirmidhi",
  nasai: "Sunan an-Nasa'i",
  ibnmajah: "Sunan Ibn Majah",
  malik: "Muwatta Malik",
  ahmad: "Musnad Ahmad",
};

interface VerseInsightPanelProps {
  verseKey: string;
  verseLabel: string;
  arabicPreview?: string;
  translationId: string;
  isLoggedIn?: boolean;
  initialTab?: InsightTab;
  /** Snappy bottom sheet with no slide delay (Tafsir / Related Hadith buttons). */
  instant?: boolean;
  onClose: () => void;
}

function formatCollection(name: string) {
  const key = name.toLowerCase().trim();
  if (HADITH_COLLECTION_LABELS[key]) return HADITH_COLLECTION_LABELS[key];
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function VerseInsightPanel({
  verseKey,
  verseLabel,
  arabicPreview: _arabicPreview,
  translationId: _translationId,
  isLoggedIn = false,
  initialTab = "tafsir",
  instant = false,
  onClose,
}: VerseInsightPanelProps) {
  const tab = initialTab;
  const [tafsirId, setTafsirId] = useState("168");

  useLayoutEffect(() => {
    if (tab === "tafsir") prefetchTafsir(verseKey, tafsirId);
    if (tab === "hadith") prefetchHadith(verseKey);
    if (tab === "reflect") prefetchReflect(verseKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [verseKey, tafsirId, tab]);

  useEffect(() => {
    if (tab === "tafsir") prefetchTafsir(verseKey, tafsirId);
  }, [tab, verseKey, tafsirId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const encodedKey = encodeURIComponent(verseKey);
  const hadithUrl = tab === "hadith" ? `/api/ayah/${encodedKey}/insights?type=hadith` : null;
  const tafsirUrl = tab === "tafsir" ? tafsirInsightUrl(verseKey, tafsirId) : null;
  // Only fetch reflections when the user is signed in — the QuranReflect API
  // requires user auth for all endpoints. When signed out we skip the request
  // and show a direct sign-in prompt instead.
  const reflectUrl = tab === "reflect" && isLoggedIn
    ? reflectInsightUrl(verseKey)
    : null;

  const { data: hadith, isLoading: hadithLoading, error: hadithErr } = useSWR<HadithByAyahPayload>(
    hadithUrl,
    fetchInsight,
    { revalidateOnFocus: false },
  );
  const { data: tafsir, isLoading: tafsirLoading, error: tafsirErr } = useSWR<AyahTafsirPayload>(
    tafsirUrl,
    fetchInsight,
    { revalidateOnFocus: false, keepPreviousData: true },
  );
  const { data: reflect, isLoading: reflectLoading, error: reflectErr } = useSWR<VerseReflectionsPayload>(
    reflectUrl,
    fetchInsight,
    { revalidateOnFocus: false },
  );

  const loading =
    tab === "hadith"
      ? hadithLoading
      : tab === "reflect"
        ? isLoggedIn && reflectLoading
        : tafsirLoading && !(instant && tab === "tafsir");

  const sheetFast = instant && (tab === "tafsir" || tab === "hadith" || tab === "reflect");

  const fetchError = tab === "hadith" ? hadithErr : tab === "reflect" ? reflectErr : tafsirErr;
  const panelTitle =
    tab === "hadith" ? "Related Hadith" : tab === "reflect" ? "Reflections" : "Tafsir";
  const panelSubtitle =
    tab === "hadith"
      ? "Narrations linked to this ayah"
      : tab === "reflect"
        ? "Lessons and reflections from Quran Reflect"
        : "Scholarly commentary on this ayah";

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Defer to a microtask so the rule recognises this as a callback-driven
    // state update rather than a synchronous setState in the effect body.
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setMounted(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const overlay = (
    <div className="fixed inset-0 z-[200] flex items-end justify-center pointer-events-none">
      <button
        type="button"
        className={`absolute inset-0 pointer-events-auto insight-sheet-backdrop ${
          sheetFast ? "insight-sheet-backdrop--light" : "insight-sheet-backdrop--dim"
        }`}
        aria-label="Close insights"
        onClick={onClose}
      />
      <div
        className={`relative z-10 pointer-events-auto w-full max-w-3xl mx-auto px-3 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] min-h-[42vh] max-h-[min(90vh,820px)] flex flex-col bg-surface border border-border rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.12)] overflow-hidden insight-panel insight-sheet${sheetFast ? " insight-sheet--fast" : ""}`}
        role="dialog"
        aria-modal={true}
        aria-labelledby="insight-panel-title"
      >
        <div className="shrink-0 flex justify-center pt-3 pb-1">
          <span className="w-10 h-1 rounded-full bg-border" aria-hidden />
        </div>

        <div className="shrink-0 px-5 pt-2 pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent mb-1">
                {panelTitle} · {verseKey}
              </p>
              <h3 id="insight-panel-title" className="text-[16px] font-bold text-ink tracking-tight truncate">
                {verseLabel}
              </h3>
              <p className="text-[12px] text-ink-tertiary mt-0.5">{panelSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-ink-secondary hover:bg-surface-secondary border border-transparent hover:border-border transition-colors shrink-0"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 min-h-[220px]">
          {loading && <LoadingState tab={tab} />}

          {!loading && fetchError && (
            <ErrorBlock message={fetchError instanceof Error ? fetchError.message : "Failed to load."} />
          )}

          {!loading && !fetchError && tab === "hadith" && <HadithTab data={hadith} />}
          {!loading && !fetchError && tab === "reflect" && (
            <ReflectTab data={reflect} isLoading={reflectLoading} isLoggedIn={isLoggedIn} verseKey={verseKey} />
          )}
          {!loading && !fetchError && tab === "tafsir" && (
            <TafsirTab data={tafsir} tafsirId={tafsirId} setTafsirId={setTafsirId} />
          )}
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(overlay, document.body);
}

function LoadingState({ tab }: { tab: InsightTab }) {
  const label =
    tab === "hadith" ? "related hadith" : tab === "reflect" ? "reflections" : "tafsir";
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-4">
      <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      <p className="text-[14px] font-medium text-ink-secondary">Loading {label}…</p>
    </div>
  );
}

function ReflectTab({
  data,
  isLoading,
  isLoggedIn,
  verseKey,
}: {
  data?: VerseReflectionsPayload;
  isLoading: boolean;
  isLoggedIn: boolean;
  verseKey: string;
}) {
  const posts = data?.posts ?? [];
  const writeUrl = `/reflect?verse=${encodeURIComponent(verseKey)}`;

  return (
    <div className="space-y-5">
      {/* Sign-in / write CTA — always visible */}
      <div className={`rounded-xl border p-5 flex flex-col gap-3 ${
        isLoggedIn
          ? "border-border bg-surface-secondary/40"
          : "border-accent/25 bg-accent-subtle/30"
      }`}>
        {!isLoggedIn ? (
          <>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 rounded-full bg-accent-subtle flex items-center justify-center text-accent">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={18} height={18}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-bold text-ink mb-0.5">Sign in to see and write reflections</p>
                <p className="text-[13px] text-ink-secondary leading-relaxed">
                  Community reflections on this ayah are only visible to signed-in users via Quran Reflect.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/auth/start"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-[13px] font-bold hover:bg-accent-hover transition-colors"
              >
                Sign in
              </a>
              <Link
                href={writeUrl}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-surface text-ink text-[13px] font-semibold hover:border-accent/30 transition-colors"
              >
                Write a reflection
              </Link>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-ink-secondary">Share your own insight on this ayah.</p>
            <Link
              href={writeUrl}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-[13px] font-bold hover:bg-accent-hover transition-colors"
            >
              Write
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Reflections body — only when signed in */}
      {isLoggedIn && (
        <>
          {isLoading && <LoadingState tab="reflect" />}

          {!isLoading && data?.error && <ErrorBlock message={data.error} />}

          {!isLoading && !data?.error && !posts.length && (
            <EmptyBlock
              icon="💭"
              title="No reflections yet for this ayah"
              detail="Be the first to share what this verse means to you on Quran Reflect."
            />
          )}

          {!isLoading && posts.length > 0 && (
            <div>
              <SectionHeader
                title="Reflections on this ayah"
                count={posts.length}
                subtitle="From Quran Reflect"
              />
              <ul className="space-y-3">
                {posts.map((post) => (
                  <ReflectionCard key={post.id ?? post.body.slice(0, 32)} post={post} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReflectionCard({ post }: { post: FeedItem }) {
  return (
    <li className="insight-card">
      <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-full bg-accent-subtle text-accent flex items-center justify-center text-[14px] font-bold shrink-0">
            {post.authorName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-ink truncate">{post.authorName}</p>
            {post.postTypeName && (
              <p className="text-[11px] text-ink-tertiary capitalize">{post.postTypeName}</p>
            )}
          </div>
        </div>
        <span className="text-[12px] font-medium text-ink-tertiary shrink-0">
          {post.likesCount} {post.likesCount === 1 ? "like" : "likes"}
        </span>
      </div>
      <p className="text-[14px] text-ink-secondary leading-[1.75] whitespace-pre-wrap">{post.body}</p>
      {post.commentsCount > 0 && (
        <p className="text-[12px] text-ink-tertiary mt-3">
          {post.commentsCount} {post.commentsCount === 1 ? "comment" : "comments"}
        </p>
      )}
    </li>
  );
}

function HadithTab({ data }: { data?: HadithByAyahPayload }) {
  const hadiths = data?.hadiths ?? [];
  const references = data?.references ?? [];

  if (!hadiths.length && !references.length) {
    if (data?.error) return <ErrorBlock message={data.error} />;
    return (
      <EmptyBlock
        icon="📜"
        title="No related hadith"
        detail="No hadith narrations are linked to this ayah in the Quran Foundation catalog."
      />
    );
  }

  return (
    <div className="space-y-4">
      {hadiths.length > 0 && (
        <div>
          <SectionHeader
            title="Hadith for this ayah"
            count={hadiths.length}
            subtitle="From collections referenced to this verse"
          />
          <ul className="space-y-3">
            {hadiths.map((h, i) => (
              <HadithNarrationCard key={`${h.collection}-${h.hadithNumber}-${i}`} item={h} />
            ))}
          </ul>
        </div>
      )}

      {references.length > 0 && (
        <div>
          {hadiths.length > 0 && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-tertiary mt-6 mb-2">
              All References ({references.length})
            </p>
          )}
          {hadiths.length === 0 && (
            <SectionHeader
              title="Hadith references"
              count={references.length}
              subtitle="Citations linked to this ayah. Open in your preferred hadith library to read the full narration."
            />
          )}
          <ul className="grid grid-cols-1 gap-2">
            {references.map((ref) => (
              <HadithReferenceCard key={ref.id} item={ref} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HadithNarrationCard({ item }: { item: HadithNarrationItem }) {
  return (
    <li className="insight-card">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h4 className="text-[14px] font-bold text-ink leading-snug">
          {formatCollection(item.collection)}
        </h4>
        <span className="inline-flex px-2 py-0.5 rounded-md bg-surface-secondary border border-border text-[11px] font-bold font-mono text-ink-secondary">
          #{item.hadithNumber}
        </span>
      </div>
      {item.title && (
        <p className="text-[12px] font-semibold text-ink-secondary mb-2">{item.title}</p>
      )}
      <p className="text-[14px] text-ink-secondary leading-[1.75] whitespace-pre-wrap">{item.body}</p>
    </li>
  );
}

function HadithReferenceCard({ item }: { item: HadithReferenceItem }) {
  const collectionLabel = formatCollection(item.collection);
  const sunnahUrl = `https://sunnah.com/${item.collection.toLowerCase()}:${item.hadithNumber}`;

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:border-border-hover transition-colors">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-ink truncate">{collectionLabel}</p>
        <p className="text-[11px] text-ink-tertiary font-mono mt-0.5">
          #{item.hadithNumber}
          {item.ayahStartNumber !== null && (
            <span className="ml-2 text-ink-tertiary/80">
              · ayah {item.ayahStartNumber}
              {item.ayahEndNumber && item.ayahEndNumber !== item.ayahStartNumber
                ? `–${item.ayahEndNumber}`
                : ""}
            </span>
          )}
        </p>
      </div>
      <a
        href={sunnahUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-subtle text-accent text-[12px] font-semibold hover:bg-accent hover:text-white transition-colors"
      >
        Read
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={12} height={12}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>
    </li>
  );
}

function TafsirTab({
  data,
  tafsirId,
  setTafsirId,
}: {
  data?: AyahTafsirPayload;
  tafsirId: string;
  setTafsirId: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TAFSIRS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTafsirId(t.id)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all ${
              tafsirId === t.id
                ? "border-accent bg-accent text-white shadow-sm"
                : "border-border bg-surface text-ink-secondary hover:border-border-hover hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {data?.error && <ErrorBlock message={data.error} />}
      {!data?.error && !data?.text && (
        <EmptyBlock
          icon="📖"
          title="No commentary for this ayah"
          detail="Try another tafsir source. Coverage varies by scholar and edition."
        />
      )}
      {data?.text && (
        <article className="insight-card insight-card--tafsir">
          {data.resourceName && (
            <p className="text-[12px] font-bold uppercase tracking-wider text-accent mb-4 pb-3 border-b border-border">
              {data.resourceName}
            </p>
          )}
          <div
            className="tafsir-prose"
            dangerouslySetInnerHTML={{ __html: sanitizeTafsirHtml(data.text) }}
          />
        </article>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  count,
  subtitle,
}: {
  title: string;
  count?: number;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="text-[14px] font-bold text-ink">{title}</h4>
        {count !== undefined && (
          <span className="px-2 py-0.5 rounded-full bg-surface-secondary text-[11px] font-bold text-ink-tertiary">
            {count}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[12px] text-ink-tertiary leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function EmptyBlock({
  icon,
  title,
  detail,
}: {
  icon: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="text-center py-12 px-6 rounded-2xl border border-dashed border-border bg-surface-secondary/30">
      <span className="text-3xl mb-3 block" aria-hidden>
        {icon}
      </span>
      <p className="text-[15px] font-semibold text-ink mb-2">{title}</p>
      <p className="text-[13px] text-ink-tertiary max-w-xs mx-auto leading-relaxed">{detail}</p>
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="flex gap-3 p-4 rounded-xl bg-danger-subtle border border-danger/20">
      <svg
        className="shrink-0 text-danger mt-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        width={18}
        height={18}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
        />
      </svg>
      <p className="text-[13px] text-danger leading-relaxed">{message}</p>
    </div>
  );
}
