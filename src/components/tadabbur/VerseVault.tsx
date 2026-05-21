"use client";

export default function VerseVault() {
  // This will be populated with completed verses from the database
  const completedVerses: any[] = [];

  if (completedVerses.length === 0) {
    return (
      <div className="bg-gradient-to-br from-surface-secondary to-surface border border-border rounded-2xl p-8 text-center shadow-sm">
        <div className="text-[48px] mb-4 opacity-30">📚</div>
        <h3 className="text-[16px] font-semibold text-ink mb-2">
          Your Verse Vault
        </h3>
        <p className="text-[14px] text-ink-secondary mb-4">
          Complete your first 15-day journey to add a verse to your permanent collection.
        </p>
        <p className="text-[13px] text-ink-tertiary">
          Each mastered verse becomes a lifelong companion—a treasury of deeply understood Quran.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {completedVerses.map((verse, i) => (
        <div
          key={i}
          className="bg-surface border border-warm/30 rounded-xl p-6 hover:shadow-lg transition-shadow cursor-pointer group"
        >
          <div className="font-amiri text-[20px] text-warm mb-3 text-right" dir="rtl">
            {verse.arabic}
          </div>
          <div className="text-[12px] text-ink-tertiary mb-2">{verse.reference}</div>
          <div className="text-[13px] text-ink-secondary font-niyyah-display italic">
            &quot;{verse.personalStatement}&quot;
          </div>
          <div className="mt-4 text-[11px] text-warm">
            Completed {verse.completedMonth}
          </div>
        </div>
      ))}
    </div>
  );
}
