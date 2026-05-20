"use client";

import ChatGPTContent from "./ChatGPTContent";

interface Props {
  circleId: string;
  verseKey: string;
  verseText: string;
  verseTranslation: string;
}

export default function Day8Natural({ circleId, verseKey, verseText, verseTranslation }: Props) {
  return (
    <ChatGPTContent
      circleId={circleId}
      day={8}
      angleType="natural"
      verseKey={verseKey}
      verseText={verseText}
      verseTranslation={verseTranslation}
      title="Natural World"
      description="The Quran constantly points to nature as evidence of divine wisdom. Explore what natural phenomena or scientific principles echo this verse's message."
    />
  );
}
