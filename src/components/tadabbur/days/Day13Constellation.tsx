"use client";

import ChatGPTContent from "./ChatGPTContent";

interface Props {
  circleId: string;
  verseKey: string;
  verseText: string;
  verseTranslation: string;
}

export default function Day13Constellation({ circleId, verseKey, verseText, verseTranslation }: Props) {
  return (
    <ChatGPTContent
      circleId={circleId}
      day={13}
      angleType="constellation"
      verseKey={verseKey}
      verseText={verseText}
      verseTranslation={verseTranslation}
      title="Week 2 Constellation"
      description="Look back at all the angles you've explored so far. What patterns emerge? What connections do you see? This is your moment to integrate the journey."
    />
  );
}
