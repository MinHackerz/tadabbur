"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatHijri,
  formatLongDate,
  getAchievements,
  surahsTouched,
  totalVersesRead,
  type Achievement,
  type Journey,
} from "@/lib/niyyah";
import { downloadCertificate } from "@/lib/niyyahCertificate";
import { GoldCorners, OrnamentDivider } from "./Ornament";

interface Props {
  journey: Journey;
  open: boolean;
  onClose: () => void;
  onStartAnother: () => void;
}

export default function CompletionCeremony({
  journey,
  open,
  onClose,
  onStartAnother,
}: Props) {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const verses = totalVersesRead(journey);
  const completionDate =
    journey.completedDays[journey.completedDays.length - 1]?.date ??
    journey.targetDate;
  const surahCount = surahsTouched(journey);
  const achievements = getAchievements(journey);

  async function handleShare() {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://tadabbur.app";
    const message =
      `A Qur'an reading was completed in dedication to ${journey.recipientName} — ${journey.occasion}. ` +
      `${journey.completedDays?.length ?? 0} days, ${verses} verses. May Allah accept it.\n\n` +
      `Start your own journey: ${appUrl}`;

    // Try Web Share API first (supports image sharing on mobile)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        // Generate the certificate image as a File for sharing
        const { buildCertificateSvg } = await import("@/lib/niyyahCertificate");
        const svg = buildCertificateSvg({ journey, completionDate });
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const imgUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.src = imgUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 1600;
        const ctx = canvas.getContext("2d");
        let file: File | null = null;
        if (ctx) {
          ctx.fillStyle = "#0d1916";
          ctx.fillRect(0, 0, 1200, 1600);
          ctx.drawImage(img, 0, 0, 1200, 1600);
          const pngBlob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob((b) => resolve(b), "image/png"),
          );
          if (pngBlob) {
            file = new File([pngBlob], `niyyah-gift-${journey.recipientName.replace(/[^a-z0-9]/gi, "-")}.png`, { type: "image/png" });
          }
        }
        URL.revokeObjectURL(imgUrl);

        const shareData: ShareData = {
          title: `Niyyah Gift — ${journey.recipientName}`,
          text: message,
        };
        if (file && navigator.canShare?.({ files: [file] })) {
          shareData.files = [file];
        }
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or Web Share not fully supported — fall through to WhatsApp
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    // Fallback: open WhatsApp with text + link
    const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    if (typeof window !== "undefined") window.open(waUrl, "_blank", "noopener");
  }

  function handlePrint() {
    if (typeof window === "undefined") return;

    // Render the certificate SVG into a clean popup window and trigger that
    // window's `print()`. Using `window.print()` on the current document was
    // typesetting both the ceremony modal AND the niyyah dashboard behind it,
    // which produced multi-page PDFs that looked like duplicates.
    void (async () => {
      try {
        const { buildCertificateSvg } = await import("@/lib/niyyahCertificate");
        const svg = buildCertificateSvg({ journey, completionDate });

        // Tiny inline HTML escape for the popup `<title>`.
        const titleSafe = journey.recipientName
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Niyyah Gift — ${titleSafe}</title>
<style>
  html, body { margin: 0; padding: 0; background: #0d1916; }
  .page {
    width: 100vw;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    box-sizing: border-box;
  }
  .page svg {
    max-width: 100%;
    height: auto;
    display: block;
  }
  @page { size: auto; margin: 0; }
  @media print {
    html, body { background: #0d1916; }
    .page { padding: 0; }
  }
</style>
</head>
<body>
  <div class="page">${svg}</div>
  <script>
    // Wait for layout, then trigger the print dialog. Most browsers close
    // the popup after the user dismisses the dialog.
    window.addEventListener("load", function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    });
    window.addEventListener("afterprint", function () { window.close(); });
  </script>
</body>
</html>`;

        const popup = window.open("", "_blank", "width=900,height=1200");
        if (!popup) {
          // Popup blocked — fall back to printing the current document.
          window.print();
          return;
        }
        popup.document.open();
        popup.document.write(html);
        popup.document.close();
      } catch {
        // Last-resort fallback if anything goes wrong loading the SVG.
        window.print();
      }
    })();
  }

  async function handleDownloadImage() {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadCertificate({ journey, completionDate });
      // Persist the rendered image to the server for later re-download.
      try {
        const { buildCertificateSvg } = await import("@/lib/niyyahCertificate");
        const svg = buildCertificateSvg({ journey, completionDate });
        // Render to PNG in a canvas and upload.
        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.src = url;
        await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
        const canvas = document.createElement("canvas");
        canvas.width = 1200;
        canvas.height = 1600;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#0d1916";
          ctx.fillRect(0, 0, 1200, 1600);
          ctx.drawImage(img, 0, 0, 1200, 1600);
          const dataUrl = canvas.toDataURL("image/png");
          const base64 = dataUrl.split(",")[1];
          if (base64) {
            fetch("/api/niyyah/gift", {
              method: "POST",
              headers: { "content-type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                journeyId: journey.id,
                imageBase64: base64,
                recipientName: journey.recipientName,
              }),
            }).catch(() => {});
          }
        }
        URL.revokeObjectURL(url);
      } catch {
        // Non-critical — the user already got the download.
      }
    } finally {
      setDownloading(false);
    }
  }

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Completion ceremony"
      className="niyyah-scope fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8 overflow-y-auto animate-ny-fade-in"
    >
      {/* Sky - fixed to viewport */}
      <div
        aria-hidden
        className="fixed inset-0 z-[-2] bg-[radial-gradient(ellipse_at_center,#2A4A3E_0%,#0d1916_75%,#060a09_100%)]"
      />
      {/* Rays - fixed to viewport */}
      <div
        aria-hidden
        className="fixed inset-0 z-[-1] mix-blend-screen blur-[2px] animate-ny-ray bg-[radial-gradient(circle_at_50%_50%,rgba(255,234,173,0.55)_0%,transparent_38%),repeating-conic-gradient(from_0deg_at_50%_50%,rgba(255,234,173,0.12)_0deg_4deg,transparent_4deg_18deg)]"
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full border border-ny-gold-soft/40 bg-black/35 text-ny-gold-soft text-xl leading-none cursor-pointer hover:bg-black/50 transition flex items-center justify-center"
      >
        ×
      </button>

      <div className="relative z-[1] w-full max-w-2xl text-center text-ny-gold-soft my-auto animate-ny-rise">
        <p
          className="font-[var(--font-decorative)] text-[1.7rem] sm:text-[2rem] tracking-wide text-ny-gold-soft mb-6 m-0 drop-shadow-[0_0_18px_rgba(255,234,173,0.4)]"
          dir="rtl"
          lang="ar"
        >
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>

        {/* Outer gold ring */}
        <div className="relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-ny-gold-bright via-ny-gold-soft to-ny-gold/60 shadow-[0_30px_70px_rgba(0,0,0,0.55)]" />
          <article
            className="relative m-[2px] rounded-[22px] text-left text-ny-charcoal overflow-hidden p-7 sm:p-9 parchment-bg"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(184, 146, 74, 0.08) 0 4px, transparent 4px 9px), linear-gradient(180deg, #FAF1DA, #F5E9C8)",
            }}
          >
            <GoldCorners inset="0.7rem" />

            <p className="text-center text-[10px] font-bold uppercase tracking-[0.24em] text-ny-sage m-0">
              This reading was dedicated to
            </p>
            <p className="text-center font-[var(--font-decorative)] text-[2.4rem] sm:text-[3rem] text-ny-forest leading-tight mt-1 mb-1 m-0">
              {journey.recipientName}
            </p>
            <p className="text-center font-[var(--font-niyyah-display)] italic text-ny-gold tracking-wider mb-4 m-0">
              — {journey.occasion} —
            </p>

            <OrnamentDivider lineWidth="md" glyph="star" className="mb-5" />

            <p className="text-center font-[var(--font-niyyah-display)] italic text-[1.05rem] leading-relaxed text-ny-charcoal/85 max-w-md mx-auto mb-6 m-0">
              &ldquo;{journey.personalDua}&rdquo;
            </p>

            <dl className="grid grid-cols-3 gap-3 text-center mb-6 m-0">
              <Stat label="days" value={journey.completedDays.length} />
              <Stat label="verses" value={verses} />
              <Stat label="surahs" value={surahCount || 1} />
            </dl>

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="mb-6">
                <p className="text-center text-[10px] font-bold uppercase tracking-[0.24em] text-ny-gold mb-1 m-0">
                  Achievements
                </p>
                <p className="text-center font-[var(--font-niyyah-display)] italic text-ny-sage text-[13px] m-0 mb-4">
                  Seals of grace earned along the path.
                </p>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {achievements.map((a) => (
                    <AchievementCard key={a.id} a={a} />
                  ))}
                </div>
              </div>
            )}

            <OrnamentDivider lineWidth="sm" glyph="diamond" className="mb-3" />

            <p className="text-center font-[var(--font-niyyah-display)] italic text-[0.95rem] text-ny-charcoal/85 m-0">
              from {journey.readerName ?? "your reader"}
            </p>
            <p className="text-center font-[var(--font-niyyah-display)] italic text-[0.85rem] text-ny-charcoal/65 mt-1 m-0">
              Completed {formatLongDate(completionDate)}
              {formatHijri(completionDate)
                ? ` · ${formatHijri(completionDate)}`
                : ""}
            </p>

            <div className="text-center mt-5 text-3xl text-ny-gold drop-shadow-[0_0_10px_rgba(184,146,74,0.5)]">
              ✦
            </div>
          </article>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloading}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-ny-forest bg-gradient-to-br from-ny-gold-soft via-ny-gold-bright to-ny-gold border border-ny-gold shadow-[0_10px_22px_rgba(184,146,74,0.32),inset_0_1px_0_rgba(255,255,255,0.45)] hover:shadow-[0_14px_28px_rgba(184,146,74,0.42),inset_0_1px_0_rgba(255,255,255,0.5)] transition-shadow disabled:opacity-60 disabled:cursor-wait"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? "Preparing…" : "Download as image"}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-ny-gold-soft bg-transparent border border-ny-gold-soft/40 hover:bg-ny-gold-soft/10 transition"
          >
            Save as PDF
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-ny-gold-soft bg-transparent border border-ny-gold-soft/40 hover:bg-ny-gold-soft/10 transition"
          >
            Share via WhatsApp
          </button>
          <button
            type="button"
            onClick={onStartAnother}
            className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-ny-gold-soft bg-transparent border border-ny-gold-soft/40 hover:bg-ny-gold-soft/10 transition"
          >
            Begin a new journey
          </button>
        </div>

        <p className="mt-5 font-[var(--font-niyyah-display)] italic text-[1rem] text-ny-gold-soft/85 m-0">
          May Allah accept this from you.{" "}
          <span dir="rtl" lang="ar">
            آمين
          </span>
        </p>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-ny-cream/70 border border-ny-gold/30 py-4 px-2 shadow-[inset_0_0_0_1px_rgba(184,146,74,0.18)]">
      <div className="font-[var(--font-niyyah-display)] text-[1.85rem] sm:text-[2.1rem] font-semibold text-ny-forest leading-none tracking-tight">
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-ny-sage mt-1.5 font-bold">
        {label}
      </div>
    </div>
  );
}

function AchievementCard({ a }: { a: Achievement }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-ny-gold/35 bg-ny-cream/70 shadow-[inset_0_0_0_1px_rgba(184,146,74,0.18)]">
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-ny-gold-soft to-ny-gold-bright text-ny-forest text-[16px] shrink-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5),0_4px_10px_rgba(184,146,74,0.3)]"
      >
        ✦
      </span>
      <div className="min-w-0">
        <p className="m-0 font-[var(--font-niyyah-display)] font-semibold text-[1.05rem] text-ny-forest leading-tight">
          {a.title}
        </p>
        <p className="m-0 mt-0.5 text-[12.5px] text-ny-charcoal/80 leading-snug">
          {a.description}
        </p>
        {a.verseRef && (
          <p className="m-0 mt-1 font-mono text-[10px] tracking-[0.14em] uppercase text-ny-gold">
            {a.verseRef}
          </p>
        )}
      </div>
    </div>
  );
}
