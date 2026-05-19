"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { BootstrapPayload } from "@/lib/types";
import {
  btnPrimary,
  btnSecondary,
  card,
  Label,
  PageContent,
  PageHero,
  SectionTitle,
  SignInBanner,
} from "@/components/ui/primitives";

const PERIODS = [
  { id: "daily", label: "Daily", description: "Build a consistent daily habit" },
  { id: "weekly", label: "Weekly", description: "Flexible weekly commitment" },
] as const;

// Inline SVG icons — no external dependency, consistent with the rest of the app
const IconPages = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} width={26} height={26} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const IconVerses = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} width={26} height={26} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
  </svg>
);

const IconTime = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} width={26} height={26} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const IconTip = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} width={18} height={18} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>
);

const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const GOAL_TYPES = [
  { id: "VERSES", label: "Verses", unit: "verses", Icon: IconVerses, description: "Count individual verses" },
  { id: "TIME", label: "Minutes", unit: "min", Icon: IconTime, description: "Measure reading time" },
  { id: "SURAHS", label: "Surahs", unit: "surahs", Icon: IconPages, description: "Track surahs completed" },
] as const;

interface GoalsViewProps {
  isLoggedIn: boolean;
  data: BootstrapPayload;
  submitGoalPayload: (payload: Record<string, unknown>) => void;
}

function parseGoal(data: Record<string, unknown> | null): {
  period: "daily" | "weekly";
  type: string;
  target: number;
} {
  const period = String(data?.period ?? "daily").toLowerCase();
  const type = String(data?.type ?? "VERSES").toUpperCase();
  const target = Number(data?.targetAmount ?? data?.target_amount ?? 10);
  return {
    period: period === "weekly" ? "weekly" : "daily",
    type: ["VERSES", "TIME", "SURAHS"].includes(type) ? type : "VERSES",
    target: Number.isFinite(target) && target > 0 ? Math.min(114, Math.round(target)) : 10,
  };
}

export default function GoalsView({ isLoggedIn, data, submitGoalPayload }: GoalsViewProps) {
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [goalType, setGoalType] = useState("PAGES");
  const [target, setTarget] = useState(2);

  useEffect(() => {
    if (data.goals.data) {
      const p = parseGoal(data.goals.data);
      setPeriod(p.period);
      setGoalType(p.type);
      setTarget(p.target);
    }
  }, [data.goals.data]);

  const handleSave = () => {
    submitGoalPayload({
      category: "QURAN",
      period,
      type: goalType,
      targetAmount: target,
    });
  };

  const typeMeta = GOAL_TYPES.find((t) => t.id === goalType) ?? GOAL_TYPES[0];
  const periodMeta = PERIODS.find((p) => p.id === period) ?? PERIODS[0];

  return (
    <PageContent>
      <PageHero
        title="Reading Goals"
        subtitle="Set a sustainable rhythm for your Quran journey. Your goals sync with your Quran.com account."
      />

      {!isLoggedIn && <SignInBanner message="Sign in to save and track your reading goals across all devices." />}

      <div className="space-y-6 lg:space-y-8 mb-8">
        {data.goals.error && (
          <div className="p-4 bg-danger-subtle border border-danger/20 text-danger text-[14px] font-medium rounded-xl">
            {data.goals.error}
          </div>
        )}
        {data.goals.gatingMessage && (
          <div className="p-4 bg-surface-secondary border border-border text-ink-secondary text-[13px] rounded-xl">
            {data.goals.gatingMessage}
          </div>
        )}

        {/* Current Goal Display */}
        <div className={card + " feature-card relative overflow-hidden"}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full -mr-32 -mt-32" />
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <SectionTitle>Your Current Goal</SectionTitle>
              {data.goals.data && (
                <span className="px-3 py-1 rounded-full bg-accent-subtle text-accent text-[11px] font-bold uppercase tracking-wide">
                  Active
                </span>
              )}
            </div>

            <div className="text-center py-8">
              <div className="inline-flex items-baseline gap-3 mb-2">
                <span className="text-6xl font-bold text-accent">{target}</span>
                <span className="text-2xl font-semibold text-ink-secondary">{typeMeta.unit}</span>
              </div>
              <p className="text-[15px] text-ink-secondary font-medium mb-1">
                {periodMeta.label} · {typeMeta.label}
              </p>
              <p className="text-[13px] text-ink-tertiary">{periodMeta.description}</p>
            </div>
          </div>
        </div>

        {/* Goal Configuration */}
        <div className={card + " feature-card"}>
          <SectionTitle>Customize Your Goal</SectionTitle>
          <p className="text-[13px] text-ink-tertiary mb-6 -mt-2">
            Choose what works best for your schedule and lifestyle
          </p>

          <div className="space-y-6">
            {/* Period Selection */}
            <div>
              <Label>Frequency</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!isLoggedIn}
                    onClick={() => setPeriod(p.id)}
                    className={`p-4 rounded-xl text-left border-2 transition-all ${
                      period === p.id
                        ? "bg-accent-subtle border-accent shadow-sm"
                        : "bg-surface border-border hover:border-border-hover"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <p className={`text-[14px] font-bold mb-1 ${period === p.id ? "text-accent" : "text-ink"}`}>
                      {p.label}
                    </p>
                    <p className="text-[12px] text-ink-tertiary">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Goal Type Selection */}
            <div>
              <Label>Measurement Type</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {GOAL_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!isLoggedIn}
                    onClick={() => setGoalType(t.id)}
                    className={`p-4 rounded-xl text-center border-2 transition-all ${
                      goalType === t.id
                        ? "bg-accent-subtle border-accent shadow-sm"
                        : "bg-surface border-border hover:border-border-hover"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className={`flex justify-center mb-2 ${goalType === t.id ? "text-accent" : "text-ink-secondary"}`}>
                      <t.Icon />
                    </div>
                    <p className={`text-[13px] font-bold mb-1 ${goalType === t.id ? "text-accent" : "text-ink"}`}>
                      {t.label}
                    </p>
                    <p className="text-[11px] text-ink-tertiary">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Amount */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Target Amount</Label>
                <span className="text-[15px] font-bold text-accent">
                  {target} {typeMeta.unit}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={goalType === "TIME" ? 60 : goalType === "SURAHS" ? 10 : 50}
                value={target}
                disabled={!isLoggedIn}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full accent-accent"
                style={{ height: "8px" }}
              />
              <div className="flex justify-between text-[11px] text-ink-tertiary mt-2">
                <span>1 {typeMeta.unit}</span>
                <span>{goalType === "TIME" ? 60 : goalType === "SURAHS" ? 10 : 50} {typeMeta.unit}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <button
              type="button"
              className={btnPrimary + " flex-1"}
              disabled={!isLoggedIn}
              onClick={handleSave}
            >
              Save Goal
            </button>
            <Link href="/library" className={btnSecondary}>
              View Library
            </Link>
          </div>
        </div>

        {/* Tips Section */}
        <div className="p-6 rounded-xl bg-surface-secondary/50 border border-border">
          <h3 className="text-[15px] font-bold text-ink mb-3 flex items-center gap-2">
            <span className="text-accent"><IconTip /></span>
            Tips for Success
          </h3>
          <ul className="space-y-2 text-[13px] text-ink-secondary">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5 shrink-0"><IconCheck /></span>
              <span>Start small and build consistency before increasing your target</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5 shrink-0"><IconCheck /></span>
              <span>Choose a time of day when you're most focused and peaceful</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5 shrink-0"><IconCheck /></span>
              <span>Use bookmarks and notes to track your progress and insights</span>
            </li>
          </ul>
        </div>
      </div>
    </PageContent>
  );
}
