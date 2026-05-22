import { prisma } from "@/db";
import { PageContent } from "@/components/ui/primitives";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ogImage } from "@/lib/site";
import { getUserDisplayName } from "@/lib/auth-helpers";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  let verseKey: string | null = null;
  let userId: string | null = null;
  try {
    const cert = await prisma.tadabburCertificate.findUnique({
      where: { id },
      select: { verseKey: true, userId: true },
    });
    verseKey = cert?.verseKey ?? null;
    userId = cert?.userId ?? null;
  } catch {
    // Ignore — fall through to a generic certificate description.
  }
  const recipientName = userId ? await getUserDisplayName(userId) : null;
  const baseTitle = verseKey
    ? `Certificate of Tadabbur — Quran ${verseKey}`
    : "Certificate of Tadabbur";
  const title = recipientName ? `${recipientName} · ${baseTitle}` : baseTitle;
  const description = recipientName
    ? `${recipientName} has completed a verified 15-day deep reflection${verseKey ? ` on Quran ${verseKey}` : ""}.`
    : verseKey
      ? `Verified completion of a 15-day deep reflection on Quran ${verseKey}.`
      : "Verified completion of a 15-day deep Quranic reflection journey.";
  return {
    title: baseTitle,
    description,
    robots: { index: false, follow: false }, // Per-cert pages are private artifacts.
    openGraph: {
      title: `${title} — Tadabbur`,
      description,
      images: [ogImage("certificate", title)],
    },
    twitter: {
      title: `${title} — Tadabbur`,
      description,
      images: [ogImage("certificate", title)],
    },
  };
}

export default async function CertificateVerificationPage({ params }: Props) {
  const { id } = await params;

  let certificate: any = null;

  try {
    certificate = await prisma.tadabburCertificate.findUnique({
      where: { id },
      include: {
        progress: {
          include: {
            circle: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[Certificate Verify] Database error:", error);
  }

  if (!certificate) {
    notFound();
  }

  // Resolve the certified recipient's name from the users table. This must
  // appear prominently on the verification page — it's the whole point of
  // certifying _someone_, not just a verse-and-date receipt.
  const recipientName = await getUserDisplayName(certificate.userId);

  const formattedDate = certificate.completedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <PageContent>
      <div className="max-w-4xl mx-auto py-12">
        {/* Verification Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <h1 className="text-[28px] font-bold text-ink mb-2">
            Certificate Verified ✓
          </h1>
          <p className="text-[14px] text-ink-secondary">
            This is an authentic Tadabbur completion certificate
          </p>
        </div>

        {/* Awarded To — recipient hero block */}
        <div className="relative overflow-hidden rounded-2xl border border-warm/30 bg-gradient-to-br from-warm-subtle/60 to-surface px-8 py-10 text-center mb-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-warm m-0">
            Awarded to
          </p>
          <h2 className="font-[var(--font-decorative)] text-[34px] sm:text-[40px] leading-tight text-ink mt-3 mb-3 break-words">
            {recipientName}
          </h2>
          <p className="text-[14px] text-ink-secondary max-w-xl mx-auto m-0">
            for the verified completion of a 15-day Tadabbur reflection on{" "}
            <span className="font-semibold text-accent">
              Quran {certificate.verseKey}
            </span>
            .
          </p>
        </div>

        {/* Certificate Details */}
        <div className="bg-surface border border-border rounded-2xl p-8 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <div className="text-[12px] text-ink-tertiary uppercase tracking-wider font-semibold mb-2">
                Recipient
              </div>
              <div className="text-[18px] text-ink font-semibold">
                {recipientName}
              </div>
            </div>

            <div>
              <div className="text-[12px] text-ink-tertiary uppercase tracking-wider font-semibold mb-2">
                Certificate ID
              </div>
              <div className="font-mono text-[13px] text-ink bg-surface-secondary px-3 py-2 rounded break-all">
                {certificate.id}
              </div>
            </div>

            <div>
              <div className="text-[12px] text-ink-tertiary uppercase tracking-wider font-semibold mb-2">
                Completion Date
              </div>
              <div className="text-[15px] text-ink font-semibold">
                {formattedDate}
              </div>
            </div>

            <div>
              <div className="text-[12px] text-ink-tertiary uppercase tracking-wider font-semibold mb-2">
                Verse Studied
              </div>
              <div className="text-[18px] text-accent font-bold">
                Quran {certificate.verseKey}
              </div>
            </div>

            <div>
              <div className="text-[12px] text-ink-tertiary uppercase tracking-wider font-semibold mb-2">
                Journey Duration
              </div>
              <div className="text-[15px] text-ink font-semibold">
                15 Days
              </div>
            </div>
          </div>
        </div>

        {/* Journey Details */}
        <div className="bg-accent-subtle border border-accent/20 rounded-2xl p-8 mb-6">
          <h2 className="text-[20px] font-bold text-ink mb-4">
            Journey Completed
          </h2>
          <p className="text-[14px] text-ink-secondary mb-6">
            <span className="font-semibold text-ink">{recipientName}</span>{" "}
            successfully completed a comprehensive 15-day deep study of Quran
            verse {certificate.verseKey}, exploring it through multiple
            dimensions:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px] text-ink-secondary">
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Recitation &amp; Deep Listening
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Multiple Translations
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Word-by-Word Analysis
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Circumstances of Revelation
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Companion Stories
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Classical Tafsir
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Personal Reflection
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Natural World Parallels
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Similar Verses
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Personal Supplication
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Historical Context
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Contemporary Scholars
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Holistic Integration
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Practical Life Application
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Madhab Applications
            </div>
          </div>
        </div>

        {/* Authenticity Notice */}
        <div className="bg-warm/5 border border-warm/20 rounded-xl p-6 text-center">
          <div className="text-[20px] mb-3">🔒</div>
          <h3 className="text-[15px] font-semibold text-ink mb-2">
            Authenticity Guaranteed
          </h3>
          <p className="text-[13px] text-ink-secondary">
            This certificate is stored in our secure database and can be verified at any time using the certificate ID above.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/tadabbur"
            className="px-6 py-3 bg-accent text-white rounded-xl font-semibold text-[14px] hover:bg-accent-hover transition-all shadow-sm"
          >
            Start Your Journey
          </Link>
        </div>
      </div>
    </PageContent>
  );
}
