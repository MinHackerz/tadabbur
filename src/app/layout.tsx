import type { Metadata } from "next";
import {
  Amiri,
  Cormorant_Garamond,
  Noto_Naskh_Arabic,
  Plus_Jakarta_Sans,
  Space_Mono,
} from "next/font/google";

import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const arabicFont = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  weight: ["400", "500", "600", "700"],
});

const decorativeArabicFont = Amiri({
  subsets: ["arabic", "latin"],
  variable: "--font-amiri",
  weight: ["400", "700"],
});

const monoFont = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

const niyyahDisplayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-niyyah-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Tadabbur — Your Quranic Reflection Companion",
  description:
    "A premium Quran study workspace with reading, search, reflections, and personal goals — powered by the Quran Foundation SDK.",
  keywords: ["quran", "islam", "study", "reader", "reflection", "quran foundation"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${arabicFont.variable} ${decorativeArabicFont.variable} ${monoFont.variable} ${niyyahDisplayFont.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
