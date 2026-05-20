import { prisma } from "@/db";
import { PageContent } from "@/components/ui/primitives";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CertificateVerificationPage({ params }: Props) {
  const { id } = await params;

  const certificate = await prisma.tadabburCertificate.findUnique({
    where: { id },
    include: {
      progress: {
        include: {
          circle: true,
        },
      },
    },
  });

  if (!certificate) {
    notFound();
  }

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

        {/* Certificate Details */}
        <div className="bg-surface border border-border rounded-2xl p-8 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-[12px] text-ink-tertiary uppercase tracking-wider font-semibold mb-2">
                Certificate ID
              </div>
              <div className="font-mono text-[13px] text-ink bg-surface-secondary px-3 py-2 rounded">
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
            The certificate holder successfully completed a comprehensive 15-day deep study of Quran verse {certificate.verseKey}, exploring it through multiple dimensions:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px] text-ink-secondary">
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span> Recitation & Deep Listening
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
              <span className="text-accent">✓</span> Calligraphic Tradition
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
          <a
            href="/tadabbur"
            className="px-6 py-3 bg-accent text-white rounded-xl font-semibold text-[14px] hover:bg-accent-hover transition-all shadow-sm"
          >
            Start Your Journey
          </a>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-surface border border-border text-ink rounded-xl font-semibold text-[14px] hover:bg-surface-hover transition-all"
          >
            Print Certificate
          </button>
        </div>
      </div>
    </PageContent>
  );
}
