/**
 * Reusable Islamic-flavored ornaments. Pure SVG, no images.
 * Used across the Niyyah feature for headers, dividers, and card corners.
 */

interface DividerProps {
  /** Width of each gold line on either side of the central glyph. */
  lineWidth?: "sm" | "md" | "lg";
  /** Choose the central ornament. */
  glyph?: "star" | "diamond" | "trefoil";
  className?: string;
}

export function OrnamentDivider({
  lineWidth = "md",
  glyph = "star",
  className = "",
}: DividerProps) {
  const widthClass =
    lineWidth === "sm" ? "max-w-12" : lineWidth === "lg" ? "max-w-32" : "max-w-20";

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden>
      <span
        className={`flex-1 h-px ${widthClass} bg-gradient-to-r from-transparent via-ny-gold/50 to-ny-gold/40`}
      />
      <CenterGlyph variant={glyph} />
      <span
        className={`flex-1 h-px ${widthClass} bg-gradient-to-l from-transparent via-ny-gold/50 to-ny-gold/40`}
      />
    </div>
  );
}

function CenterGlyph({ variant }: { variant: "star" | "diamond" | "trefoil" }) {
  if (variant === "diamond") {
    return (
      <svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        className="text-ny-gold flex-shrink-0"
        aria-hidden
      >
        <path
          d="M12 2 L22 12 L12 22 L2 12 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
        />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
      </svg>
    );
  }
  if (variant === "trefoil") {
    return (
      <svg
        width={18}
        height={18}
        viewBox="0 0 32 32"
        className="text-ny-gold flex-shrink-0"
        aria-hidden
      >
        <g fill="none" stroke="currentColor" strokeWidth={1.2}>
          <circle cx="16" cy="9" r="4" />
          <circle cx="9" cy="20" r="4" />
          <circle cx="23" cy="20" r="4" />
          <circle cx="16" cy="16" r="1.4" fill="currentColor" />
        </g>
      </svg>
    );
  }
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      className="text-ny-gold flex-shrink-0"
      aria-hidden
    >
      <g fill="none" stroke="currentColor" strokeWidth={1.2}>
        <path d="M12 2 L14 8 L20 9 L15 14 L17 20 L12 17 L7 20 L9 14 L4 9 L10 8 Z" />
      </g>
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
    </svg>
  );
}

/**
 * Decorative gold corner brackets — render as four corners on a positioned
 * container. Apply on a container with `relative`.
 */
export function GoldCorners({ inset = "0.6rem" }: { inset?: string }) {
  const size = 18;
  const stroke = 1.4;
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute text-ny-gold"
        style={{ top: inset, left: inset }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path
            d="M2 10 L2 2 L10 2"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute text-ny-gold"
        style={{ top: inset, right: inset }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path
            d="M22 10 L22 2 L14 2"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute text-ny-gold"
        style={{ bottom: inset, left: inset }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path
            d="M2 14 L2 22 L10 22"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute text-ny-gold"
        style={{ bottom: inset, right: inset }}
      >
        <svg width={size} height={size} viewBox="0 0 24 24">
          <path
            d="M22 14 L22 22 L14 22"
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </svg>
      </span>
    </>
  );
}

/**
 * Mihrab-style arched header — a soft Islamic arch you can place above
 * a section. Use as a stand-alone block; centered.
 */
export function MihrabFrame({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative w-full max-w-md mx-auto ${className}`}>
      <svg
        width="100%"
        height="20"
        viewBox="0 0 200 20"
        preserveAspectRatio="none"
        aria-hidden
        className="block text-ny-gold"
      >
        <path
          d="M0 20 Q 0 0, 14 0 L 86 0 Q 100 0, 100 -14 Q 100 0, 114 0 L 186 0 Q 200 0, 200 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.55"
        />
      </svg>
      <div className="text-center">{children}</div>
    </div>
  );
}
