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

const GOAL_TYPES = [
  { id: "PAGES", label: "Pages", unit: "pages", icon: "📄", description: "Track by Quran pages" },
  { id: "VERSES", label: "Verses", unit: "verses", icon: "📖", description: "Count individual verses" },
  { id: "TIME", label: "Minutes", unit: "min", icon: "⏱️", description: "Measure reading time" },
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
  const type = String(data?.type ?? "PAGES").toUpperCase();
  const target = Number(data?.targetAmount ?? data?.target_amount ?? 2);
  return {
    period: period === "weekly" ? "weekly" : "daily",
    type: ["PAGES", "VERSES", "TIME"].includes(type) ? type : "PAGES",
    target: Number.isFinite(target) && target > 0 ? Math.min(60, Math.round(target)) : 2,
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
                    <div className="text-2xl mb-2">{t.icon}</div>
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
                max={goalType === "TIME" ? 60 : 30}
                value={target}
                disabled={!isLoggedIn}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full accent-accent"
                style={{ height: "8px" }}
              />
              <div className="flex justify-between text-[11px] text-ink-tertiary mt-2">
                <span>1 {typeMeta.unit}</span>
                <span>{goalType === "TIME" ? 60 : 30} {typeMeta.unit}</span>
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
          <h3 className="text-[15px] font-bold text-ink mb-3">💡 Tips for Success</h3>
          <ul className="space-y-2 text-[13px] text-ink-secondary">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>Start small and build consistency before increasing your target</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>Choose a time of day when you're most focused and peaceful</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">•</span>
              <span>Use bookmarks and notes to track your progress and insights</span>
            </li>
          </ul>
        </div>
      </div>
    </PageContent>
  );
}
