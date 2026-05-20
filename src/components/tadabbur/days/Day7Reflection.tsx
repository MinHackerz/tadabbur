"use client";

import { useState } from "react";

interface Props {
  onPublish: (content: string, isPublic: boolean, region?: string) => void;
  existingReflection?: { content: string; isPublic: boolean; region?: string };
}

export default function Day7Reflection({ onPublish, existingReflection }: Props) {
  const [content, setContent] = useState(existingReflection?.content || "");
  const [isPublic, setIsPublic] = useState(existingReflection?.isPublic ?? true);
  const [region, setRegion] = useState(existingReflection?.region || "");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const maxLength = 500;
  const remaining = maxLength - content.length;

  const handlePublish = async () => {
    if (!content.trim()) return;

    setPublishing(true);
    try {
      await onPublish(content, isPublic, region || undefined);
      setPublished(true);
      setTimeout(() => setPublished(false), 3000);
    } catch (error) {
      console.error("Failed to publish:", error);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-accent-subtle border border-accent/20 rounded-xl p-6">
        <h3 className="text-[15px] font-semibold text-ink mb-2">
          Week 1 Checkpoint: Your Reflection
        </h3>
        <p className="text-[13px] text-ink-secondary">
          You've spent a week with this verse. Share your reflection with the global Tadabbur community. 
          Your words might be exactly what someone else needs to hear.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <label className="block text-[13px] font-medium text-ink-secondary mb-3">
          Where does this verse live in your life right now?
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
          className="w-full min-h-[200px] p-4 border border-border rounded-xl text-[14px] text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none bg-surface"
          placeholder="In my life right now, this verse speaks to..."
        />
        <div className="flex items-center justify-between mt-3">
          <span className={`text-[12px] ${remaining < 50 ? "text-warm" : "text-ink-tertiary"}`}>
            {remaining} characters remaining
          </span>
          <span className="text-[12px] text-ink-tertiary">
            {content.length} / {maxLength}
          </span>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="public"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="mt-1 w-4 h-4 text-accent border-border rounded focus:ring-accent"
          />
          <div className="flex-1">
            <label htmlFor="public" className="text-[14px] font-medium text-ink cursor-pointer">
              Share publicly with the community
            </label>
            <p className="text-[12px] text-ink-tertiary mt-1">
              Your reflection will be visible to all readers (anonymously). Uncheck to keep it private.
            </p>
          </div>
        </div>

        {isPublic && (
          <div>
            <label htmlFor="region" className="block text-[13px] font-medium text-ink-secondary mb-2">
              Your location (optional)
            </label>
            <input
              type="text"
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g., London, Cairo, New York"
              className="w-full px-4 py-2 border border-border rounded-lg text-[14px] text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-surface"
            />
            <p className="text-[11px] text-ink-tertiary mt-1">
              Helps readers see the global reach of this verse
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handlePublish}
        disabled={!content.trim() || publishing}
        className="w-full bg-accent hover:bg-accent-hover text-white py-4 rounded-xl font-medium text-[15px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {publishing && (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {published ? (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Published Successfully
          </>
        ) : publishing ? (
          "Publishing..."
        ) : (
          <>
            {isPublic ? "Publish to Community" : "Save Privately"}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </>
        )}
      </button>

      {isPublic && (
        <div className="bg-warm/5 border border-warm/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="text-[18px]">🌍</div>
            <div className="text-[12px] text-ink-secondary leading-relaxed">
              Your reflection will be shared anonymously with readers around the world. It might inspire someone 
              going through a similar experience. Thank you for contributing to our global study circle.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
