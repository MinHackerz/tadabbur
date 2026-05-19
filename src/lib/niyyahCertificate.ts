/**
 * Niyyah token export — generates a self-contained SVG certificate and
 * converts it to a PNG via a canvas. Pure browser API (no extra deps).
 *
 * The SVG embeds all visual decoration (gold border, parchment fill,
 * ornaments) so the rendered PNG matches the on-screen certificate.
 */

import type { Journey } from "@/lib/niyyah";
import { formatLongDate, totalVersesRead } from "@/lib/niyyah";

interface CertificateInput {
  journey: Journey;
  completionDate: string;
}

/** Escapes user-provided strings so they're safe inside SVG markup. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/**
 * Word-wraps a long string into roughly equal lines, conservative so lines
 * don't overflow the certificate body. Returns escaped lines.
 */
function wrap(text: string, maxChars = 56): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.map(esc);
}

/** Builds the certificate SVG markup as a string. */
export function buildCertificateSvg({
  journey,
  completionDate,
}: CertificateInput): string {
  const W = 1200;
  const H = 1600;
  const verses = totalVersesRead(journey);
  const days = journey.completedDays.length;

  const recipient = esc(journey.recipientName || "Your beloved");
  const occasion = esc(journey.occasion || "");
  const reader = esc(journey.readerName?.trim() || "the reader");
  const completedOn = esc(formatLongDate(completionDate));
  const duaLines = wrap(journey.personalDua || "", 52);

  const duaStartY = 760;
  const duaLineHeight = 44;
  const duaBlockHeight = duaLines.length * duaLineHeight;
  const statsY = duaStartY + duaBlockHeight + 60;
  const fromY = statsY + 130;

  // Calculate depth-based visual enhancements
  const progressPct = Math.min(100, Math.round((verses / 6236) * 100));
  const glowIntensity = Math.min(0.8, progressPct / 125);
  const ornamentComplexity = verses > 3000 ? "detailed" : verses > 1000 ? "medium" : "simple";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d8b15c" />
      <stop offset="35%" stop-color="#f4e4b8" />
      <stop offset="65%" stop-color="#e8d5a3" />
      <stop offset="100%" stop-color="#b8924a" />
    </linearGradient>
    <linearGradient id="parchment" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FAF8E8" />
      <stop offset="50%" stop-color="#FAF1DA" />
      <stop offset="100%" stop-color="#F1E2BD" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#fff9e6" stop-opacity="${glowIntensity}" />
      <stop offset="50%" stop-color="#f4e4b8" stop-opacity="${glowIntensity * 0.5}" />
      <stop offset="100%" stop-color="#b8924a" stop-opacity="0" />
    </radialGradient>
    <pattern id="weave" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="14" stroke="#b8924a" stroke-opacity="0.07" stroke-width="2" />
    </pattern>
    <pattern id="damascus" width="80" height="80" patternUnits="userSpaceOnUse">
      <circle cx="40" cy="40" r="2" fill="#b8924a" opacity="0.08" />
      <path d="M40 20 Q50 30 40 40 Q30 30 40 20 M20 40 Q30 50 40 40 Q30 30 20 40 M60 40 Q50 50 40 40 Q50 30 60 40 M40 60 Q50 50 40 40 Q30 50 40 60" 
            fill="none" stroke="#b8924a" stroke-opacity="0.06" stroke-width="0.8" />
    </pattern>
    <filter id="shadow">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
      <feOffset dx="0" dy="2" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.3"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="goldGlow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Background: Deep night sky with subtle gradient -->
  <rect width="${W}" height="${H}" fill="#0a0f0d" />
  <rect width="${W}" height="${H}" fill="url(#glow)" opacity="0.4" />

  <!-- Outer gold frame with depth -->
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="32" fill="url(#frame)" filter="url(#shadow)" />
  <rect x="44" y="44" width="${W - 88}" height="${H - 88}" rx="30" fill="none" stroke="#fff9e6" stroke-opacity="0.4" stroke-width="1" />
  
  <!-- Parchment interior with texture -->
  <rect x="56" y="56" width="${W - 112}" height="${H - 112}" rx="22" fill="url(#parchment)" />
  <rect x="56" y="56" width="${W - 112}" height="${H - 112}" rx="22" fill="url(#damascus)" />
  <rect x="56" y="56" width="${W - 112}" height="${H - 112}" rx="22" fill="url(#weave)" />

  <!-- Inner decorative borders -->
  <rect x="92" y="92" width="${W - 184}" height="${H - 184}" rx="14" fill="none" stroke="#b8924a" stroke-opacity="0.55" stroke-width="2" />
  <rect x="96" y="96" width="${W - 192}" height="${H - 192}" rx="12" fill="none" stroke="#d8b15c" stroke-opacity="0.25" stroke-width="1" />

  <!-- Corner ornaments with depth-based complexity -->
  ${cornerOrnament(108, 108, 0, ornamentComplexity)}
  ${cornerOrnament(W - 108, 108, 90, ornamentComplexity)}
  ${cornerOrnament(W - 108, H - 108, 180, ornamentComplexity)}
  ${cornerOrnament(108, H - 108, 270, ornamentComplexity)}

  <!-- Bismillah with glow -->
  <text x="${W / 2}" y="220" text-anchor="middle" fill="#b8924a" filter="url(#goldGlow)"
        font-family="'Amiri', 'Noto Naskh Arabic', 'Times New Roman', serif"
        font-size="58" direction="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</text>

  <!-- Decorative arch above recipient -->
  ${decorativeArch(W / 2, 280)}

  <!-- Eyebrow -->
  <text x="${W / 2}" y="320" text-anchor="middle" fill="#3d6b55"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="22" font-weight="700" letter-spacing="6">THIS READING WAS DEDICATED TO</text>

  <!-- Recipient with shadow -->
  <text x="${W / 2}" y="430" text-anchor="middle" fill="#143028" filter="url(#shadow)"
        font-family="'Cormorant Garamond', 'Times New Roman', serif"
        font-size="92" font-weight="600">${recipient}</text>

  <!-- Occasion with decorative elements -->
  <text x="${W / 2}" y="500" text-anchor="middle" fill="#b8924a" font-style="italic"
        font-family="'Cormorant Garamond', 'Times New Roman', serif"
        font-size="36" letter-spacing="2">— ${occasion} —</text>

  <!-- Enhanced divider -->
  ${enhancedDivider(W / 2, 580, ornamentComplexity)}

  <!-- Dua lines with subtle shadow -->
  <g font-family="'Cormorant Garamond', 'Times New Roman', serif"
     font-style="italic" font-size="34" fill="#2a2622" text-anchor="middle" filter="url(#shadow)">
    ${duaLines
      .map((line, i) => {
        const open = i === 0 ? "&#8220;" : "";
        const close = i === duaLines.length - 1 ? "&#8221;" : "";
        return `<text x="${W / 2}" y="${duaStartY + i * duaLineHeight}">${open}${line}${close}</text>`;
      })
      .join("\n    ")}
  </g>

  <!-- Stats row with enhanced styling -->
  <g transform="translate(${W / 2}, ${statsY})">
    ${enhancedStatBlock(-280, days.toString(), "DAYS")}
    ${enhancedStatBlock(0, verses.toLocaleString(), "VERSES")}
    ${enhancedStatBlock(280, journey.goalType === "khatm" ? "1" : (journey.goalType === "juz" ? "30" : ""), journey.goalType === "khatm" ? "KHATM" : journey.goalType === "juz" ? "JUZ" : "")}
  </g>

  <!-- From / completed -->
  <text x="${W / 2}" y="${fromY}" text-anchor="middle" fill="#2a2622" font-style="italic"
        font-family="'Cormorant Garamond', 'Times New Roman', serif" font-size="32">from ${reader}</text>
  <text x="${W / 2}" y="${fromY + 50}" text-anchor="middle" fill="#5a4f35" font-style="italic"
        font-family="'Cormorant Garamond', 'Times New Roman', serif" font-size="26">Completed ${completedOn}</text>

  <!-- Enhanced final seal with rays -->
  <g transform="translate(${W / 2}, ${H - 200})">
    ${radiatingRays(8, 60, 80)}
    <circle r="50" fill="#b8924a" opacity="0.15" />
    <circle r="44" fill="url(#frame)" filter="url(#goldGlow)" />
    <circle r="42" fill="none" stroke="#fff9e6" stroke-opacity="0.5" stroke-width="1" />
    <text y="14" text-anchor="middle" fill="#143028" filter="url(#goldGlow)"
          font-family="Helvetica Neue, Arial, sans-serif" font-size="46">&#10022;</text>
  </g>

  <!-- Footer -->
  <text x="${W / 2}" y="${H - 110}" text-anchor="middle" fill="#5a4f35"
        font-family="'Helvetica Neue', Arial, sans-serif" font-size="18" letter-spacing="4">QUR&#8217;AN INSIGHT &#183; NIYYAH GIFT SYSTEM</text>
</svg>`;
}

function cornerOrnament(cx: number, cy: number, rotateDeg: number, complexity: string): string {
  const base = `<g transform="translate(${cx}, ${cy}) rotate(${rotateDeg})" fill="none" stroke="#b8924a" stroke-width="2" stroke-linecap="round">
    <path d="M-32 0 L-16 0 M0 -32 L0 -16" />
    <circle cx="0" cy="0" r="3" fill="#b8924a" />`;
  
  if (complexity === "detailed") {
    return base + `
    <path d="M-28 -4 Q-24 -8 -20 -4 M-4 -28 Q-8 -24 -4 -20" stroke-width="1.5" stroke-opacity="0.6" />
    <circle cx="-12" cy="-12" r="1.5" fill="#b8924a" opacity="0.7" />
    <path d="M-36 0 L-34 0 M0 -36 L0 -34" stroke-width="1" stroke-opacity="0.4" />
  </g>`;
  } else if (complexity === "medium") {
    return base + `
    <path d="M-28 -4 Q-24 -8 -20 -4 M-4 -28 Q-8 -24 -4 -20" stroke-width="1.5" stroke-opacity="0.6" />
  </g>`;
  }
  return base + `</g>`;
}

function decorativeArch(cx: number, cy: number): string {
  return `<g transform="translate(${cx}, ${cy})" fill="none" stroke="#b8924a" stroke-opacity="0.35" stroke-width="1">
    <path d="M-80 0 Q-80 -15 -65 -15 L-15 -15 Q0 -15 0 -30 Q0 -15 15 -15 L65 -15 Q80 -15 80 0" />
    <circle cx="0" cy="-30" r="2" fill="#b8924a" opacity="0.5" />
  </g>`;
}

function enhancedDivider(cx: number, cy: number, complexity: string): string {
  const base = `<g transform="translate(${cx}, ${cy})" stroke="#b8924a" stroke-opacity="0.55" stroke-width="1.5">
    <line x1="-220" y1="0" x2="-30" y2="0" />
    <text x="0" y="8" text-anchor="middle" font-family="Helvetica Neue, Arial, sans-serif" font-size="22" fill="#b8924a" stroke="none">&#10022;</text>
    <line x1="30" y1="0" x2="220" y2="0" />`;
  
  if (complexity === "detailed") {
    return base + `
    <circle cx="-125" cy="0" r="2" fill="#b8924a" opacity="0.4" />
    <circle cx="125" cy="0" r="2" fill="#b8924a" opacity="0.4" />
    <path d="M-180 -8 L-180 8 M180 -8 L180 8" stroke-width="1" stroke-opacity="0.3" />
  </g>`;
  }
  return base + `</g>`;
}

function radiatingRays(count: number, innerRadius: number, outerRadius: number): string {
  const rays = [];
  for (let i = 0; i < count; i++) {
    const angle = (i * 360) / count;
    const x1 = innerRadius * Math.cos((angle * Math.PI) / 180);
    const y1 = innerRadius * Math.sin((angle * Math.PI) / 180);
    const x2 = outerRadius * Math.cos((angle * Math.PI) / 180);
    const y2 = outerRadius * Math.sin((angle * Math.PI) / 180);
    rays.push(`<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#b8924a" stroke-opacity="0.15" stroke-width="1.5" />`);
  }
  return rays.join("\n    ");
}

function enhancedStatBlock(dx: number, value: string, label: string): string {
  if (!value) return "";
  return `<g transform="translate(${dx}, 0)" text-anchor="middle">
    <rect x="-70" y="-50" width="140" height="100" rx="8" fill="#b8924a" opacity="0.06" />
    <rect x="-68" y="-48" width="136" height="96" rx="7" fill="none" stroke="#b8924a" stroke-opacity="0.2" stroke-width="1" />
    <text y="0" fill="#143028" font-family="'Cormorant Garamond', 'Times New Roman', serif"
          font-size="80" font-weight="600">${esc(value)}</text>
    <text y="48" fill="#3d6b55" font-family="'Helvetica Neue', Arial, sans-serif"
          font-size="20" font-weight="700" letter-spacing="4">${esc(label)}</text>
  </g>`;
}

/**
 * Renders the SVG to a PNG and triggers a download.
 * Falls back to downloading the SVG if PNG conversion fails.
 */
export async function downloadCertificate(input: CertificateInput): Promise<void> {
  if (typeof window === "undefined") return;
  const svg = buildCertificateSvg(input);
  const filename = `niyyah-${slugify(input.journey.recipientName || "token")}`;

  try {
    const png = await svgToPng(svg, 1200, 1600);
    triggerDownload(png, `${filename}.png`);
  } catch {
    // Fallback: download raw SVG so the user always gets something.
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, `${filename}.svg`);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}

function svgToPng(svg: string, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("no-2d-context"));
          return;
        }
        ctx.fillStyle = "#0d1916";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-load-failed"));
    };
    img.src = url;
  });
}

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "token";
}
