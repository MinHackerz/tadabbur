/**
 * Centralised site/SEO config used by route-level metadata.
 *
 * Every page that wants a unique social-card thumbnail builds its
 * `metadata.openGraph.images` and `metadata.twitter.images` entries from
 * this map. Falls back to /og/default.png.
 *
 * The site URL is read from `NEXT_PUBLIC_SITE_URL` so deployments can
 * override it; locally it defaults to the dev host. Without a real URL,
 * Next still renders the OG image as an absolute path which most crawlers
 * resolve against the page's origin.
 */

export const SITE_NAME = "Tadabbur";
export const SITE_TAGLINE = "Your Quranic Reflection Companion";
export const SITE_DESCRIPTION =
  "A premium Quran study workspace with reading, search, reflections, and personal goals — powered by the Quran Foundation SDK.";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://tadabbur-iota.vercel.app";

/** Hostname shown in OG thumbnails. Always derived from SITE_URL so the
 *  generated images stay in sync with whatever deployment is current. */
export const SITE_HOSTNAME = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "tadabbur-iota.vercel.app";
  }
})();

/** Per-route OG image slugs (matching files in /public/og/<slug>.png). */
export type OgSlug =
  | "default"
  | "home"
  | "read"
  | "search"
  | "library"
  | "goals"
  | "reflect"
  | "settings"
  | "niyyah"
  | "tadabbur"
  | "certificate";

const OG_DIMENSIONS = { width: 1200, height: 630 } as const;

/**
 * Returns OG/Twitter image config for the given slug, suitable for
 * `metadata.openGraph.images` and `metadata.twitter.images`.
 */
export function ogImage(slug: OgSlug, alt: string) {
  return {
    url: `/og/${slug}.png`,
    width: OG_DIMENSIONS.width,
    height: OG_DIMENSIONS.height,
    alt,
  };
}
