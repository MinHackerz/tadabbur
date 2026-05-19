"use client";
import Link from "next/link";
import type { BootstrapPayload } from "@/lib/types";
import {
  btnPrimary,
  card,
  EmptyState,
  IconArrowRight,
  Label,
  PageContent,
  PageHero,
  SectionTitle,
  SignInBanner,
  input as IN,
  textarea as TA,
} from "@/components/ui/primitives";

interface ReflectViewProps {
  isLoggedIn: boolean;
  data: BootstrapPayload;
  refVK: string;
  setRefVK: (v: string) => void;
  refBody: string;
  setRefBody: (v: string) => void;
  createRef: () => void;
}

export default function ReflectView({
  isLoggedIn,
  data,
  refVK,
  setRefVK,
  refBody,
  setRefBody,
  createRef,
}: ReflectViewProps) {
  const profile = data.quranReflect.profile;
  const feed = data.quranReflect.feed;
  const canPost = refBody.trim().length > 0 && refVK.trim().length > 0;

  return (
    <PageContent>
      <PageHero
        title="Reflect"
        subtitle="Share what a verse means to you and read reflections from the community."
      />

      {!isLoggedIn && <SignInBanner message="Sign in to publish reflections and see your QuranReflect profile." />}

      <div className={card + " feature-card mb-8"}>
        <SectionTitle>Write a reflection</SectionTitle>
        <div className="space-y-4">
          <div>
            <Label>Which verse?</Label>
            <input
              className={IN}
              value={refVK}
              onChange={(e) => setRefVK(e.target.value)}
              placeholder="For example: 2:255"
              disabled={!isLoggedIn}
            />
          </div>
          <div>
            <Label>Your thoughts</Label>
            <textarea
              className={TA + " !min-h-[140px]"}
              value={refBody}
              onChange={(e) => setRefBody(e.target.value)}
              placeholder="What did this verse teach you? How will you apply it?"
              disabled={!isLoggedIn}
            />
          </div>
          <div className="flex justify-end">
            <button type="button" className={btnPrimary} disabled={!isLoggedIn || !canPost} onClick={createRef}>
              Publish reflection
            </button>
          </div>
        </div>
      </div>

      {profile.facts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {profile.facts.map((f) => (
            <div key={f.label} className="p-4 rounded-xl border border-border bg-surface text-center">
              <p className="text-[20px] font-bold text-ink">{f.value}</p>
              <p className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mt-1">{f.label}</p>
            </div>
          ))}
        </div>
      )}

      {profile.error && (
        <p className="p-4 mb-6 bg-danger-subtle text-danger text-[13px] font-medium rounded-xl">{profile.error}</p>
      )}
      {profile.gatingMessage && !profile.facts.length && (
        <p className="text-ink-tertiary text-[13px] font-medium mb-6">{profile.gatingMessage}</p>
      )}

      <SectionTitle>Community feed</SectionTitle>
      {feed.error && (
        <p className="p-4 mb-4 bg-danger-subtle text-danger text-[13px] font-medium rounded-xl">{feed.error}</p>
      )}
      {feed.gatingMessage && (
        <p className="text-ink-tertiary text-[13px] font-medium mb-4">{feed.gatingMessage}</p>
      )}

      {feed.items.length === 0 && !feed.error ? (
        <EmptyState message="No reflections in your feed yet. Be the first to share." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {feed.items.map((p) => (
            <article
              key={p.id ?? p.body.slice(0, 32)}
              className="p-5 md:p-6 bg-surface border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-full bg-accent-subtle text-accent flex items-center justify-center text-[14px] font-bold shrink-0">
                    {p.authorName.charAt(0).toUpperCase()}
                  </span>
                  <strong className="text-[14px] text-ink font-semibold truncate">{p.authorName}</strong>
                </div>
                <span className="text-[12px] font-medium text-ink-tertiary shrink-0">
                  {p.likesCount} {p.likesCount === 1 ? "like" : "likes"}
                </span>
              </div>
              <p className="text-[15px] text-ink-secondary leading-relaxed mb-4">{p.body}</p>
              {p.referenceLabel && p.readerUrl && (
                <Link
                  href={p.readerUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent-subtle rounded-lg text-[12px] font-bold text-accent hover:bg-accent/15 transition-colors"
                >
                  {p.referenceLabel} <IconArrowRight />
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </PageContent>
  );
}
