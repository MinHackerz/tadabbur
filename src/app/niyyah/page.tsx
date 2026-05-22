import InsightShell from "@/components/InsightShell";
import { ogImage } from "@/lib/site";

export const metadata = {
  title: "Niyyah — A Gift of Light",
  description:
    "Dedicate a Qur'anic journey for a loved one, the departed, or a personal milestone.",
  openGraph: {
    title: "Niyyah — Tadabbur",
    description:
      "A gift of light, shaped from your heart. Dedicate a Qur'anic journey to someone you love.",
    images: [ogImage("niyyah", "Tadabbur — Niyyah Gift Journey")],
  },
  twitter: {
    title: "Niyyah — Tadabbur",
    description:
      "A gift of light, shaped from your heart. Dedicate a Qur'anic journey to someone you love.",
    images: [ogImage("niyyah", "Tadabbur — Niyyah Gift Journey")],
  },
};

export default function NiyyahPage() {
  return <InsightShell route="niyyah" />;
}
