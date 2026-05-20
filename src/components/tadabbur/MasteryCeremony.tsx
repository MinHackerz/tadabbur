"use client";

interface Props {
  verseKey: string;
  verseArabic?: string;
  verseReference?: string;
  personalStatement: string | null;
  onClose: () => void;
}

export default function MasteryCeremony({ verseKey, verseArabic, verseReference, personalStatement, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0A1628] to-[#1C3A2F] z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-tadabbur-gold rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-3xl w-full text-center">
        {/* Completion message */}
        <div className="mb-8 animate-fade-in">
          <div className="text-warm text-[64px] mb-4">✦</div>
          <h1 className="font-niyyah-display text-[36px] text-white mb-4">
            Mastery Achieved
          </h1>
          <p className="text-[16px] text-white/80">
            You have sat with this verse for 15 days.
          </p>
        </div>

        {/* The verse */}
        <div className="bg-surface/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8 animate-fade-in-delay">
          {verseArabic && (
            <div className="font-amiri text-[32px] leading-relaxed text-white mb-4 text-right" dir="rtl">
              {verseArabic}
            </div>
          )}
          <div className="text-[14px] text-white/70 mb-2">
            {verseReference || verseKey}
          </div>
        </div>

        {/* Personal statement */}
        {personalStatement && (
          <div className="bg-surface/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8 animate-fade-in-delay-2">
            <div className="text-[13px] text-warm uppercase tracking-wider mb-3">
              Your Understanding
            </div>
            <p className="font-niyyah-display text-[16px] text-white/90 italic">
              "{personalStatement}"
            </p>
          </div>
        )}

        {/* Certificate info */}
        <div className="text-[14px] text-white/70 mb-8 animate-fade-in-delay-3">
          This verse has been added to your Verse Vault—a permanent collection of deeply understood Quran.
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-delay-4">
          <button
            onClick={onClose}
            className="bg-warm hover:bg-warm/90 text-ink px-8 py-3 rounded-xl font-medium text-[15px] transition-colors"
          >
            View Verse Vault
          </button>
          <button
            onClick={onClose}
            className="bg-surface/10 hover:bg-surface/20 text-white border border-white/20 px-8 py-3 rounded-xl font-medium text-[15px] transition-colors"
          >
            Begin Next Verse
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(20px);
            opacity: 0;
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-float {
          animation: float linear infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        .animate-fade-in-delay {
          animation: fade-in 0.8s ease-out 0.3s both;
        }
        .animate-fade-in-delay-2 {
          animation: fade-in 0.8s ease-out 0.6s both;
        }
        .animate-fade-in-delay-3 {
          animation: fade-in 0.8s ease-out 0.9s both;
        }
        .animate-fade-in-delay-4 {
          animation: fade-in 0.8s ease-out 1.2s both;
        }
      `}</style>
    </div>
  );
}
