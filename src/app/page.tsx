import InsightShell from "@/components/InsightShell";
import { ogImage } from "@/lib/site";

export const metadata = {
  title: "Home",
  description:
    "A quiet place to meet the Qur'an — verse of the day, reflections, and a steady rhythm of return.",
  openGraph: {
    title: "Home — Tadabbur",
    description:
      "A quiet place to meet the Qur'an — verse of the day, reflections, and a steady rhythm of return.",
    images: [ogImage("home", "Tadabbur — Home")],
  },
  twitter: {
    title: "Home — Tadabbur",
    description:
      "A quiet place to meet the Qur'an — verse of the day, reflections, and a steady rhythm of return.",
    images: [ogImage("home", "Tadabbur — Home")],
  },
};

export default function HomePage() {
  return <InsightShell route="home" />;
}
