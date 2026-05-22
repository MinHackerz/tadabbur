import InsightShell from "@/components/InsightShell";
import { ogImage } from "@/lib/site";

export const metadata = {
  title: "Settings",
  description: "Translations, recitation, and theme — tune Tadabbur to match how you read.",
  openGraph: {
    title: "Settings — Tadabbur",
    description: "Translations, recitation, and theme preferences.",
    images: [ogImage("settings", "Tadabbur — Settings")],
  },
  twitter: {
    title: "Settings — Tadabbur",
    description: "Translations, recitation, and theme preferences.",
    images: [ogImage("settings", "Tadabbur — Settings")],
  },
};

export default function SettingsPage() {
  return <InsightShell route="settings" />;
}
