import InsightShell from "@/components/InsightShell";
import { ogImage } from "@/lib/site";

export const metadata = {
  title: "Library",
  description: "Your saved bookmarks, notes, and collections — organised for return visits.",
  openGraph: {
    title: "Library — Tadabbur",
    description: "Bookmarks, notes, and collections you've saved while reading.",
    images: [ogImage("library", "Tadabbur — Library")],
  },
  twitter: {
    title: "Library — Tadabbur",
    description: "Bookmarks, notes, and collections you've saved while reading.",
    images: [ogImage("library", "Tadabbur — Library")],
  },
};

export default function LibraryPage() {
  return <InsightShell route="library" />;
}
