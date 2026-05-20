"use client";

import ChatGPTContent from "./ChatGPTContent";

interface Props {
  circleId: string;
  verseKey: string;
  verseText: string;
  verseTranslation: string;
}

export default function Day12Scholar({ circleId, verseKey, verseText, verseTranslation }: Props) {
  return (
    <ChatGPTContent
      circleId={circleId}
      day={12}
      angleType="scholar"
      verseKey={verseKey}
      verseText={verseText}
      verseTranslation={verseTranslation}
      title="A Scholar Today"
      description="Contemporary scholars bring fresh perspectives to timeless wisdom. Discover how modern Islamic thinkers apply this verse to today's challenges and opportunities."
    />
  );
}
