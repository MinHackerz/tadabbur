"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  GOAL_PRESETS,
  JOURNEY_TYPES,
  OCCASIONS_BY_TYPE,
  createJourney,
  formatLongDate,
  resolveGoalValue,
  targetDateFor,
  todayKey,
  type GoalType,
  type Journey,
  type JourneyType,
  type NewJourneyInput,
} from "@/lib/niyyah";
import { ArrowRight, JourneyTypeIcon } from "./icons";
import { GoldCorners, OrnamentDivider } from "./Ornament";

type Step = 1 | 2 | 3;

interface Props {
  open: boolean;
  initialType: JourneyType;
  onClose: () => void;
  onSeal: (j: Journey) => void;
}

const cls = {
  btnGold:
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-ny-forest bg-gradient-to-br from-ny-gold-soft via-ny-gold-bright to-ny-gold border border-ny-gold shadow-[0_10px_22px_rgba(184,146,74,0.32),inset_0_1px_0_rgba(255,255,255,0.45)] hover:shadow-[0_14px_28px_rgba(184,146,74,0.42),inset_0_1px_0_rgba(255,255,255,0.5)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed",
  btnForest:
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-white bg-ny-forest hover:bg-ny-forest-deep border border-ny-forest shadow-[0_10px_22px_rgba(20,48,40,0.32)] hover:shadow-[0_10px_22px_rgba(11,28,23,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed",
  btnGhost:
    "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold text-ny-ink bg-transparent border border-ny-charcoal/20 hover:bg-ny-cream-warm/60 hover:border-ny-gold/50 transition-colors",
  input:
    "w-full px-4 py-3 rounded-xl bg-ny-ivory border border-ny-charcoal/15 text-ny-charcoal placeholder:text-ny-charcoal/45 focus:outline-none focus:border-ny-gold focus:ring-2 focus:ring-ny-gold/30 transition",
  label:
    "block text-[11px] font-bold uppercase tracking-[0.16em] text-ny-sage mb-1.5",
};

export default function NiyyahSetupModal({ open, initialType, onClose, onSeal }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [type, setType] = useState<JourneyType>(initialType);
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState<string>(OCCASIONS_BY_TYPE[initialType][0]);
  const [customOccasion, setCustomOccasion] = useState("");
  const [dua, setDua] = useState("");
  const [readerName, setReaderName] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("days");
  const [goalDays, setGoalDays] = useState<number>(40);
  const [customDays, setCustomDays] = useState<number>(21);
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const occasions = OCCASIONS_BY_TYPE[type];
  const finalOccasion =
    occasion === "Custom" ? customOccasion.trim() || "With love" : occasion;

  const goalValue = useMemo(() => {
    if (goalType === "khatm") return 30;
    if (goalType === "juz") return 30 * 7;
    if (goalType === "custom") return Math.max(1, Math.floor(customDays || 1));
    return goalDays;
  }, [goalType, goalDays, customDays]);

  const targetIso = targetDateFor(todayKey(), goalValue);
  const canSeal = sealed && recipient.trim().length > 0 && dua.trim().length > 0;

  function handleConfirm() {
    try {
      const requested =
        goalType === "custom"
          ? customDays
          : goalType === "days"
            ? goalDays
            : goalValue;
      const input: NewJourneyInput = {
        type,
        recipientName: recipient,
        occasion: finalOccasion,
        personalDua: dua,
        goalType,
        goalValue: resolveGoalValue(goalType, requested),
        readerName,
      };
      const journey = createJourney(input);
      onSeal(journey);
    } catch (error) {
      // Surfacing the failure via console keeps the modal recoverable; an
      // `alert()` interrupted users and exposed raw error messages.
      console.error("[NiyyahSetupModal] handleConfirm error:", error);
    }
  }

  if (!open || typeof document === "undefined") return null;

  const overlay = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Set your Niyyah"
      className="niyyah-scope fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/70"
      onClick={onClose}
    >
      {/* Panel */}
      <div className="relative w-full max-w-2xl my-auto z-10" onClick={(e) => e.stopPropagation()}>
        {/* Outer gold ring */}
        <div className="absolute inset-0 rounded-[26px] bg-gradient-to-br from-ny-gold via-ny-gold-bright to-ny-gold shadow-[0_30px_70px_rgba(0,0,0,0.5)]" />
        {/* Inner parchment - fully opaque */}
        <div className="relative m-[3px] rounded-[23px] bg-ny-cream overflow-hidden shadow-inner">
          <GoldCorners inset="0.6rem" />

          {/* Mihrab arch top accent */}
          <div
            aria-hidden
            className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-ny-gold/55 to-transparent"
          />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white border-2 border-ny-gold text-ny-charcoal hover:bg-ny-gold hover:text-white transition-colors text-2xl leading-none flex items-center justify-center font-bold shadow-lg"
          >
            ×
          </button>

          <div className="relative px-5 pt-7 pb-6 sm:px-10 sm:pt-9 sm:pb-9">
            <Stepper step={step} />

            {step === 1 && (
              <section>
                <SectionEyebrow>Step 1 — The Niyyah</SectionEyebrow>
                <h3 className="font-[var(--font-niyyah-display)] text-center text-[1.7rem] sm:text-[2rem] font-semibold leading-tight text-ny-ink mb-3 m-0">
                  Before you begin, set your intention.
                </h3>
                <p className="text-center max-w-xl mx-auto text-[1rem] leading-relaxed text-ny-charcoal/80 mb-5 m-0">
                  <em>
                    &ldquo;Indeed, your Lord is most knowing of who has strayed
                    from His way, and He is most knowing of who is rightly
                    guided.&rdquo;
                  </em>{" "}
                  <span className="text-ny-gold font-mono text-[11px] tracking-[0.14em] uppercase">
                    Qur&apos;an 16:125
                  </span>
                </p>

                <OrnamentDivider lineWidth="md" glyph="diamond" className="mb-5" />

                <div className="grid grid-cols-3 gap-2 mb-5" role="radiogroup" aria-label="Journey type">
                  {JOURNEY_TYPES.map((t) => {
                    const active = type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          setType(t.id);
                          setOccasion(OCCASIONS_BY_TYPE[t.id][0]);
                        }}
                        className={[
                          "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-[12.5px] font-semibold transition-colors",
                          active
                            ? "bg-ny-forest text-white border border-ny-forest shadow-[0_2px_8px_rgba(20,48,40,0.3)]"
                            : "bg-ny-ivory text-ny-charcoal border border-ny-charcoal/10 hover:border-ny-gold",
                        ].join(" ")}
                      >
                        <JourneyTypeIcon type={t.id} size={16} />
                        <span className="truncate">{t.title}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mb-4">
                  <label htmlFor="ny-recipient" className={cls.label}>
                    {type === "departed"
                      ? "In memory of"
                      : type === "personal"
                        ? "A name for this season"
                        : "Reading for"}
                  </label>
                  <input
                    id="ny-recipient"
                    className={cls.input}
                    placeholder={
                      type === "personal"
                        ? "e.g. My recovery, Ramadan 2026"
                        : "e.g. Ammi, Abu, my dear friend"
                    }
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    maxLength={80}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label htmlFor="ny-occasion" className={cls.label}>Occasion</label>
                    <select
                      id="ny-occasion"
                      className={cls.input + " appearance-none"}
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                    >
                      {occasions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    {occasion === "Custom" && (
                      <input
                        className={cls.input + " mt-2"}
                        placeholder="Describe the occasion"
                        value={customOccasion}
                        onChange={(e) => setCustomOccasion(e.target.value)}
                        maxLength={60}
                      />
                    )}
                  </div>
                  <div>
                    <label htmlFor="ny-reader" className={cls.label}>
                      Your name <span className="text-ny-charcoal/45 normal-case font-normal tracking-normal">(for the certificate)</span>
                    </label>
                    <input
                      id="ny-reader"
                      className={cls.input}
                      placeholder="e.g. Aisha"
                      value={readerName}
                      onChange={(e) => setReaderName(e.target.value)}
                      maxLength={60}
                    />
                  </div>
                </div>

                <div className="mb-5">
                  <label htmlFor="ny-dua" className={cls.label}>A personal du&apos;a</label>
                  <textarea
                    id="ny-dua"
                    className={cls.input + " min-h-[6rem] resize-y"}
                    rows={3}
                    placeholder="Ya Allah, grant her shifa, ease her days, and fill her heart with light…"
                    value={dua}
                    onChange={(e) => setDua(e.target.value)}
                    maxLength={400}
                  />
                </div>

                <div className="text-center mb-2">
                  {!sealed ? (
                    <button
                      type="button"
                      disabled={!recipient.trim() || !dua.trim()}
                      onClick={() => setSealed(true)}
                      className={cls.btnGold}
                    >
                      Set My Intention
                      <span className="text-ny-forest text-base">✦</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-ny-gold bg-ny-gold/10 text-ny-forest font-semibold animate-ny-seal">
                      <span className="text-ny-gold text-lg">✦</span>
                      <span>
                        Niyyah sealed at{" "}
                        <strong>
                          {new Date().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </span>
                    </div>
                  )}
                  <p className="text-[12px] text-ny-charcoal/55 mt-2 italic">
                    Your intention is private. Renew it before each session.
                  </p>
                </div>

                <ActionRow>
                  <button type="button" className={cls.btnGhost} onClick={onClose}>Cancel</button>
                  <button
                    type="button"
                    disabled={!canSeal}
                    onClick={() => setStep(2)}
                    className={cls.btnForest}
                  >
                    Continue <ArrowRight />
                  </button>
                </ActionRow>
              </section>
            )}

            {step === 2 && (
              <section>
                <SectionEyebrow>Step 2 — Choose your goal</SectionEyebrow>
                <h3 className="font-[var(--font-niyyah-display)] text-center text-[1.7rem] sm:text-[2rem] font-semibold leading-tight text-ny-ink mb-3 m-0">
                  How long shall you walk this path?
                </h3>
                <p className="text-center text-[1rem] leading-relaxed text-ny-charcoal/80 mb-5 m-0">
                  Each length carries its own grace. Pick what fits your heart.
                </p>

                <OrnamentDivider lineWidth="md" glyph="diamond" className="mb-5" />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5" role="radiogroup" aria-label="Day-based goals">
                  {GOAL_PRESETS.map((g) => {
                    const active = goalType === "days" && goalDays === g.value;
                    return (
                      <button
                        key={g.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          setGoalType("days");
                          setGoalDays(g.value);
                        }}
                        className={[
                          "flex flex-col items-center justify-center gap-0.5 p-4 rounded-2xl border-2 transition",
                          active
                            ? "bg-gradient-to-b from-ny-gold-soft/40 to-ny-cream border-ny-gold shadow-[0_8px_22px_rgba(184,146,74,0.22)]"
                            : "bg-ny-ivory border-transparent hover:border-ny-gold/50",
                        ].join(" ")}
                      >
                        <span className="font-[var(--font-niyyah-display)] text-[2.1rem] font-semibold text-ny-ink leading-none">
                          {g.value}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.14em] text-ny-sage font-bold">
                          days
                        </span>
                        <span className="mt-1.5 text-[11px] text-center text-ny-charcoal/70 italic">
                          {g.note}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-2 mb-5">
                  {[
                    { id: "khatm" as GoalType, label: "1 Khatm", hint: "Complete the Qur'an in 30 days" },
                    { id: "juz" as GoalType, label: "1 Juz per week", hint: "A gentler 30-week Khatm" },
                  ].map((row) => {
                    const active = goalType === row.id;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => setGoalType(row.id)}
                        className={[
                          "flex items-center justify-between gap-4 px-4 py-3 rounded-xl border font-semibold transition",
                          active
                            ? "bg-ny-gold-soft/30 border-ny-gold"
                            : "bg-ny-ivory border-ny-charcoal/10 hover:border-ny-gold/55",
                        ].join(" ")}
                      >
                        <span className="text-ny-ink">{row.label}</span>
                        <span className="text-ny-charcoal/55 text-[12px] font-normal italic">{row.hint}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setGoalType("custom")}
                    className={[
                      "flex items-center justify-between gap-4 px-4 py-3 rounded-xl border font-semibold transition",
                      goalType === "custom"
                        ? "bg-ny-gold-soft/30 border-ny-gold"
                        : "bg-ny-ivory border-ny-charcoal/10 hover:border-ny-gold/55",
                    ].join(" ")}
                  >
                    <span className="text-ny-ink">Custom days</span>
                    {goalType === "custom" ? (
                      <input
                        className="w-20 px-3 py-1.5 rounded-lg bg-ny-cream border border-ny-charcoal/15 text-center font-mono text-ny-ink"
                        type="number"
                        min={1}
                        max={365}
                        value={customDays}
                        onChange={(e) => setCustomDays(parseInt(e.target.value || "1", 10))}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-ny-charcoal/55 text-[12px] font-normal italic">Define your own span</span>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 px-4 py-3 mb-2 rounded-xl bg-ny-cream-warm/60 border border-dashed border-ny-gold/40">
                  <span className="text-ny-charcoal/65 text-[13px] italic">Targets to complete by</span>
                  <strong className="text-ny-ink">{formatLongDate(targetIso)}</strong>
                </div>

                <ActionRow>
                  <button type="button" className={cls.btnGhost} onClick={() => setStep(1)}>Back</button>
                  <button type="button" className={cls.btnForest} onClick={() => setStep(3)}>
                    Preview the gift <ArrowRight />
                  </button>
                </ActionRow>
              </section>
            )}

            {step === 3 && (
              <section>
                <SectionEyebrow>Step 3 — The gift, in waiting</SectionEyebrow>
                <h3 className="font-[var(--font-niyyah-display)] text-center text-[1.7rem] sm:text-[2rem] font-semibold leading-tight text-ny-ink mb-3 m-0">
                  Your token of light is taking shape.
                </h3>
                <p className="text-center text-[1rem] leading-relaxed text-ny-charcoal/80 mb-5 m-0">
                  Complete the journey to fully reveal it. Begin when your heart is ready.
                </p>

                <OrnamentDivider lineWidth="md" glyph="star" className="mb-5" />

                <article className="relative rounded-2xl border-2 border-ny-gold/55 bg-ny-ivory parchment-bg shadow-[inset_0_0_0_4px_rgba(184,146,74,0.14)] text-center p-7">
                  <GoldCorners inset="0.6rem" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-ny-sage">A reading dedicated to</p>
                  <p className="font-[var(--font-decorative)] text-[2rem] sm:text-[2.4rem] text-ny-ink mt-1 mb-1 leading-tight">
                    {recipient.trim() || "Your beloved"}
                  </p>
                  <p className="font-[var(--font-niyyah-display)] italic text-ny-gold mb-4 tracking-wide text-[15px]">
                    — {finalOccasion} —
                  </p>
                  <p className="font-[var(--font-niyyah-display)] italic text-[1rem] leading-relaxed text-ny-charcoal/85 max-w-md mx-auto mb-4">
                    &ldquo;{dua.trim() || "Your du'a will appear here."}&rdquo;
                  </p>
                  <div className="flex flex-wrap justify-between gap-2 text-[12px] text-ny-sage italic">
                    <span>From {readerName.trim() || "the reader"}</span>
                    <span>To be completed by {formatLongDate(targetIso)}</span>
                  </div>
                  <div className="mt-3 text-2xl text-ny-gold">✦</div>
                </article>

                <p className="text-center text-[11px] uppercase tracking-[0.16em] text-ny-charcoal/55 mt-3 italic">
                  Sealed until completion
                </p>

                <ActionRow>
                  <button type="button" className={cls.btnGhost} onClick={() => setStep(2)}>Back</button>
                  <button type="button" className={cls.btnGold} onClick={handleConfirm}>
                    Begin the journey <ArrowRight />
                  </button>
                </ActionRow>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[11px] font-bold uppercase tracking-[0.22em] text-ny-gold mb-2 m-0">
      {children}
    </p>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 mt-6">
      {children}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels: Record<Step, string> = { 1: "Niyyah", 2: "Goal", 3: "Token" };
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-6" aria-hidden>
      {[1, 2, 3].map((n, i) => {
        const active = step === n;
        const done = step > n;
        return (
          <div key={n} className="flex items-center gap-2 sm:gap-4">
            {i > 0 && <span className="w-6 h-px bg-ny-gold/40" />}
            <div
              className={[
                "flex items-center gap-2 text-[10.5px] uppercase tracking-[0.16em] font-bold",
                active ? "text-ny-ink" : "text-ny-charcoal/40",
              ].join(" ")}
            >
              <span
                className={[
                  "inline-flex items-center justify-center w-7 h-7 rounded-full border font-mono text-[12px] font-bold",
                  done
                    ? "bg-ny-forest text-white border-ny-forest shadow-[0_2px_8px_rgba(20,48,40,0.3)]"
                    : active
                      ? "bg-gradient-to-br from-ny-gold-soft to-ny-gold text-ny-forest border-ny-gold shadow-[0_2px_8px_rgba(184,146,74,0.4)]"
                      : "bg-ny-ivory text-ny-charcoal/55 border-ny-charcoal/15",
                ].join(" ")}
              >
                {n}
              </span>
              <span>{labels[n as Step]}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
