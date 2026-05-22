"use client";
import useSWR from "swr";
import type { AyahTranslationsPayload } from "@/lib/types";
import { sanitizeTafsirHtml } from "@/lib/sanitize-html";
import { fetchInsight, translationsInsightUrl } from "./insightApi";
import { useInView } from "./useInView";

interface VerseTranslationLineProps {
  verseKey: string;
  translationId: string;
  serverText: string | null;
  fontClasses: { translation: string };
  translationOnly?: boolean;
}

export default function VerseTranslationLine({
  verseKey,
  translationId,
  serverText,
  fontClasses,
  translationOnly = false,
}: VerseTranslationLineProps) {
  const { ref, inView } = useInView();
  const needsFetch = !serverText?.trim();
  const { data, isLoading, error } = useSWR<AyahTranslationsPayload>(
    needsFetch && inView ? translationsInsightUrl(verseKey, translationId) : null,
    fetchInsight,
    { revalidateOnFocus: false, dedupingInterval: 300_000 },
  );

  const trIdNum = Number(translationId);
  const fetchedText =
    data?.translations.find((t) => t.resourceId === trIdNum)?.text ??
    data?.translations[0]?.text ??
    null;
  const text = serverText?.trim() || fetchedText;

  if (needsFetch && !inView) {
    return (
      <div ref={ref} className="min-h-[1.5rem]" aria-hidden>
        <p className="text-[13px] text-ink-quaternary/60 leading-relaxed">…</p>
      </div>
    );
  }

  if (isLoading && !text) {
    return (
      <div ref={ref}>
        <p className="text-[13px] text-ink-tertiary font-medium animate-pulse" aria-live="polite">
          Loading translation…
        </p>
      </div>
    );
  }

  if (!text) {
    return (
      <div ref={ref}>
        <p className="text-[13px] text-ink-tertiary leading-relaxed">
          {data?.error ?? (error instanceof Error ? error.message : null) ?? "No translation available."}
        </p>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <p
        className={`text-ink-secondary leading-[1.85] ${fontClasses.translation} ${
          translationOnly ? "text-[16px] md:text-[17px] text-ink" : ""
        }`}
        dangerouslySetInnerHTML={{ __html: sanitizeTafsirHtml(text) }}
      />
    </div>
  );
}
