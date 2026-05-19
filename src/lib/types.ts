export interface ListSlice<T> {
  error: string | null;
  gatingMessage: string | null;
  items: T[];
}

export interface FactItem {
  label: string;
  value: string;
}

export interface NoteItem {
  body: string;
  id: string | null;
  ranges: string[];
}

export interface BookmarkItem {
  id: string | null;
  readerUrl: string | null;
  type: string;
  verseKey: string;
}

export interface CollectionItem {
  id: string | null;
  name: string;
  updatedAt: string | null;
}

export interface FeedItem {
  authorName: string;
  body: string;
  commentsCount: number;
  id: string | null;
  likesCount: number;
  postTypeName?: string | null;
  publishedAt?: string | null;
  readerUrl: string | null;
  referenceLabel: string | null;
}

export interface SearchItem {
  label?: string;
  readerUrl: string | null;
  subtitle?: string | null;
  text?: string;
  verseKey?: string | null;
}

export interface ContentPreviewItem {
  id: number;
  nameArabic: string | null;
  nameSimple: string;
  readerUrl: string;
  translatedName: string | null;
  versesCount: number | null;
}

export interface ReaderVerse {
  arabicText: string;
  audioUrl?: string | null;
  id: string;
  translationText: string | null;
  transliterationText?: string | null;
  verseKey: string | null;
  verseNumber: number | null;
}

export interface HadithReferenceItem {
  id: number;
  collection: string;
  hadithNumber: string;
  ourHadithNumber: number | null;
  ayahStartNumber: number | null;
  ayahEndNumber: number | null;
}

export interface HadithNarrationItem {
  collection: string;
  hadithNumber: string;
  title: string | null;
  body: string;
  lang: string;
}

export interface HadithByAyahPayload {
  verseKey: string;
  error: string | null;
  references: HadithReferenceItem[];
  hadiths: HadithNarrationItem[];
}

export interface VerseReflectionsPayload {
  verseKey: string;
  error: string | null;
  posts: FeedItem[];
  needsSignIn: boolean;
}

export interface AyahTranslationItem {
  resourceId: number;
  resourceName: string;
  text: string;
}

export interface AyahTranslationsPayload {
  verseKey: string;
  error: string | null;
  translations: AyahTranslationItem[];
}

export interface AyahTafsirPayload {
  verseKey: string;
  error: string | null;
  resourceId: number | null;
  resourceName: string | null;
  text: string | null;
}

export interface ReaderPayload {
  chapter: {
    id: number;
    nameArabic: string | null;
    nameSimple: string;
    translatedName: string | null;
    versesCount: number | null;
  };
  translationIds: number[];
  verses: ReaderVerse[];
}

export interface BootstrapPayload {
  authError: string | null;
  bookmarks: ListSlice<BookmarkItem>;
  collections: ListSlice<CollectionItem>;
  contentPreview: {
    error: string | null;
    items: ContentPreviewItem[];
    previewReaderUrl: string;
  };
  flashNotice: {
    message: string;
    type: "error" | "success";
  } | null;
  grantedScopes: string[];
  idTokenSummary: Record<string, unknown> | null;
  isLoggedIn: boolean;
  notes: ListSlice<NoteItem>;
  quranReflect: {
    feed: ListSlice<FeedItem>;
    profile: {
      data: Record<string, unknown> | null;
      error: string | null;
      facts: FactItem[];
      gatingMessage: string | null;
    };
  };
  goals: {
    data: Record<string, unknown> | null;
    error: string | null;
    gatingMessage: string | null;
  };
  preferences: {
    data: Record<string, unknown> | null;
    error: string | null;
    gatingMessage: string | null;
  };
  sessionFacts: FactItem[];
  sessionStoreSummary: string;
  userInfo: {
    data: Record<string, unknown> | null;
    error: string | null;
    facts: FactItem[];
    gatingMessage: string | null;
  };
}
