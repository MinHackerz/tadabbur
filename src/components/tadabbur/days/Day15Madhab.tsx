"use client";

import ChatGPTContent from "./ChatGPTContent";

interface Props {
  circleId: string;
  verseKey: string;
  verseText: string;
  verseTranslation: string;
}

export default function Day15Madhab({ circleId, verseKey, verseText, verseTranslation }: Props) {
  return (
    <ChatGPTContent
      circleId={circleId}
      day={15}
      angleType="madhab"
      verseKey={verseKey}
      verseText={verseText}
      verseTranslation={verseTranslation}
      title="Madhab Applications"
      description="How have the different schools of Islamic law (Hanafi, Maliki, Shafi'i, Hanbali) applied this verse in their rulings? Explore the rich diversity of Islamic jurisprudence."
    />
  );
}
