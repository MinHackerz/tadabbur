import InsightShell from "@/components/InsightShell";
import { ogImage } from "@/lib/site";

export const metadata = {
  title: "Search",
  description:
    "Search the Qur'an by word, theme, or phrase across translations and the Arabic text.",
  openGraph: {
    title: "Search — Tadabbur",
    description:
      "Find verses by word or theme. Quran Foundation search across translations and Arabic.",
    images: [ogImage("search", "Tadabbur — Search")],
  },
  twitter: {
    title: "Search — Tadabbur",
    description:
      "Find verses by word or theme. Quran Foundation search across translations and Arabic.",
    images: [ogImage("search", "Tadabbur — Search")],
  },
};

export default function SearchPage() {
  return <InsightShell route="search" />;
}
