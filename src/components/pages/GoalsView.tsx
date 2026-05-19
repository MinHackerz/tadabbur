"use client";
import { useEffect, useState } from "react";
import type { BootstrapPayload } from "@/lib/types";
import {
  btnPrimary,
  card,
  Label,
  PageContent,
  PageHero,
  SectionTitle,
  SignInBanner,
} from "@/components/ui/primitives";

const PERIODS = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
] as const;

const GOAL_TYPES = [
  { id: "PAGES", label: "Pages", unit: "pages" },
  { id: "VERSES", label: "Verses", unit: "verses" },
  { id: "TIME", label: "Minutes", unit: "min" },
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

  return (
    <PageContent>
      <PageHero
        title="Reading goals"
        subtitle="Choose a gentle rhythm for your Quran reading. Your target saves to your Quran.com account when you are signed in."
      />

      {!isLoggedIn && <SignInBanner message="Sign in to save and track your reading goals." />}

      <div className="max-w-xl">
        <div className={card + " feature-card"}>
          <SectionTitle>Your target</SectionTitle>

          {data.goals.error && (
            <p className="p-3 mb-4 bg-danger-subtle text-danger text-[13px] font-medium rounded-xl">{data.goals.error}</p>
          )}
          {data.goals.gatingMessage && (
            <p className="text-ink-tertiary text-[13px] font-medium mb-4">{data.goals.gatingMessage}</p>
          )}

          <div className="feature-highlight mb-6">
            <p className="feature-highlight__eyebrow">{period} goal</p>
            <p className="feature-highlight__value">
              {target} <span className="feature-highlight__unit">{typeMeta.unit}</span>
            </p>
            <p className="feature-highlight__hint">Quran reading · {typeMeta.label}</p>
          </div>

          <div className="space-y-5">
            <div>
              <Label>How often?</Label>
              <div className="flex gap-2 mt-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!isLoggedIn}
                    onClick={() => setPeriod(p.id)}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-colors ${
                      period === p.id
                        ? "bg-accent text-white border-accent"
                        : "bg-surface border-border text-ink-secondary hover:border-border-hover"
                    } disabled:opacity-50`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Measure by</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GOAL_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!isLoggedIn}
                    onClick={() => setGoalType(t.id)}
                    className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                      goalType === t.id
                        ? "bg-accent text-white border-accent"
                        : "bg-surface border-border text-ink-secondary hover:border-border-hover"
                    } disabled:opacity-50`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>
                Target: {target} {typeMeta.unit}
              </Label>
              <input
                type="range"
                min={1}
                max={goalType === "TIME" ? 60 : 30}
                value={target}
                disabled={!isLoggedIn}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full mt-2 accent-accent"
              />
              <div className="flex justify-between text-[11px] text-ink-tertiary mt-1">
                <span>1</span>
                <span>{goalType === "TIME" ? 60 : 30}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={btnPrimary + " w-full mt-6"}
            disabled={!isLoggedIn}
            onClick={handleSave}
          >
            Save goal
          </button>
        </div>
      </div>
    </PageContent>
  );
}
