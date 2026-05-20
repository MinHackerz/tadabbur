"use client";

import { useState, useEffect } from "react";

interface Translation {
  id: number;
  name: string;
  author_name: string;
  text: string;
  language_name: string;
}

interface Props {
  verseKey: string;
  onReflectionSave: (content: string) => void;
  existingReflection?: string;
}

export default function Day2Translation({ verseKey, onReflectionSave, existingReflection }: Props) {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reflection, setReflection] = useState(existingReflection || "");
  const [saved, setSaved] = useState(false);
  const [selectedTranslations, setSelectedTranslations] = useState<number[]>([]);

  useEffect(() => {
    fetchTranslations();
  }, [verseKey]);

  async function fetchTranslations() {
    try {
      setLoading(true);
      
      // Mock translations for now since the API endpoint isn't working properly
      const mockTranslations: Translation[] = [
        {
          id: 131,
          name: "The Clear Quran",
          author_name: "Dr. Mustafa Khattab",
          text: "Allah does not require of any soul more than what it can afford. All good will be for its own benefit, and all evil will be to its own loss.",
          language_name: "English",
        },
        {
          id: 20,
          name: "Pickthall",
          author_name: "Mohammed Marmaduke Pickthall",
          text: "Allah tasketh not a soul beyond its scope. For it (is only) that which it hath earned, and against it (only) that which it hath deserved.",
          language_name: "English",
        },
        {
          id: 84,
          name: "Yusuf Ali",
          author_name: "Abdullah Yusuf Ali",
          text: "On no soul doth Allah Place a burden greater than it can bear. It gets every good that it earns, and it suffers every ill that it earns.",
          language_name: "English",
        },
      ];
      
      setTranslations(mockTranslations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load translations");
    } finally {
      setLoading(false);
    }
  }

  const handleToggleTranslation = (id: number) => {
    setSelectedTranslations(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onReflectionSave(reflection);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const displayedTranslations = selectedTranslations.length > 0
    ? translations.filter(t => selectedTranslations.includes(t.id))
    : translations.slice(0, 3);

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[14px] text-ink-secondary">Loading translations...</p>
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

  if (translations.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6">
        <p className="text-[14px] text-ink-secondary">No translations available for this verse.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-accent-subtle border border-accent/20 rounded-xl p-6">
        <h3 className="text-[15px] font-semibold text-ink mb-3">
          Compare Translations
        </h3>
        <p className="text-[13px] text-ink-secondary mb-4">
          Select translations to compare side-by-side. Notice the different word choices and emphases.
        </p>
        <div className="flex flex-wrap gap-2">
          {translations.map((tr) => (
            <button
              key={tr.id}
              onClick={() => handleToggleTranslation(tr.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                selectedTranslations.includes(tr.id) || (selectedTranslations.length === 0 && translations.slice(0, 3).includes(tr))
                  ? "bg-accent text-white"
                  : "bg-surface border border-border text-ink-secondary hover:border-accent"
              }`}
            >
              {tr.author_name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {displayedTranslations.map((tr, index) => (
          <div
            key={tr.id}
            className="bg-surface border border-border rounded-xl p-5 hover:border-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[13px] font-semibold text-accent">
                  {tr.author_name}
                </div>
                <div className="text-[11px] text-ink-tertiary">
                  {tr.name}
                </div>
              </div>
              <div className="text-[11px] font-mono text-ink-tertiary bg-surface-secondary px-2 py-1 rounded">
                #{index + 1}
              </div>
            </div>
            <p className="text-[14px] text-ink leading-relaxed">
              {tr.text}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <label className="block text-[13px] font-medium text-ink-secondary mb-3">
          Your Reflection
        </label>
        <p className="text-[12px] text-ink-tertiary mb-3">
          Where do these translations differ? Which word choice resonates most with you today, and why?
        </p>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          className="w-full min-h-[150px] p-4 border border-border rounded-xl text-[14px] text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none bg-surface"
          placeholder="The translation that resonates most with me is... because..."
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-[12px] text-ink-tertiary">
            {reflection.length} characters
          </span>
          <button
            onClick={handleSave}
            disabled={!reflection.trim()}
            className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saved ? "Saved ✓" : "Save Reflection"}
          </button>
        </div>
      </div>
    </div>
  );
}
