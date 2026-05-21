import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/db";
import { requireUser } from "@/lib/local-store";

 
const prisma = _prisma as any;

export const dynamic = "force-dynamic";

const ALLOWED_PERIODS = new Set(["daily", "weekly"]);
const ALLOWED_TYPES = new Set(["PAGES", "VERSES", "TIME", "SURAHS"]);

interface GoalPayload {
  period?: string;
  type?: string;
  targetAmount?: number | string;
  target_amount?: number | string;
  mushafId?: number | string;
  category?: string;
}

async function loadOwnedGoal(userId: string, goalId: string) {
  return prisma.goal.findFirst({ where: { id: goalId, userId } });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ goalId: string }> },
) {
  const { goalId } = await context.params;
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { payload?: GoalPayload } & GoalPayload;
  const candidate = body.payload ?? body;

  const period = candidate.period ? String(candidate.period).toLowerCase() : undefined;
  const type = candidate.type ? String(candidate.type).toUpperCase() : undefined;
  const target = candidate.targetAmount ?? candidate.target_amount;
  const targetAmount = target !== undefined ? Number(target) : undefined;

  if (period && !ALLOWED_PERIODS.has(period)) {
    return NextResponse.json({ ok: false, message: "Period must be daily or weekly." }, { status: 400 });
  }
  if (type && !ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ ok: false, message: "Type must be PAGES, VERSES, or TIME." }, { status: 400 });
  }
  if (targetAmount !== undefined && (!Number.isFinite(targetAmount) || targetAmount < 1)) {
    return NextResponse.json({ ok: false, message: "Target amount must be at least 1." }, { status: 400 });
  }

  const existing = await loadOwnedGoal(auth.user.sub, goalId);
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Goal not found." }, { status: 404 });
  }

  const updated = await prisma.goal.update({
    where: { id: existing.id },
    data: {
      period: period ?? existing.period,
      type: type ?? existing.type,
      targetAmount: targetAmount !== undefined ? Math.round(targetAmount) : existing.targetAmount,
      mushafId: candidate.mushafId !== undefined ? Number(candidate.mushafId) : existing.mushafId,
      category: candidate.category !== undefined ? String(candidate.category) : existing.category,
    },
  });

  return NextResponse.json({ ok: true, message: "Goal updated.", data: { ...updated, progress: { completedAmount: 0 } } });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ goalId: string }> },
) {
  const { goalId } = await context.params;
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const existing = await loadOwnedGoal(auth.user.sub, goalId);
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Goal not found." }, { status: 404 });
  }

  await prisma.goal.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true, deletedId: existing.id, message: "Goal deleted." });
}
