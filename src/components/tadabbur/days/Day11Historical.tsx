"use client";

import ChatGPTContent from "./ChatGPTContent";

interface Props {
  circleId: string;
  verseKey: string;
  verseText: string;
  verseTranslation: string;
}

export default function Day11Historical({ circleId, verseKey, verseText, verseTranslation }: Props) {
  return (
    <ChatGPTContent
      circleId={circleId}
      day={11}
      angleType="historical"
      verseKey={verseKey}
      verseText={verseText}
      verseTranslation={verseTranslation}
      title="Historical Context"
      description="What was happening in Makkah or Madinah when this verse descended? Understand the 7th century Arabian context and how this verse addressed that pivotal moment in history."
    />
  );
}
