"use client";

import ChatGPTContent from "./ChatGPTContent";

interface Props {
  circleId: string;
  verseKey: string;
  verseText: string;
  verseTranslation: string;
}

export default function Day14Calligraphy({ circleId, verseKey, verseText, verseTranslation }: Props) {
  return (
    <ChatGPTContent
      circleId={circleId}
      day={14}
      angleType="calligraphy"
      verseKey={verseKey}
      verseText={verseText}
      verseTranslation={verseTranslation}
      title="Calligraphy Tradition"
      description="For centuries, Muslim artists have rendered this verse in breathtaking calligraphy across mosques, manuscripts, and art. Beauty is a form of understanding."
    />
  );
}
