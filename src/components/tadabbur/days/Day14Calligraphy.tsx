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
      angleType="practical"
      verseKey={verseKey}
      verseText={verseText}
      verseTranslation={verseTranslation}
      title="Practical Life Application"
      description="How can you practically apply the lessons of this verse in your daily life? Explore real-world scenarios, habits, and mindset shifts that bring this verse to life in your relationships, work, and worship."
    />
  );
}
