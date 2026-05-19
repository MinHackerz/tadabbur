import InsightShell from "@/components/InsightShell";

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  return <InsightShell chapterId={chapterId} route="reader" />;
}
