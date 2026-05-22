import InsightShell from "@/components/InsightShell";
import type { Metadata } from "next";
import { SURAHS } from "@/lib/niyyah";
import { ogImage } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}): Promise<Metadata> {
  const { chapterId } = await params;
  const id = Number(chapterId);
  const surah = SURAHS.find((s) => s.id === id);
  const titleBase = surah
    ? `Surah ${surah.nameSimple} (${id})`
    : `Surah ${chapterId}`;
  const description = surah
    ? `Read ${surah.nameSimple} — ${surah.versesCount} verses, ${surah.revelation}. Translations and recitation in a focused mushaf view.`
    : "Read the Qur'an with translations and recitation in a focused mushaf view.";
  return {
    title: titleBase,
    description,
    openGraph: {
      title: `${titleBase} — Tadabbur`,
      description,
      images: [ogImage("read", `Tadabbur Reader — ${titleBase}`)],
    },
    twitter: {
      title: `${titleBase} — Tadabbur`,
      description,
      images: [ogImage("read", `Tadabbur Reader — ${titleBase}`)],
    },
  };
}

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  return <InsightShell chapterId={chapterId} route="reader" />;
}
