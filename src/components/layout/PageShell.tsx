"use client";
import Navbar, { type ActiveRoute } from "./Navbar";

export default function PageShell({
  active,
  loggedIn,
  userName,
  title,
  subtitle,
  variant = "default",
  readerChapterId,
  children,
}: {
  active: ActiveRoute;
  loggedIn: boolean;
  userName?: string | null;
  title?: string;
  subtitle?: string;
  variant?: "default" | "reader" | "home" | "feature";
  readerChapterId?: string;
  children: React.ReactNode;
}) {
  const isReader = variant === "reader";
  const isHome = variant === "home";
  const isFeature = variant === "feature";
  const minimalChrome = isReader || isHome || isFeature;

  return (
    <div className={`min-h-screen pt-14 ${isReader ? "pb-28 md:pb-24" : "pb-16 md:pb-0"}`}>
      <Navbar active={active} loggedIn={loggedIn} userName={userName} readerChapterId={readerChapterId} />
      <main
        className={`mx-auto w-full ${
          isReader
            ? "max-w-[80rem] px-6 sm:px-10 lg:px-14 py-6 md:py-10"
            : isHome
              ? "max-w-[80rem] px-6 sm:px-10 lg:px-14 py-6 md:py-10"
              : isFeature
                ? "max-w-7xl px-5 sm:px-8 lg:px-10 py-8 md:py-12"
                : "max-w-7xl px-5 sm:px-8 lg:px-10 py-8 md:py-10"
        }`}
        style={{ animation: "fade-in .25s ease both" }}
      >
        {!minimalChrome && title && (
          <h1 className="text-xl font-semibold text-ink tracking-[-0.01em] mb-1">{title}</h1>
        )}
        {!minimalChrome && subtitle && (
          <p className="text-sm text-ink-secondary mb-6">{subtitle}</p>
        )}
        {children}
      </main>
    </div>
  );
}
