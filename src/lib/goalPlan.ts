/** Human-readable summary from getTodaysPlan() payload. */
export function summarizeGoalPlan(data: Record<string, unknown> | null): string | null {
  if (!data) return null;

  const progress = data.progress as Record<string, unknown> | undefined;
  const target = progress?.targetAmount ?? progress?.target_amount ?? data.targetAmount;
  const completed = progress?.completedAmount ?? progress?.completed_amount;
  const type = String(progress?.type ?? data.type ?? "reading").toLowerCase();

  if (target != null && completed != null) {
    return `Today: ${completed} / ${target} ${type}`;
  }

  const description = data.description ?? data.summary;
  if (typeof description === "string" && description.trim()) {
    return description.trim();
  }

  return null;
}
