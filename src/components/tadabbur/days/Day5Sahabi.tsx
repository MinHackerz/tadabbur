"use client";

import ChatGPTContent from "./ChatGPTContent";

interface Props {
  circleId: string;
  verseKey: string;
  verseText: string;
  verseTranslation: string;
}

export default function Day5Sahabi({ circleId, verseKey, verseText, verseTranslation }: Props) {
  return (
    <ChatGPTContent
      circleId={circleId}
      day={5}
      angleType="sahabi"
      verseKey={verseKey}
      verseText={verseText}
      verseTranslation={verseTranslation}
      title="A Companion's Story"
      description="How did the companions of the Prophet ﷺ live this verse? Their lives are our living tafsir. Explore stories of the Sahaba who embodied these divine teachings."
    />
  );
}
