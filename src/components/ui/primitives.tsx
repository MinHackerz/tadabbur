export const card = "bg-surface border border-border rounded-2xl p-6 shadow-sm";
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-[13px] bg-accent text-white hover:bg-accent-hover transition-all active:scale-[0.98] cursor-pointer shadow-sm";
export const btnSecondary =
  "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-[13px] text-ink bg-surface border border-border hover:border-border-hover hover:bg-surface-secondary transition-all active:scale-[0.98] cursor-pointer shadow-sm";
export const btnDanger =
  "inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-danger bg-danger-subtle/50 hover:bg-danger-subtle border border-danger/10 hover:border-danger/25 transition-all cursor-pointer";
export const input =
  "w-full px-4 py-3 bg-surface border border-border rounded-xl text-[14px] text-ink shadow-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 placeholder:text-ink-tertiary transition-all";
export const textarea = input + " min-h-[100px] resize-y";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-bold text-ink text-[15px] tracking-[-0.01em] mb-4">{children}</h3>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[12px] font-semibold text-ink-secondary mb-1.5 uppercase tracking-wider">
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-border rounded-xl bg-surface-secondary/50">
      <span className="text-ink-quaternary mb-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={32} height={32}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      </span>
      <p className="text-[13px] text-ink-tertiary font-medium">{message}</p>
    </div>
  );
}

export const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0-6.75-6.75M19.5 12l-6.75 6.75" />
  </svg>
);

export const IconArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15m0 0 6.75 6.75M4.5 12l6.75-6.75" />
  </svg>
);

/** Full-width page body inside PageShell — avoids nested narrow max-w columns. */
export function PageContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`w-full ${className}`.trim()}>{children}</div>;
}

export function PageHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="feature-hero mb-8 md:mb-12">
      <h1 className="text-[28px] md:text-[36px] font-bold text-ink tracking-tight mb-3">{title}</h1>
      <p className="text-[16px] md:text-[17px] text-ink-secondary max-w-3xl leading-relaxed">{subtitle}</p>
      {children && <div className="mt-8">{children}</div>}
    </div>
  );
}

export function SignInBanner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl border border-accent/20 bg-accent-subtle/50 mb-6">
      <div>
        <p className="text-[14px] font-semibold text-ink mb-0.5">Sign in to save your work</p>
        <p className="text-[13px] text-ink-secondary">
          {message ?? "Bookmarks, notes, goals, and reflections sync to your Quran.com account."}
        </p>
      </div>
      <a href="/api/auth/start" className={btnPrimary + " shrink-0 !py-3"}>
        Sign in
      </a>
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-1 p-1 bg-surface-secondary border border-border rounded-xl overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors ${
            active === t.id ? "bg-surface text-ink shadow-sm" : "text-ink-secondary hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={`min-w-[1.25rem] px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                active === t.id ? "bg-accent-subtle text-accent" : "bg-surface text-ink-tertiary"
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ChipButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3.5 py-1.5 rounded-full text-[13px] font-medium bg-surface border border-border text-ink-secondary hover:border-accent/40 hover:text-accent hover:bg-accent-subtle/40 transition-colors"
    >
      {children}
    </button>
  );
}
