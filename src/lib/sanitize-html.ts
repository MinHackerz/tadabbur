/**
 * Tiny allowlist HTML sanitizer for upstream tafsir/translation snippets.
 *
 * The Qur'an Foundation content APIs occasionally return short HTML fragments
 * containing footnote markers and emphasis. We render them via
 * `dangerouslySetInnerHTML`, so we strip everything except a small, safe
 * subset of inline formatting tags. No script, style, on*-handlers, or
 * external attributes are preserved.
 *
 * This is intentionally conservative — it's not a general-purpose sanitizer.
 * If we ever need richer HTML support, replace this with `sanitize-html` or
 * DOMPurify behind a server-only import.
 */

// Tags we keep, with attributes we keep on each (none = strip all attrs).
const ALLOWED_TAGS: Record<string, ReadonlyArray<string>> = {
  b: [],
  strong: [],
  i: [],
  em: [],
  u: [],
  sup: [],
  sub: [],
  br: [],
  p: [],
  span: [],
  // Footnote anchors that some tafsir feeds use. We strip all attributes so
  // any href/onclick is dropped; the visible text remains.
  a: [],
};

const VOID_ELEMENTS = new Set(["br"]);

const TAG_RE = /<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;

export function sanitizeTafsirHtml(input: unknown): string {
  if (typeof input !== "string" || !input) return "";

  // Strip script/style blocks completely (including content) before tag walk.
  const stripped = input
    .replace(/<\s*script\b[^<]*(?:(?!<\/\s*script\s*>)<[^<]*)*<\/\s*script\s*>/gi, "")
    .replace(/<\s*style\b[^<]*(?:(?!<\/\s*style\s*>)<[^<]*)*<\/\s*style\s*>/gi, "");

  return stripped.replace(TAG_RE, (match, rawName: string) => {
    const name = rawName.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_TAGS, name)) {
      // Drop disallowed tags; their text content remains.
      return "";
    }
    // Closing tag.
    if (/^<\s*\//.test(match)) {
      return VOID_ELEMENTS.has(name) ? "" : `</${name}>`;
    }
    // Opening (and possibly self-closing) tag with attributes stripped.
    return VOID_ELEMENTS.has(name) ? `<${name} />` : `<${name}>`;
  });
}
