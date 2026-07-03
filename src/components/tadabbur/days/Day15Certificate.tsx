"use client";

import { useState, useEffect } from "react";
import ChatGPTContent from "./ChatGPTContent";

interface Props {
  circleId: string;
  verseKey: string;
  verseText: string;
  verseTranslation: string;
  progress: any;
  onGenerateCertificate: () => void;
}

export default function Day15Certificate({ 
  circleId, 
  verseKey, 
  verseText, 
  verseTranslation,
  progress,
  onGenerateCertificate
}: Props) {
  const [userNameInput, setUserNameInput] = useState("");
  const [generating, setGenerating] = useState(() => !!progress?.certificate);
  const [certificateGenerated, setCertificateGenerated] = useState(false);
  const [certificateData, setCertificateData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-load existing certificate if it was already generated
  useEffect(() => {
    if (progress?.certificate) {
      fetch("/api/tadabbur/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          progressId: progress.id,
          circleId,
          verseKey,
          verseTranslation,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Failed to load existing certificate");
          }
          const data = await response.json();
          setCertificateData(data);
          setCertificateGenerated(true);
        })
        .catch((err) => {
          console.error("Failed to load existing certificate:", err);
        })
        .finally(() => {
          setGenerating(false);
        });
    }
  }, [progress, circleId, verseKey, verseTranslation]);

  async function handleGenerateCertificate() {
    const name = userNameInput.trim();
    if (!name) {
      setError("Please enter your name for the certificate.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/tadabbur/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          progressId: progress.id,
          circleId,
          verseKey,
          verseTranslation,
          customName: name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || "Failed to generate certificate");
      }

      setCertificateData(data);
      setCertificateGenerated(true);
      
      // Auto-download the certificate
      if (data.svg && data.filename) {
        downloadCertificate(data.svg, data.filename);
      }
    } catch (error) {
      console.error("Failed to generate certificate:", error);
      setError(error instanceof Error ? error.message : "Failed to generate certificate");
    } finally {
      setGenerating(false);
    }
  }

  function downloadCertificate(svg: string, filename: string) {
    // Download the certificate as an SVG file directly.
    // The previous iframe-print approach was fragile and often failed.
    const svgFilename = filename.replace(/\.pdf$/i, '.svg');
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = svgFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleViewCertificate() {
    if (certificateData?.certificate?.shareableUrl) {
      window.open(certificateData.certificate.shareableUrl, '_blank');
    }
  }

  function handleDownloadAgain() {
    if (certificateData?.svg && certificateData?.filename) {
      downloadCertificate(certificateData.svg, certificateData.filename);
    }
  }

  return (
    <div className="space-y-6">
      {/* Madhab Content */}
      <ChatGPTContent
        circleId={circleId}
        day={15}
        angleType="madhab"
        verseKey={verseKey}
        verseText={verseText}
        verseTranslation={verseTranslation}
        title="Madhab Applications"
        description="How have the different schools of Islamic law (Hanafi, Maliki, Shafi'i, Hanbali) applied this verse in their rulings? Explore the rich diversity of Islamic jurisprudence."
      />

      {/* Completion Celebration */}
      <div className="bg-gradient-to-br from-accent-subtle to-warm/10 border-2 border-accent/30 rounded-2xl p-8 text-center">
        <div className="text-[48px] mb-4">🎉</div>
        <h3 className="text-[20px] font-bold text-ink mb-2">
          Congratulations on Completing Your 15-Day Journey!
        </h3>
        <p className="text-[14px] text-ink-secondary mb-6 max-w-2xl mx-auto">
          You&apos;ve spent 15 days deeply contemplating verse {verseKey}. You&apos;ve explored it through recitation, 
          translation, linguistics, history, scholarship, and personal reflection. This verse is now part of you.
        </p>

        {/* Journey Summary */}
        <div className="bg-surface/80 backdrop-blur rounded-xl p-6 mb-6 text-left">
          <h4 className="text-[15px] font-semibold text-ink mb-4 text-center">Your Journey Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="text-[24px] font-bold text-accent mb-1">15</div>
              <div className="text-[12px] text-ink-tertiary uppercase tracking-wider">Days Completed</div>
            </div>
            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="text-[24px] font-bold text-accent mb-1">{verseKey}</div>
              <div className="text-[12px] text-ink-tertiary uppercase tracking-wider">Verse Studied</div>
            </div>
            <div className="bg-surface-secondary rounded-lg p-4">
              <div className="text-[24px] font-bold text-accent mb-1">15</div>
              <div className="text-[12px] text-ink-tertiary uppercase tracking-wider">Unique Angles</div>
            </div>
          </div>

          {/* What You Learned */}
          <div className="mt-6 p-4 bg-warm/5 border border-warm/20 rounded-lg">
            <h5 className="text-[13px] font-semibold text-ink mb-3">What You Explored:</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-ink-secondary">
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Recitation & Listening
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Multiple Translations
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Word-by-Word Analysis
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Revelation Context
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Companion Stories
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Classical Tafsir
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Personal Reflection
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Natural World Signs
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Similar Verses
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Personal Du&apos;a
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Historical Context
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Contemporary Scholars
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Integration View
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Calligraphy Art
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent">✓</span> Madhab Applications
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Generation */}
        {error && (
          <div className="mb-4 p-4 bg-danger-subtle border border-danger/20 rounded-xl text-danger text-[14px]">
            {error}
          </div>
        )}

        {!certificateGenerated ? (
          <div className="space-y-6">
            <div className="max-w-md mx-auto text-left bg-surface-secondary border border-border p-5 rounded-xl shadow-sm">
              <label htmlFor="certificate-name" className="block text-[13px] font-bold text-ink uppercase tracking-wider mb-2">
                Enter Your Full Name
              </label>
              <input
                id="certificate-name"
                type="text"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                placeholder="e.g., Minhaj Ahmed"
                className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-[14px] text-ink focus:outline-none focus:border-accent transition-colors"
                disabled={generating}
              />
              <p className="text-[11px] text-ink-tertiary mt-2 leading-relaxed">
                This name will be written on your verified certificate and saved to your profile display settings.
              </p>
            </div>

            <button
              onClick={handleGenerateCertificate}
              disabled={generating}
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent text-white rounded-xl font-semibold text-[15px] hover:bg-accent-hover transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
            {generating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Generating Your Certificate...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Generate & Download Certificate</span>
              </>
            )}
          </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl font-semibold text-[14px]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              <span>Certificate Generated & Downloaded!</span>
            </div>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleViewCertificate}
                className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold text-[14px] hover:bg-accent-hover transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                View & Verify Online
              </button>
              
              <button
                onClick={handleDownloadAgain}
                className="inline-flex items-center gap-2 px-6 py-3 bg-surface border border-border text-ink rounded-xl font-semibold text-[14px] hover:bg-surface-hover transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download Again
              </button>
            </div>
          </div>
        )}

        <p className="text-[12px] text-ink-tertiary mt-4">
          Your certificate includes a QR code for instant verification
        </p>
      </div>

      {/* Next Steps */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h4 className="text-[15px] font-semibold text-ink mb-4 flex items-center gap-2">
          <span className="text-[20px]">🌟</span>
          What&apos;s Next?
        </h4>
        <div className="space-y-3 text-[13px] text-ink-secondary">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[11px] font-bold text-accent">1</span>
            </div>
            <div>
              <strong className="text-ink">Live This Verse:</strong> The real journey begins now. Apply what you&apos;ve learned in your daily life.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[11px] font-bold text-accent">2</span>
            </div>
            <div>
              <strong className="text-ink">Join the Next Circle:</strong> A new verse awaits. Continue your Quranic journey with the community.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[11px] font-bold text-accent">3</span>
            </div>
            <div>
              <strong className="text-ink">Share Your Experience:</strong> Inspire others by sharing your journey and insights.
            </div>
          </div>
        </div>
      </div>

      {/* Reflection Quote */}
      <div className="bg-warm/5 border border-warm/20 rounded-xl p-6 text-center">
        <p className="text-[15px] text-ink italic leading-relaxed mb-3">
          &quot;The best of you are those who learn the Quran and teach it.&quot;
        </p>
        <p className="text-[12px] text-ink-tertiary">
          — Prophet Muhammad ﷺ (Sahih al-Bukhari 5027)
        </p>
      </div>
    </div>
  );
}
