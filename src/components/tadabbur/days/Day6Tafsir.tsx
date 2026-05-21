"use client";

import { useState, useEffect } from "react";
import { sanitizeTafsirHtml } from "@/lib/sanitize-html";

interface TafsirResource {
  id: number;
  name: string;
  author_name: string;
  language_name: string;
  slug: string;
}

interface TafsirData {
  id: number;
  text: string;
  resource_name: string;
  resource_id: number;
  language_name: string;
}

interface Props {
  verseKey: string;
}

export default function Day6Tafsir({ verseKey }: Props) {
  const [availableTafsirs, setAvailableTafsirs] = useState<TafsirResource[]>([]);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedTafsirId, setSelectedTafsirId] = useState<number>(169); // Ibn Kathir default
  const [selectedLanguage, setSelectedLanguage] = useState<string>("english");
  const [tafsirContent, setTafsirContent] = useState<TafsirData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available tafsirs on mount. Inlining the fetch (state updates only
  // inside .then callbacks) satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });

    fetch("https://api.quran.com/api/v4/resources/tafsirs")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.tafsirs) {
          setAvailableTafsirs(data.tafsirs);

          const languages = Array.from(
            new Set(
              (data.tafsirs as TafsirResource[]).map((t) => t.language_name),
            ),
          ) as string[];
          setAvailableLanguages(languages);

          if (languages.includes("english")) {
            setSelectedLanguage("english");
            // If Ibn Kathir is available, prefer it; otherwise leave the
            // current selection in place so a later language switch works.
            const hasIbnKathir = (data.tafsirs as TafsirResource[]).some(
              (t) => t.id === 169 && t.language_name === "english",
            );
            if (hasIbnKathir) {
              setSelectedTafsirId(169);
            }
          } else if (languages.length > 0) {
            setSelectedLanguage(languages[0].toLowerCase());
          }
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Day6Tafsir] Error fetching tafsirs:", err);
        setError(err instanceof Error ? err.message : "Failed to load tafsirs");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch tafsir content whenever the (selectedTafsirId, verseKey) pair changes.
  useEffect(() => {
    if (!selectedTafsirId || !verseKey) return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoadingContent(true);
      setError(null);
    });

    fetch(`https://api.quran.com/api/v4/tafsirs/${selectedTafsirId}/by_ayah/${verseKey}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.tafsir && data.tafsir.text) {
          setTafsirContent({
            id: data.tafsir.resource_id,
            text: data.tafsir.text,
            resource_name: data.tafsir.resource_name,
            resource_id: data.tafsir.resource_id,
            language_name: data.tafsir.translated_name?.language_name || "Unknown",
          });
        } else {
          setTafsirContent(null);
          setError("No tafsir available for this verse");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Day6Tafsir] Error fetching tafsir:", err);
        setError(err instanceof Error ? err.message : "Failed to load tafsir content");
        setTafsirContent(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingContent(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTafsirId, verseKey]);

  // Filter tafsirs by selected language
  const filteredTafsirs = availableTafsirs.filter(
    t => t.language_name.toLowerCase() === selectedLanguage.toLowerCase()
  );

  if (loading) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[14px] text-ink-secondary">Loading tafsirs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-accent-subtle border border-accent/20 rounded-xl p-6">
        <h3 className="text-[15px] font-semibold text-ink mb-2">
          Classical Tafsir
        </h3>
        <p className="text-[13px] text-ink-secondary">
          The great scholars—Ibn Kathir, Al-Tabari, Al-Qurtubi—spent lifetimes contemplating these words. 
          Explore their timeless wisdom.
        </p>
      </div>

      {/* Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Language Dropdown */}
        <div>
          <label className="block text-[12px] font-semibold text-ink-secondary mb-2 uppercase tracking-wider">
            Language
          </label>
          <select
            value={selectedLanguage}
            onChange={(e) => {
              const newLanguage = e.target.value;
              setSelectedLanguage(newLanguage);
              // Reset to first tafsir of new language
              const firstTafsir = availableTafsirs.find(
                t => t.language_name.toLowerCase() === newLanguage.toLowerCase()
              );
              if (firstTafsir) {
                setSelectedTafsirId(firstTafsir.id);
              }
            }}
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-[14px] text-ink shadow-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
          >
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang.toLowerCase()}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Tafsir Dropdown */}
        <div>
          <label className="block text-[12px] font-semibold text-ink-secondary mb-2 uppercase tracking-wider">
            Tafsir
          </label>
          <select
            value={selectedTafsirId}
            onChange={(e) => setSelectedTafsirId(Number(e.target.value))}
            className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-[14px] text-ink shadow-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
          >
            {filteredTafsirs.map((tafsir) => (
              <option key={tafsir.id} value={tafsir.id}>
                {tafsir.author_name} - {tafsir.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tafsir Content */}
      {loadingContent ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[14px] text-ink-secondary">Loading tafsir content...</p>
        </div>
      ) : error ? (
        <div className="bg-danger-subtle border border-danger/20 rounded-xl p-6">
          <p className="text-[14px] text-danger">{error}</p>
        </div>
      ) : tafsirContent ? (
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="mb-4 pb-4 border-b border-border">
            <h4 className="text-[15px] font-semibold text-ink">
              {tafsirContent.resource_name}
            </h4>
            <p className="text-[12px] text-ink-tertiary mt-1">
              {tafsirContent.language_name}
            </p>
          </div>
          <div className="prose prose-sm max-w-none">
            <div 
              className="text-[14px] text-ink leading-relaxed"
              dangerouslySetInnerHTML={{ __html: sanitizeTafsirHtml(tafsirContent.text) }}
            />
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-[14px] text-ink-tertiary">
            No tafsir available for this verse in the selected language.
          </p>
        </div>
      )}

      <div className="bg-warm/5 border border-warm/20 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="text-[20px]">📖</div>
          <div>
            <h4 className="text-[14px] font-semibold text-ink mb-2">
              About Classical Tafsir
            </h4>
            <p className="text-[13px] text-ink-secondary leading-relaxed">
              These commentaries represent centuries of Islamic scholarship. Each scholar brought unique insights 
              based on their knowledge of Arabic, hadith, and the circumstances of revelation. Reading multiple 
              tafsirs gives you a richer, more complete understanding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
