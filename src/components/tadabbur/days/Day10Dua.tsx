"use client";

import { useState } from "react";
import { GoldCorners } from "../../niyyah/Ornament";

interface Props {
  verseKey: string;
  verseText: string;
  verseTranslation: string;
  onConfirm: (confirmed: boolean) => void;
  existingConfirmation?: boolean;
}

export default function Day10Dua({ verseKey, verseText, verseTranslation, onConfirm, existingConfirmation }: Props) {
  const [confirmed, setConfirmed] = useState(existingConfirmation || false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    onConfirm(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-accent-subtle border border-accent/20 rounded-xl p-6">
        <h3 className="text-[15px] font-semibold text-ink mb-2">
          Read This Verse as Du&apos;a in Prayer
        </h3>
        <p className="text-[13px] text-ink-secondary">
          Today&apos;s practice is to recite this verse as a personal supplication during your prayer. 
          Read it in sujood (prostration), after tashahhud, or in any voluntary prayer as your du&apos;a to Allah.
        </p>
      </div>

      <div className="bg-surface-secondary border border-border rounded-xl p-6">
        <div className="text-[13px] text-ink-secondary mb-4 leading-relaxed">
          <strong className="text-ink">The Verse to Recite:</strong>
          <div className="mt-3 p-4 bg-warm/5 rounded-lg">
            <p className="font-arabic text-[20px] text-right leading-loose text-ink mb-3" dir="rtl">
              {verseText}
            </p>
            <p className="text-[14px] italic text-ink-secondary border-t border-border pt-3">
              {verseTranslation}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <h4 className="text-[14px] font-semibold text-ink mb-3">How to Practice:</h4>
        <ol className="space-y-3 text-[13px] text-ink-secondary">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[11px] font-bold">1</span>
            <span>Perform wudu and find a quiet place for prayer</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[11px] font-bold">2</span>
            <span>Pray at least 2 rak&apos;ahs (or add to your regular prayers)</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[11px] font-bold">3</span>
            <span>In sujood or after tashahhud, recite this verse as your du&apos;a</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[11px] font-bold">4</span>
            <span>Reflect on its meaning as you recite it to Allah</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[11px] font-bold">5</span>
            <span>Return here and mark it complete when done</span>
          </li>
        </ol>
      </div>

      {!confirmed ? (
        <div className="bg-surface border-2 border-accent/30 rounded-xl p-6">
          <div className="text-center">
            <div className="text-[32px] mb-3">🤲</div>
            <h4 className="text-[15px] font-semibold text-ink mb-2">
              Have you read this verse as du&apos;a in your prayer?
            </h4>
            <p className="text-[13px] text-ink-secondary mb-4">
              Mark complete once you&apos;ve recited this verse as a supplication during your prayer.
            </p>
            <button
              onClick={handleConfirm}
              className="bg-accent hover:bg-accent-hover text-white px-6 py-3 rounded-lg text-[14px] font-medium transition-colors"
            >
              Yes, I&apos;ve completed this practice
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Outer accent-ring frame */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/40 via-accent/30 to-accent/20 shadow-[0_12px_32px_rgba(61,107,85,0.25)]"
          />
          {/* Inner surface */}
          <div className="relative m-[2px] rounded-[14px] bg-accent-subtle border border-accent/30 p-6">
            <GoldCorners inset="0.5rem" />
            
            {/* Top ribbon */}
            <span
              aria-hidden
              className="absolute top-[2px] left-6 right-6 h-px bg-gradient-to-r from-accent/0 via-accent/40 to-accent/0"
            />
            
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-accent/40 bg-gradient-to-br from-accent/20 to-accent/10 text-accent mb-3">
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-[16px] font-[var(--font-niyyah-display)] font-semibold text-accent mb-2">
                Alhamdulillah! Practice Completed
              </h4>
              <p className="text-[13px] text-ink-secondary leading-relaxed">
                May Allah accept your du&apos;a and grant you what is best.
              </p>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed bottom-6 right-6 bg-accent text-white px-6 py-3 rounded-lg shadow-[0_8px_24px_rgba(61,107,85,0.4)] animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">✓</span>
            <span className="text-[14px] font-medium">Practice marked complete!</span>
          </div>
        </div>
      )}

      <div className="bg-warm/5 border border-warm/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="text-[18px]">💡</div>
          <div className="text-[12px] text-ink-secondary leading-relaxed">
            <strong className="text-ink">Spiritual Insight:</strong> The Quran itself is du&apos;a. 
            When you recite Allah&apos;s words back to Him in prayer, you&apos;re using the most beautiful 
            and powerful supplications. The Prophet ﷺ often used Quranic verses in his du&apos;as.
          </div>
        </div>
      </div>
    </div>
  );
}
