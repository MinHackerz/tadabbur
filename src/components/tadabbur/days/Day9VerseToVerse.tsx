"use client";

import { useState, useEffect } from "react";

interface SearchResult {
  verse_key: string;
  text: string;
  translations: Array<{
    text: string;
    resource_name: string;
  }>;
}

interface Props {
  verseTranslation: string;
}

/**
 * Pull the most descriptive keywords out of an English translation. We
 * filter out common stopwords and very short words, then keep the longest
 * unique tokens (which tend to be the most distinctive concepts in the
 * verse). The result is a small phrase suitable for a full-text search.
 */
function extractKeyWords(text: string): string {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "should", "could", "may", "might", "must", "can", "shall",
    "who", "which", "what", "where", "when", "why", "how", "this", "that",
    "these", "those", "i", "you", "he", "she", "it", "we", "they", "them",
    "their", "his", "her", "its", "our", "your", "not", "no", "so", "if",
    "into", "upon", "against", "before", "after", "than", "then", "there",
    "here", "all", "some", "any", "such", "those", "say", "said", "indeed",
  ]);

  const seen = new Set<string>();
  const words = text
    .toLowerCase()
    .replace(/<[^>]+>/g, " ") // strip any HTML
    .replace(/[\u201c\u201d\u2018\u2019"']/g, "") // smart and ASCII quotes
    .replace(/[^\p{L}\s]/gu, " ") // drop punctuation/numbers
    .split(/\s+/)
    .filter((w) => {
      if (w.length <= 3) return false;
      if (stopWords.has(w)) return false;
      if (seen.has(w)) return false;
      seen.add(w);
      return true;
    });

  // Prefer the longer/more distinctive tokens — short generic words rarely
  // help full-text search.
  words.sort((a, b) => b.length - a.length);
  return words.slice(0, 5).join(" ");
}

export default function Day9VerseToVerse({ verseTranslation }: Props) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const query = extractKeyWords(verseTranslation);

    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      setSearchQuery(query);
    });

    if (!query) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    // Use the same search endpoint that powers /search. It handles the app
    // token, translation filtering and abuse limits in one place. The
    // public Quran CDN endpoint we used previously sometimes returned
    // empty results for short queries.
    const params = new URLSearchParams({ query, tr: "85" });

    fetch(`/api/search?${params.toString()}`, {
      credentials: "include",
      signal: AbortSignal.timeout(10_000),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Search failed: ${response.status} ${response.statusText}`,
          );
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data?.verseItems) ? data.verseItems : [];
        const parsedResults: SearchResult[] = items
          .map(
            (item: {
              verseKey?: string | null;
              text?: string;
              subtitle?: string | null;
            }) => {
              // The /api/search endpoint maps fields as:
              //   subtitle = Arabic words joined
              //   text     = English translation
              //   verseKey = "<surah>:<verse>"
              const verseKey = item.verseKey ?? "";
              const arabic = (item.subtitle ?? "").trim();
              const englishTranslation = (item.text ?? "").trim();
              if (!verseKey) return null;
              return {
                verse_key: verseKey,
                text: arabic,
                translations: englishTranslation
                  ? [{ text: englishTranslation, resource_name: "" }]
                  : [],
              };
            },
          )
          .filter((r: SearchResult | null): r is SearchResult => r !== null)
          .slice(0, 12);
        setResults(parsedResults);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Day9VerseToVerse] Search error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [verseTranslation]);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[14px] text-ink-secondary">
          Searching for similar verses...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-subtle border border-danger/20 rounded-xl p-6">
        <p className="text-[14px] text-danger font-semibold mb-2">Search Error</p>
        <p className="text-[13px] text-danger">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-danger text-white rounded-lg text-[13px] font-semibold hover:bg-danger/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-accent-subtle border border-accent/20 rounded-xl p-6">
        <h3 className="text-[15px] font-semibold text-ink mb-2">
          Verse to Verse: Tafsir bil-Quran
        </h3>
        <p className="text-[13px] text-ink-secondary mb-3">
          The Quran explains itself. These verses share similar themes, words, or messages. 
          Together, they illuminate each other&apos;s meaning.
        </p>
        {searchQuery && (
          <div className="mt-3 pt-3 border-t border-accent/20">
            <p className="text-[11px] text-ink-tertiary uppercase tracking-wider font-semibold mb-1">
              Search Keywords
            </p>
            <p className="text-[13px] text-accent font-medium">
              &quot;{searchQuery}&quot;
            </p>
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <div className="text-[32px] mb-3">🔍</div>
          <p className="text-[14px] text-ink-tertiary mb-2">
            No similar verses found with these keywords.
          </p>
          <p className="text-[12px] text-ink-tertiary">
            Try exploring other days to gain deeper insights into this verse.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-ink-secondary uppercase tracking-wider">
              Related Verses
            </p>
            <span className="text-[11px] font-mono text-ink-tertiary bg-surface-secondary px-2 py-1 rounded">
              {results.length} found
            </span>
          </div>

          {results.map((result, index) => (
            <div
              key={result.verse_key}
              className="bg-surface border border-border rounded-xl p-5 hover:border-accent/50 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="text-[13px] font-semibold text-accent">
                  Surah {result.verse_key.split(":")[0]}, Verse {result.verse_key.split(":")[1]}
                </div>
                <div className="text-[11px] font-mono text-ink-tertiary bg-surface-secondary px-2 py-1 rounded">
                  #{index + 1}
                </div>
              </div>

              <div className="font-amiri text-[20px] text-warm mb-3 leading-relaxed text-right" dir="rtl">
                {result.text}
              </div>

              {result.translations && result.translations[0] && (
                <div className="text-[13px] text-ink-secondary leading-relaxed border-l-2 border-accent/30 pl-4 py-1">
                  {result.translations[0].text}
                </div>
              )}

              <div className="mt-3 flex items-center gap-2">
                <a
                  href={`/read/${result.verse_key.split(":")[0]}#${result.verse_key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[12px] text-accent hover:text-accent-hover font-semibold flex items-center gap-1 transition-colors"
                >
                  Open in Reader
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-warm/5 border border-warm/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="text-[20px]">🔗</div>
          <div>
            <h4 className="text-[14px] font-semibold text-ink mb-2">
              The Quran&apos;s Internal Coherence
            </h4>
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              One of the miracles of the Quran is how verses across different surahs and contexts 
              complement and explain each other. This internal consistency is a sign of divine authorship. 
              The scholars call this &quot;Tafsir bil-Quran&quot; — explaining the Quran with the Quran itself.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
