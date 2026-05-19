type JsonObject = Record<string, unknown>;

const asObject = (value: unknown): JsonObject => {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as JsonObject;
};

const toArray = (value: unknown, keys: string[] = []): JsonObject[] => {
  if (Array.isArray(value)) {
    return value.map(asObject);
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  for (const key of keys) {
    const nested = (value as Record<string, unknown>)[key];
    if (Array.isArray(nested)) {
      return nested.map(asObject);
    }
  }
  return [];
};

/** Whether a Quran Reflect post references the given chapter:verse (or range including it). */
export const postMatchesVerse = (post: unknown, verseKey: string): boolean => {
  const [chapterStr, verseStr] = verseKey.split(":");
  const chapter = Number(chapterStr);
  const verse = Number(verseStr);
  if (!Number.isFinite(chapter) || !Number.isFinite(verse)) {
    return false;
  }

  const refs = toArray(asObject(post).references, []);
  return refs.some((ref) => {
    const r = asObject(ref);
    const cid = Number(r.chapterId ?? r.chapter_id);
    const from = Number(r.from ?? r.from_verse ?? r.fromVerse);
    const toRaw = r.to ?? r.to_verse ?? r.toVerse;
    const to = toRaw === undefined || toRaw === null ? from : Number(toRaw);
    if (!Number.isFinite(cid) || !Number.isFinite(from)) {
      return false;
    }
    const toVal = Number.isFinite(to) ? to : from;
    return cid === chapter && from <= verse && toVal >= verse;
  });
};
