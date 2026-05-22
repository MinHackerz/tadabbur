#!/usr/bin/env node
/**
 * Generate favicon + per-route OG thumbnails from a single brand SVG.
 *
 * Outputs:
 *   public/favicon.ico          (multi-size 16/32/48)
 *   public/icon.svg             (copied/linked to brand-mark)
 *   public/apple-icon.png       (180x180)
 *   public/icon-192.png         (PWA / generic)
 *   public/icon-512.png         (PWA / generic)
 *   public/og/<route>.png       (1200x630 OG thumbnails per route)
 *   public/og/default.png       (fallback OG)
 *
 * The thumbnails share a parchment + manuscript layout with route-specific
 * eyebrow / title / subtitle text and a small accent glyph.
 *
 * Usage: node scripts/generate-brand-assets.mjs
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const PUB = path.join(ROOT, "public");
const OG_DIR = path.join(PUB, "og");

/* ─────────────────────────── Brand tokens ──────────────────────────── */

const SITE_HOSTNAME = process.env.NEXT_PUBLIC_SITE_URL
  ? safeHost(process.env.NEXT_PUBLIC_SITE_URL)
  : "tadabbur-iota.vercel.app";

function safeHost(raw) {
  try {
    return new URL(raw).host;
  } catch {
    return raw.replace(/^https?:\/\//, "").replace(/\/.*/, "");
  }
}

const COLORS = {
  parchment: "#faf6ec",
  parchmentLight: "#fffdf6",
  parchmentDeep: "#f2e9d2",
  ink: "#1f1c17",
  inkSoft: "#5a534a",
  inkMuted: "#8c8579",
  gold: "#b8924a",
  goldBright: "#c9a84c",
  forest: "#3d6b55",
  border: "#e6dabd",
};

/* ─────────────────────────── Brand mark SVG ────────────────────────── */
// Self-contained mark used for the favicon, apple-touch icon, and as a
// glyph inside every OG thumbnail. Mirrors the TadabburLogo calligraphy.
function brandMarkSvg({ size = 64, monoColor = null } = {}) {
  const ink = monoColor ?? `url(#ink-${size})`;
  const gold = monoColor ?? COLORS.gold;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
    <defs>
      <radialGradient id="bg-${size}" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stop-color="${COLORS.parchmentLight}"/>
        <stop offset="65%" stop-color="${COLORS.parchment}"/>
        <stop offset="100%" stop-color="${COLORS.parchmentDeep}"/>
      </radialGradient>
      <linearGradient id="ink-${size}" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${COLORS.goldBright}"/>
        <stop offset="100%" stop-color="${COLORS.gold}"/>
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="30" fill="url(#bg-${size})" stroke="${COLORS.gold}" stroke-width="1.5" stroke-opacity="0.55"/>
    <circle cx="32" cy="32" r="25" fill="none" stroke="${COLORS.gold}" stroke-width="0.8" stroke-opacity="0.35"/>
    <path d="M 20 28 Q 24 24, 32 24 Q 40 24, 44 28" stroke="${ink}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    <circle cx="27" cy="18" r="2.4" fill="${ink}"/>
    <circle cx="37" cy="18" r="2.4" fill="${ink}"/>
    <path d="M 22 36 Q 26 32, 32 32 Q 38 32, 42 36 Q 44 38, 44 41" stroke="${ink}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    <path d="M 20 44 Q 32 48, 44 44" stroke="${gold}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.6"/>
    <circle cx="32" cy="40" r="1.5" fill="${gold}" opacity="0.45"/>
  </svg>`;
}

/* ─────────────────────────── Favicon (.ico) ────────────────────────── */
// Build a multi-size .ico file (16, 32, 48) from PNG buffers. We hand-roll
// the small ICO container so we don't pull in another dependency.
function buildIco(pngBuffers) {
  // Each PNG is embedded directly inside the ICO. ICO supports PNG entries
  // for entries >= 256 in size, but most modern browsers/OSes also accept
  // small PNG-encoded entries, which keeps this script dependency-free.
  const count = pngBuffers.length;
  const headerSize = 6 + 16 * count;
  let offset = headerSize;
  const dirEntries = [];
  for (const { size, buf } of pngBuffers) {
    dirEntries.push({ size, buf, offset });
    offset += buf.length;
  }
  const total = offset;
  const out = Buffer.alloc(total);
  // ICONDIR
  out.writeUInt16LE(0, 0); // reserved
  out.writeUInt16LE(1, 2); // type: 1 = icon
  out.writeUInt16LE(count, 4);
  // ICONDIRENTRY
  let p = 6;
  for (const { size, buf, offset } of dirEntries) {
    out.writeUInt8(size === 256 ? 0 : size, p + 0); // width
    out.writeUInt8(size === 256 ? 0 : size, p + 1); // height
    out.writeUInt8(0, p + 2); // colors in palette
    out.writeUInt8(0, p + 3); // reserved
    out.writeUInt16LE(1, p + 4); // color planes
    out.writeUInt16LE(32, p + 6); // bits per pixel
    out.writeUInt32LE(buf.length, p + 8);
    out.writeUInt32LE(offset, p + 12);
    p += 16;
  }
  // Image data
  for (const { buf, offset } of dirEntries) {
    buf.copy(out, offset);
  }
  return out;
}

/* ─────────────────────── OG thumbnail composition ─────────────────── */

const W = 1200;
const H = 630;

// XML-safe text escape for SVG composition.
function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ogTemplateSvg({ eyebrow, title, subtitle, glyph, accent }) {
  const accentColor = accent ?? COLORS.gold;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <defs>
      <radialGradient id="parchment" cx="14%" cy="0%" r="100%">
        <stop offset="0%" stop-color="${COLORS.parchmentDeep}" stop-opacity="0.7"/>
        <stop offset="55%" stop-color="${COLORS.parchment}"/>
        <stop offset="100%" stop-color="${COLORS.parchmentLight}"/>
      </radialGradient>
      <radialGradient id="warmGlow" cx="88%" cy="100%" r="80%">
        <stop offset="0%" stop-color="${COLORS.gold}" stop-opacity="0.18"/>
        <stop offset="60%" stop-color="${COLORS.gold}" stop-opacity="0.04"/>
        <stop offset="100%" stop-color="${COLORS.gold}" stop-opacity="0"/>
      </radialGradient>
      <pattern id="manuscript" width="60" height="60" patternUnits="userSpaceOnUse">
        <circle cx="30" cy="30" r="0.8" fill="${COLORS.gold}" opacity="0.08"/>
      </pattern>
      <linearGradient id="goldRule" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${accentColor}" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
      </linearGradient>
    </defs>

    <!-- Background washes -->
    <rect width="${W}" height="${H}" fill="url(#parchment)"/>
    <rect width="${W}" height="${H}" fill="url(#warmGlow)"/>
    <rect width="${W}" height="${H}" fill="url(#manuscript)"/>

    <!-- Inner manuscript frame -->
    <rect x="36" y="36" width="${W - 72}" height="${H - 72}" rx="22"
          fill="none" stroke="${COLORS.border}" stroke-width="2"/>
    <rect x="48" y="48" width="${W - 96}" height="${H - 96}" rx="16"
          fill="none" stroke="${accentColor}" stroke-width="1" stroke-opacity="0.45"/>

    <!-- Corner ornaments -->
    ${cornerOrnaments(accentColor)}

    <!-- Brand lockup (top-left) -->
    <g transform="translate(96, 100)">
      ${brandMarkInline(72)}
      <text x="92" y="30" font-family="ui-serif, 'Iowan Old Style', 'Apple Garamond', Georgia, serif"
            font-size="28" font-weight="600" fill="${COLORS.ink}" letter-spacing="0.5">Tadabbur</text>
      <text x="92" y="58" font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
            font-size="14" font-weight="600" fill="${COLORS.inkMuted}"
            letter-spacing="3" text-transform="uppercase">QURANIC REFLECTION</text>
    </g>

    <!-- Center gold rule -->
    <line x1="96" y1="220" x2="${W - 96}" y2="220" stroke="url(#goldRule)" stroke-width="1.2"/>

    <!-- Eyebrow -->
    <text x="96" y="280" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif"
          font-size="20" font-weight="700" fill="${accentColor}"
          letter-spacing="6" text-transform="uppercase">${esc(eyebrow)}</text>

    <!-- Title -->
    ${renderTitle(title)}

    <!-- Subtitle -->
    ${renderSubtitle(subtitle)}

    <!-- Decorative glyph (right side) -->
    <g transform="translate(${W - 280}, ${H / 2 - 40})" opacity="0.55">
      ${glyph ?? defaultGlyph(accentColor)}
    </g>

    <!-- Footer URL hint -->
    <text x="96" y="${H - 80}" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif"
          font-size="16" font-weight="600" fill="${COLORS.inkMuted}"
          letter-spacing="2.5">${esc(SITE_HOSTNAME)}</text>

    <!-- Footer accent -->
    <line x1="${W - 280}" y1="${H - 86}" x2="${W - 96}" y2="${H - 86}"
          stroke="${accentColor}" stroke-width="1" stroke-opacity="0.5"/>
  </svg>`;
}

function cornerOrnaments(color) {
  // Small calligraphic brackets in each corner of the inner frame.
  const c = color;
  return `
    <g stroke="${c}" stroke-width="1.4" fill="none" opacity="0.55">
      <!-- top-left -->
      <path d="M 80 80 Q 64 64, 96 60 M 80 80 Q 64 96, 60 96"/>
      <circle cx="68" cy="68" r="2" fill="${c}" stroke="none"/>
      <!-- top-right -->
      <path d="M ${W - 80} 80 Q ${W - 64} 64, ${W - 96} 60 M ${W - 80} 80 Q ${W - 64} 96, ${W - 60} 96"/>
      <circle cx="${W - 68}" cy="68" r="2" fill="${c}" stroke="none"/>
      <!-- bottom-left -->
      <path d="M 80 ${H - 80} Q 64 ${H - 64}, 96 ${H - 60} M 80 ${H - 80} Q 64 ${H - 96}, 60 ${H - 96}"/>
      <circle cx="68" cy="${H - 68}" r="2" fill="${c}" stroke="none"/>
      <!-- bottom-right -->
      <path d="M ${W - 80} ${H - 80} Q ${W - 64} ${H - 64}, ${W - 96} ${H - 60} M ${W - 80} ${H - 80} Q ${W - 64} ${H - 96}, ${W - 60} ${H - 96}"/>
      <circle cx="${W - 68}" cy="${H - 68}" r="2" fill="${c}" stroke="none"/>
    </g>
  `;
}

function brandMarkInline(size) {
  // Compact version (no double background) for header lockup.
  const s = size;
  return `<g transform="scale(${s / 64})">
    <circle cx="32" cy="32" r="30" fill="${COLORS.parchmentLight}" stroke="${COLORS.gold}" stroke-width="1.5" stroke-opacity="0.65"/>
    <circle cx="32" cy="32" r="25" fill="none" stroke="${COLORS.gold}" stroke-width="0.8" stroke-opacity="0.4"/>
    <path d="M 20 28 Q 24 24, 32 24 Q 40 24, 44 28" stroke="${COLORS.gold}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    <circle cx="27" cy="18" r="2.4" fill="${COLORS.gold}"/>
    <circle cx="37" cy="18" r="2.4" fill="${COLORS.gold}"/>
    <path d="M 22 36 Q 26 32, 32 32 Q 38 32, 42 36 Q 44 38, 44 41" stroke="${COLORS.gold}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    <path d="M 20 44 Q 32 48, 44 44" stroke="${COLORS.gold}" stroke-width="2.4" stroke-linecap="round" fill="none" opacity="0.6"/>
  </g>`;
}

function renderTitle(title) {
  // Wrap long titles onto a second line at the nearest space past 22 chars.
  const lines = wrap(title, 22);
  return lines
    .map(
      (ln, i) =>
        `<text x="96" y="${360 + i * 80}" font-family="ui-serif, 'Iowan Old Style', 'Apple Garamond', Georgia, serif" font-size="68" font-weight="600" fill="${COLORS.ink}">${esc(
          ln,
        )}</text>`,
    )
    .join("\n");
}

function renderSubtitle(subtitle) {
  if (!subtitle) return "";
  const lines = wrap(subtitle, 56);
  const baseY = 360 + (wrap("dummy long enough to stay one line", 22).length) * 80 + 60;
  return lines
    .map(
      (ln, i) =>
        `<text x="96" y="${baseY + i * 36}" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="26" font-weight="500" fill="${COLORS.inkSoft}">${esc(
          ln,
        )}</text>`,
    )
    .join("\n");
}

function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const out = [];
  let current = "";
  for (const w of words) {
    if ((current + " " + w).trim().length > maxChars) {
      if (current) out.push(current);
      current = w;
    } else {
      current = (current + " " + w).trim();
    }
  }
  if (current) out.push(current);
  return out.length ? out : [String(text)];
}

/* ─────────────────────────── Per-route glyphs ─────────────────────── */

function defaultGlyph(color) {
  // 8-point Islamic star.
  return `<g transform="translate(80, 80)">
    <g stroke="${color}" stroke-width="1.6" fill="none" opacity="0.85">
      <rect x="-72" y="-72" width="144" height="144" transform="rotate(0)"/>
      <rect x="-72" y="-72" width="144" height="144" transform="rotate(45)"/>
    </g>
    <circle cx="0" cy="0" r="6" fill="${color}" opacity="0.7"/>
  </g>`;
}

function bookGlyph(color) {
  return `<g transform="translate(0, -20)">
    <g stroke="${color}" stroke-width="1.8" fill="none" opacity="0.85" stroke-linecap="round">
      <path d="M 0 30 Q 80 0, 160 30 L 160 170 Q 80 140, 0 170 Z"/>
      <path d="M 80 15 L 80 155"/>
      <path d="M 30 60 Q 55 50, 75 60"/>
      <path d="M 30 90 Q 55 80, 75 90"/>
      <path d="M 30 120 Q 55 110, 75 120"/>
      <path d="M 85 60 Q 105 50, 130 60"/>
      <path d="M 85 90 Q 105 80, 130 90"/>
      <path d="M 85 120 Q 105 110, 130 120"/>
    </g>
  </g>`;
}

function searchGlyph(color) {
  return `<g transform="translate(20, 0)">
    <g stroke="${color}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.85">
      <circle cx="60" cy="60" r="48"/>
      <line x1="96" y1="96" x2="140" y2="140"/>
    </g>
    <circle cx="60" cy="60" r="6" fill="${color}" opacity="0.6"/>
  </g>`;
}

function libraryGlyph(color) {
  return `<g transform="translate(0, -20)">
    <g stroke="${color}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.85">
      <rect x="0" y="20" width="20" height="140" rx="3"/>
      <rect x="30" y="0" width="22" height="160" rx="3"/>
      <rect x="62" y="30" width="20" height="130" rx="3"/>
      <rect x="92" y="10" width="24" height="150" rx="3"/>
      <rect x="126" y="40" width="20" height="120" rx="3"/>
      <line x1="0" y1="160" x2="160" y2="160" stroke-width="2"/>
    </g>
  </g>`;
}

function goalsGlyph(color) {
  return `<g transform="translate(20, 0)">
    <g stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.85">
      <circle cx="80" cy="80" r="68"/>
      <circle cx="80" cy="80" r="46"/>
      <circle cx="80" cy="80" r="24"/>
      <line x1="80" y1="80" x2="160" y2="20"/>
    </g>
    <circle cx="80" cy="80" r="6" fill="${color}"/>
  </g>`;
}

function reflectionGlyph(color) {
  // Whirling-dervish-style spiral inside a circle.
  return `<g transform="translate(20, 0)">
    <g stroke="${color}" stroke-width="1.8" fill="none" opacity="0.85" stroke-linecap="round">
      <circle cx="80" cy="80" r="72"/>
      <path d="M 80 80
               m -50 0
               a 50 50 0 1 0 100 0
               a 40 40 0 1 1 -80 0
               a 30 30 0 1 0 60 0
               a 20 20 0 1 1 -40 0
               a 10 10 0 1 0 20 0"/>
    </g>
  </g>`;
}

function settingsGlyph(color) {
  // Compass / settings rosette.
  return `<g transform="translate(20, 0)">
    <g stroke="${color}" stroke-width="1.8" fill="none" opacity="0.85" stroke-linecap="round">
      <circle cx="80" cy="80" r="60"/>
      ${Array.from({ length: 12 })
        .map((_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const x1 = 80 + Math.cos(a) * 50;
          const y1 = 80 + Math.sin(a) * 50;
          const x2 = 80 + Math.cos(a) * 64;
          const y2 = 80 + Math.sin(a) * 64;
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
        })
        .join("")}
      <circle cx="80" cy="80" r="20"/>
    </g>
  </g>`;
}

function niyyahGlyph(color) {
  // Heart-as-vessel with rising flame (intention, niyyah).
  return `<g transform="translate(0, -10)">
    <g stroke="${color}" stroke-width="1.8" fill="none" opacity="0.85" stroke-linecap="round">
      <path d="M 80 160 Q 0 110, 35 60 Q 60 35, 80 70 Q 100 35, 125 60 Q 160 110, 80 160 Z"/>
      <path d="M 80 70 Q 70 50, 80 30 Q 90 50, 80 70"/>
      <circle cx="80" cy="100" r="6" fill="${color}" opacity="0.5"/>
    </g>
  </g>`;
}

function tadabburGlyph(color) {
  // 15-pointed mandala — references the 15-day reflection circle.
  return `<g transform="translate(20, 0)">
    <g stroke="${color}" stroke-width="1.4" fill="none" opacity="0.85">
      ${Array.from({ length: 15 })
        .map((_, i) => {
          const a = (i * 24 * Math.PI) / 180;
          const x = 80 + Math.cos(a) * 60;
          const y = 80 + Math.sin(a) * 60;
          return `<line x1="80" y1="80" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
        })
        .join("")}
      <circle cx="80" cy="80" r="60"/>
      <circle cx="80" cy="80" r="44"/>
      <circle cx="80" cy="80" r="28"/>
    </g>
    <circle cx="80" cy="80" r="6" fill="${color}"/>
  </g>`;
}

function certificateGlyph(color) {
  // Certificate seal / rosette.
  return `<g transform="translate(20, 0)">
    <g stroke="${color}" stroke-width="1.6" fill="none" opacity="0.85">
      <circle cx="80" cy="80" r="56"/>
      <circle cx="80" cy="80" r="40"/>
      ${Array.from({ length: 16 })
        .map((_, i) => {
          const a = (i * 22.5 * Math.PI) / 180;
          const x1 = 80 + Math.cos(a) * 56;
          const y1 = 80 + Math.sin(a) * 56;
          const x2 = 80 + Math.cos(a) * 70;
          const y2 = 80 + Math.sin(a) * 70;
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
        })
        .join("")}
      <path d="M 60 130 L 60 170 L 80 156 L 100 170 L 100 130" stroke-linejoin="round"/>
    </g>
    <text x="80" y="86" font-family="ui-serif, Georgia, serif" font-size="22" font-weight="700"
          fill="${color}" text-anchor="middle">✦</text>
  </g>`;
}

/* ─────────────────────────── Routes ──────────────────────────────── */

const ROUTES = [
  {
    slug: "default",
    eyebrow: "Tadabbur",
    title: "Your Quranic reflection companion",
    subtitle:
      "Read, search, and reflect on the Qur'an with a calm, manuscript-grade workspace.",
    glyph: defaultGlyph,
    accent: COLORS.gold,
  },
  {
    slug: "home",
    eyebrow: "Home",
    title: "A quiet place to meet the Qur'an",
    subtitle: "Verse of the day, reflections, and a steady rhythm of return.",
    glyph: defaultGlyph,
    accent: COLORS.gold,
  },
  {
    slug: "read",
    eyebrow: "Read",
    title: "Reader",
    subtitle: "Surahs, translations, and recitations in a focused mushaf view.",
    glyph: bookGlyph,
    accent: COLORS.forest,
  },
  {
    slug: "search",
    eyebrow: "Search",
    title: "Find verses by word or theme",
    subtitle: "Quran Foundation search across translations and the Arabic text.",
    glyph: searchGlyph,
    accent: COLORS.gold,
  },
  {
    slug: "library",
    eyebrow: "Library",
    title: "Bookmarks, notes, and collections",
    subtitle: "Your saved ayat and reflections, organised for return visits.",
    glyph: libraryGlyph,
    accent: COLORS.forest,
  },
  {
    slug: "goals",
    eyebrow: "Goals",
    title: "Daily reading goals",
    subtitle: "Plan a steady arc through the Qur'an and track your sessions.",
    glyph: goalsGlyph,
    accent: COLORS.gold,
  },
  {
    slug: "reflect",
    eyebrow: "Reflect",
    title: "Reflections from the community",
    subtitle: "Read tadabbur shared by others — and add your own.",
    glyph: reflectionGlyph,
    accent: COLORS.forest,
  },
  {
    slug: "settings",
    eyebrow: "Settings",
    title: "Translations, recitation, and theme",
    subtitle: "Tune Tadabbur to match how you read.",
    glyph: settingsGlyph,
    accent: COLORS.inkMuted,
  },
  {
    slug: "niyyah",
    eyebrow: "Niyyah",
    title: "A gift of light, shaped from your heart",
    subtitle:
      "Dedicate a Qur'anic journey for a loved one, the departed, or a personal milestone.",
    glyph: niyyahGlyph,
    accent: COLORS.gold,
  },
  {
    slug: "tadabbur",
    eyebrow: "The Tadabbur Circle",
    title: "15 Days. One Verse. Infinite Depth.",
    subtitle:
      "Join a global community in deep reflection on a single ayah at a time.",
    glyph: tadabburGlyph,
    accent: COLORS.forest,
  },
  {
    slug: "certificate",
    eyebrow: "Certificate",
    title: "Tadabbur Circle Completion",
    subtitle: "An authenticated record of your 15-day reflection journey.",
    glyph: certificateGlyph,
    accent: COLORS.gold,
  },
];

/* ─────────────────────────── Pipeline ──────────────────────────────── */

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeIcons() {
  // PNG renders at common sizes.
  const sizes = [16, 32, 48, 180, 192, 512];
  const renders = await Promise.all(
    sizes.map(async (size) => {
      const svg = brandMarkSvg({ size });
      const buf = await sharp(Buffer.from(svg))
        .resize(size, size)
        .png()
        .toBuffer();
      return { size, buf };
    }),
  );

  // favicon.ico (16/32/48)
  const ico = buildIco(renders.filter((r) => [16, 32, 48].includes(r.size)));
  await fs.writeFile(path.join(PUB, "favicon.ico"), ico);

  // Apple touch + PWA icons
  const writeOne = async (size, name) => {
    const r = renders.find((x) => x.size === size);
    if (!r) return;
    await fs.writeFile(path.join(PUB, name), r.buf);
  };
  await writeOne(180, "apple-icon.png");
  await writeOne(192, "icon-192.png");
  await writeOne(512, "icon-512.png");

  // SVG icon (Next will pick this up if placed in app/, but we also expose
  // it from /public for any external consumer).
  await fs.writeFile(path.join(PUB, "icon.svg"), brandMarkSvg({ size: 64 }));
}

async function writeOgImage(route) {
  const accent = route.accent ?? COLORS.gold;
  const glyph = (route.glyph ?? defaultGlyph)(accent);
  const svg = ogTemplateSvg({
    eyebrow: route.eyebrow,
    title: route.title,
    subtitle: route.subtitle,
    glyph,
    accent,
  });
  const out = path.join(OG_DIR, `${route.slug}.png`);
  await sharp(Buffer.from(svg)).png().toFile(out);
  return out;
}

async function main() {
  await ensureDir(PUB);
  await ensureDir(OG_DIR);

  console.log("→ Writing favicon + app icons…");
  await writeIcons();

  console.log(`→ Writing ${ROUTES.length} OG thumbnails…`);
  for (const route of ROUTES) {
    const out = await writeOgImage(route);
    console.log(`  ✓ ${path.relative(ROOT, out)}`);
  }

  // Also drop a copy of the favicon into the app/ dir so Next's
  // automatic file convention picks it up before our metadata config does.
  await fs.copyFile(
    path.join(PUB, "favicon.ico"),
    path.join(ROOT, "src", "app", "favicon.ico"),
  );

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
