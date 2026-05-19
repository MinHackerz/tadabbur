/* Inline Islamic-flavored decorative SVGs. No external icon libs. */
import type { JourneyType } from "@/lib/niyyah";

export function EightStar({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      >
        <rect x="11" y="11" width="42" height="42" transform="rotate(45 32 32)" />
        <rect x="11" y="11" width="42" height="42" />
      </g>
    </svg>
  );
}

export function Crescent({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export function FlowerBloom({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <g fill="currentColor" opacity="0.85">
        <circle cx="16" cy="6" r="3.2" />
        <circle cx="26" cy="16" r="3.2" />
        <circle cx="16" cy="26" r="3.2" />
        <circle cx="6" cy="16" r="3.2" />
        <circle cx="22.5" cy="9.5" r="2.6" opacity="0.65" />
        <circle cx="22.5" cy="22.5" r="2.6" opacity="0.65" />
        <circle cx="9.5" cy="22.5" r="2.6" opacity="0.65" />
        <circle cx="9.5" cy="9.5" r="2.6" opacity="0.65" />
        <circle cx="16" cy="16" r="3" />
      </g>
    </svg>
  );
}

export function CandleFlame({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2c2 3 5 5 5 9a5 5 0 1 1-10 0c0-2.2 1.4-3.6 2.8-5C11 4.6 11.6 3.5 12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Lantern({ filledPct = 0 }: { filledPct: number }) {
  // Lantern body is fixed; an inner mask reveals warm light from bottom up.
  const clamped = Math.max(0, Math.min(100, filledPct));
  const innerHeight = 110;
  const fillH = (innerHeight * clamped) / 100;
  return (
    <svg viewBox="0 0 140 200" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id="ny-glow" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0%" stopColor="#E8D5A3" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#C9A84C" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFF6D6" stopOpacity="1" />
        </linearGradient>
        <radialGradient id="ny-aura" cx="50%" cy="60%" r="55%">
          <stop offset="0%" stopColor="#FFE9A8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFE9A8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* aura behind lantern when lit */}
      {clamped > 0 && (
        <circle cx="70" cy="100" r="78" fill="url(#ny-aura)" />
      )}

      {/* top finial */}
      <path
        d="M70 8 L70 22"
        stroke="#1C3A2F"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M52 24 H88 L82 32 H58 Z"
        fill="#1C3A2F"
        opacity="0.92"
      />

      {/* lantern frame */}
      <path
        d="M44 36 H96 L90 50 V158 L96 172 H44 L50 158 V50 Z"
        fill="#2C3B33"
        opacity="0.18"
      />
      <path
        d="M44 36 H96 L90 50 V158 L96 172 H44 L50 158 V50 Z"
        fill="none"
        stroke="#1C3A2F"
        strokeWidth="2"
      />

      {/* glass — filled from bottom */}
      <rect
        x="50"
        y={50 + (innerHeight - fillH)}
        width="40"
        height={fillH}
        fill="url(#ny-glow)"
        rx="3"
      />

      {/* glass outline */}
      <rect x="50" y="50" width="40" height={innerHeight} fill="none" stroke="#1C3A2F" strokeWidth="1.5" rx="3" />

      {/* mashrabiya cross-hatch */}
      <g stroke="#1C3A2F" strokeWidth="0.6" opacity="0.25">
        <line x1="50" y1="80" x2="90" y2="80" />
        <line x1="50" y1="110" x2="90" y2="110" />
        <line x1="50" y1="140" x2="90" y2="140" />
        <line x1="60" y1="50" x2="60" y2="160" />
        <line x1="70" y1="50" x2="70" y2="160" />
        <line x1="80" y1="50" x2="80" y2="160" />
      </g>

      {/* base */}
      <path
        d="M40 172 H100 L94 188 H46 Z"
        fill="#1C3A2F"
      />

      {/* tiny flame */}
      {clamped > 0 && (
        <g className="ny-flame">
          <path
            d="M70 60 c3 5 6 7 6 12 a6 6 0 0 1 -12 0 c0-3 2-5 3.5-7 c1-1.4 1.5-3 2.5-5z"
            fill="#FFE08A"
          />
        </g>
      )}
    </svg>
  );
}

export function MashrabiyaPattern() {
  return (
    <svg
      className="ny-pattern"
      width="120"
      height="120"
      viewBox="0 0 120 120"
      aria-hidden="true"
    >
      <defs>
        <pattern id="ny-mash" width="60" height="60" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M30 0 L60 30 L30 60 L0 30 Z" />
            <path d="M30 12 L48 30 L30 48 L12 30 Z" />
            <circle cx="30" cy="30" r="3" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ny-mash)" />
    </svg>
  );
}

export function JourneyTypeIcon({ type, size = 26 }: { type: JourneyType; size?: number }) {
  if (type === "departed") return <CandleFlame size={size} />;
  if (type === "personal") return <Crescent size={size} />;
  return <FlowerBloom size={size} />;
}

export function ArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 12h15m0 0-6.75-6.75M19.5 12l-6.75 6.75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
