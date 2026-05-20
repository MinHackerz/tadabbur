"use client";

import ChatGPTContent from "./ChatGPTContent";

interface Props {
  circleId: string;
  verseKey: string;
  verseText: string;
  verseTranslation: string;
}

export default function Day4Revelation({ circleId, verseKey, verseText, verseTranslation }: Props) {
  return (
    <ChatGPTContent
      circleId={circleId}
      day={4}
      angleType="revelation"
      verseKey={verseKey}
      verseText={verseText}
      verseTranslation={verseTranslation}
      title="Why It Was Revealed"
      description="Understanding the circumstances of revelation (Asbab al-Nuzul) illuminates the verse's timeless wisdom. Discover the historical context that brought these divine words to the Prophet ﷺ."
    />
  );
}
