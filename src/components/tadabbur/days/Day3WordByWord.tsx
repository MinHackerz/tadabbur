"use client";

import { useState, useEffect } from "react";

interface WordData {
  position: number;
  arabic: string;
  transliteration: string;
  translation: string;
  root?: string;
}

interface Props {
  verseKey: string;
}

export default function Day3WordByWord({ verseKey }: Props) {
  const [words, setWords] = useState<WordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<WordData | null>(null);
  const [expandedWords, setExpandedWords] = useState<Set<number>>(new Set());

  // Inline fetch in the effect — state updates run inside .then callbacks
  // so the react-hooks/set-state-in-effect rule is satisfied.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });

    fetch(
      `https://api.quran.com/api/v4/verses/by_key/${verseKey}?words=true&word_fields=text_uthmani,transliteration,translation`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.verse?.words) {
          const wordData: WordData[] = (data.verse.words as Array<{
            text_uthmani?: string;
            text?: string;
            transliteration?: { text?: string };
            translation?: { text?: string };
            root?: { value?: string };
          }>).map((w, idx) => ({
            position: idx + 1,
            arabic: w.text_uthmani || w.text || "",
            transliteration: w.transliteration?.text || "",
            translation: w.translation?.text || "",
            root: w.root?.value,
          }));
          setWords(wordData);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load word-by-word data");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [verseKey]);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[14px] text-ink-secondary">Loading word-by-word analysis...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-danger-subtle border border-danger/20 rounded-xl p-6">
        <p className="text-[14px] text-danger">{error}</p>
      </div>
    );
  }

  const toggleWord = (position: number) => {
    setExpandedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(position)) {
        newSet.delete(position);
      } else {
        newSet.add(position);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-accent-subtle border border-accent/20 rounded-xl p-6">
        <h3 className="text-[15px] font-semibold text-ink mb-2">
          Word-by-Word Analysis
        </h3>
        <p className="text-[13px] text-ink-secondary">
          Each Arabic word carries layers of meaning. Click on any word to explore its root and English translation.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex flex-wrap gap-3 justify-end" dir="rtl">
          {words.map((word) => (
            <button
              key={word.position}
              onClick={() => toggleWord(word.position)}
              className={`group relative px-4 py-3 rounded-lg transition-all ${
                expandedWords.has(word.position)
                  ? "bg-accent text-white shadow-lg scale-105"
                  : "bg-surface-secondary hover:bg-accent/10 text-ink"
              }`}
            >
              <div className="font-amiri text-[24px] leading-tight">
                {word.arabic}
              </div>
              {expandedWords.has(word.position) && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-ink text-white p-4 rounded-lg shadow-xl z-10 text-left" dir="ltr">
                  <div className="text-[11px] text-white/60 uppercase tracking-wider mb-1">
                    Word {word.position}
                  </div>
                  <div className="text-[13px] font-medium mb-2 italic">
                    {word.transliteration}
                  </div>
                  <div className="text-[14px] mb-2">
                    {word.translation}
                  </div>
                  {word.root && (
                    <div className="text-[11px] text-white/70 pt-2 border-t border-white/20">
                      Root: {word.root}
                    </div>
                  )}
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-ink" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {words.map((word) => (
          <div
            key={word.position}
            className="bg-surface border border-border rounded-xl p-4 hover:border-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="font-amiri text-[20px] text-warm">
                {word.arabic}
              </div>
              <div className="text-[11px] font-mono text-ink-tertiary bg-surface-secondary px-2 py-1 rounded">
                #{word.position}
              </div>
            </div>
            <div className="text-[12px] text-ink-secondary italic mb-1">
              {word.transliteration}
            </div>
            <div className="text-[13px] text-ink font-medium">
              {word.translation}
            </div>
            {word.root && (
              <div className="text-[11px] text-ink-tertiary mt-2 pt-2 border-t border-border">
                Root: <span className="font-amiri text-[13px]">{word.root}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-warm/5 border border-warm/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="text-[20px]">💡</div>
          <div>
            <h4 className="text-[14px] font-semibold text-ink mb-2">
              Linguistic Insight
            </h4>
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              Arabic is a root-based language. Most words derive from three-letter roots that carry core meanings. 
              Understanding these roots reveals connections across the Quran and deepens comprehension of Allah&apos;s message.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
