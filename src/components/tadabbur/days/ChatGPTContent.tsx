"use client";

import { useState, useEffect } from "react";

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

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
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
  const [sources, setSources] = useState<string | null>(null);
  const [tavilyResults, setTavilyResults] = useState<TavilyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    fetchContent();
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
      setSources(data.sources);
      setTavilyResults(data.tavilyResults || []);
      setCached(data.cached);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[14px] text-ink-secondary">
            {cached ? "Loading content..." : "Generating insights with AI..."}
          </p>
          <p className="text-[12px] text-ink-tertiary mt-2">
            This may take a moment
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-subtle border border-danger/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-danger shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <div>
            <h4 className="text-[14px] font-semibold text-danger mb-1">
              Content Unavailable
            </h4>
            <p className="text-[13px] text-danger/80">
              {error}
            </p>
            {error.includes("OpenAI") && (
              <p className="text-[12px] text-danger/70 mt-2">
                Please configure OPENAI_API_KEY in your environment variables.
              </p>
            )}
            <button
              onClick={fetchContent}
              className="mt-3 text-[13px] font-medium text-danger hover:underline"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-accent-subtle border border-accent/20 rounded-xl p-6">
        <h3 className="text-[15px] font-semibold text-ink mb-2">
          {title}
        </h3>
        <p className="text-[13px] text-ink-secondary">
          {description}
        </p>
        {cached && (
          <div className="mt-3 inline-flex items-center gap-2 text-[11px] text-accent bg-accent/10 px-2 py-1 rounded">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Shared with community
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="prose prose-sm max-w-none">
          <div className="text-[14px] text-ink leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        </div>
      </div>

      {sources && (
        <div className="bg-surface-secondary border border-border rounded-xl p-5">
          <h4 className="text-[13px] font-semibold text-ink mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Sources & References
          </h4>
          <div className="text-[12px] text-ink-secondary leading-relaxed whitespace-pre-wrap">
            {sources}
          </div>
        </div>
      )}

      {tavilyResults.length > 0 && (
        <div className="bg-surface-secondary border border-border rounded-xl p-5">
          <h4 className="text-[13px] font-semibold text-ink mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Verified Islamic Sources
          </h4>
          <div className="space-y-3">
            {tavilyResults.map((result, index) => (
              <a
                key={index}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-surface border border-border rounded-lg hover:border-accent/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h5 className="text-[13px] font-semibold text-ink group-hover:text-accent transition-colors">
                    {result.title}
                  </h5>
                  <svg className="w-3 h-3 text-ink-tertiary group-hover:text-accent transition-colors shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </div>
                <p className="text-[11px] text-accent font-mono mb-2 truncate">
                  {result.url}
                </p>
                <p className="text-[12px] text-ink-secondary leading-relaxed line-clamp-2">
                  {result.content}
                </p>
              </a>
            ))}
          </div>
          <p className="text-[11px] text-ink-tertiary mt-3 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            Sources verified from authentic Islamic websites
          </p>
        </div>
      )}

      <div className="bg-warm/5 border border-warm/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="text-[18px]">ℹ️</div>
          <div className="text-[12px] text-ink-secondary leading-relaxed">
            This content is generated using AI and reviewed for accuracy. It draws from classical Islamic scholarship 
            and is shared with all readers of this verse. Always verify important religious matters with qualified scholars.
          </div>
        </div>
      </div>
    </div>
  );
}
