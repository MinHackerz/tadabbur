import InsightShell from "@/components/InsightShell";
import { ogImage } from "@/lib/site";

export const metadata = {
  title: "Goals",
  description: "Plan a steady arc through the Qur'an and track your daily reading sessions.",
  openGraph: {
    title: "Goals — Tadabbur",
    description: "Daily reading goals and progress tracking, designed for sustainable rhythm.",
    images: [ogImage("goals", "Tadabbur — Goals")],
  },
  twitter: {
    title: "Goals — Tadabbur",
    description: "Daily reading goals and progress tracking, designed for sustainable rhythm.",
    images: [ogImage("goals", "Tadabbur — Goals")],
  },
};

export default function GoalsPage() {
  return <InsightShell route="goals" />;
}
