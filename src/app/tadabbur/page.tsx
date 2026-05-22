import InsightShell from "@/components/InsightShell";
import { ogImage } from "@/lib/site";

export const metadata = {
  title: "The Tadabbur Circle",
  description:
    "15 Days. One Verse. Infinite Depth. Join the global community in deep Quranic reflection.",
  openGraph: {
    title: "The Tadabbur Circle — Tadabbur",
    description:
      "15 Days. One Verse. Infinite Depth. Join the global community in deep Quranic reflection.",
    images: [ogImage("tadabbur", "The Tadabbur Circle — 15 Days. One Verse. Infinite Depth.")],
  },
  twitter: {
    title: "The Tadabbur Circle — Tadabbur",
    description:
      "15 Days. One Verse. Infinite Depth. Join the global community in deep Quranic reflection.",
    images: [ogImage("tadabbur", "The Tadabbur Circle — 15 Days. One Verse. Infinite Depth.")],
  },
};

export default function TadabburRoute() {
  return <InsightShell route="tadabbur" />;
}
