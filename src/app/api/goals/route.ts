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

function normalizeGoal(input: GoalPayload | undefined) {
  if (!input) return null;
  const period = String(input.period ?? "daily").toLowerCase();
  const type = String(input.type ?? "PAGES").toUpperCase();
  const target = Number(input.targetAmount ?? input.target_amount ?? 0);
  if (!ALLOWED_PERIODS.has(period)) return null;
  if (!ALLOWED_TYPES.has(type)) return null;
  if (!Number.isFinite(target) || target < 1 || target > 1440) return null;
  return {
    period,
    type,
    targetAmount: Math.round(target),
    mushafId: input.mushafId ? Number(input.mushafId) : null,
    category: input.category ? String(input.category) : null,
  };
}

async function computeProgress(userId: string, goal: { period: string; type: string }) {
  const now = new Date();
  let periodStart: Date;
  if (goal.period === "weekly") {
    const day = now.getUTCDay() || 7;
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day + 1));
  } else {
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  const sessions = await prisma.readingSession.findMany({
    where: { userId, date: { gte: periodStart }, source: "goals" },
  });

  if (goal.type === "VERSES") {
    return sessions.reduce((sum: number, s: any) => sum + (s.versesRead ?? 0), 0);
  } else if (goal.type === "TIME") {
    return sessions.reduce((sum: number, s: any) => sum + (s.minutesRead ?? 0), 0);
  } else if (goal.type === "SURAHS") {
    return new Set(sessions.map((s: any) => s.surahId)).size;
  }
  // Fallback
  return sessions.reduce((sum: number, s: any) => sum + (s.versesRead ?? 0), 0);
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const goal = await prisma.goal.findFirst({
    where: { userId: auth.user.sub, isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!goal) {
    return NextResponse.json({ ok: true, data: null });
  }

  const completedAmount = await computeProgress(auth.user.sub, goal);

  return NextResponse.json({
    ok: true,
    data: {
      id: goal.id,
      period: goal.period,
      type: goal.type,
      targetAmount: goal.targetAmount,
      mushafId: goal.mushafId,
      category: goal.category,
      progress: { completedAmount },
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { payload?: GoalPayload } & GoalPayload;
  const candidate = body.payload ?? body;
  const data = normalizeGoal(candidate);
  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Provide a valid goal (period, type, targetAmount)." },
      { status: 400 },
    );
  }

  // Single active goal per user — deactivate any older ones, then create.
  await prisma.goal.updateMany({
    where: { userId: auth.user.sub, isActive: true },
    data: { isActive: false },
  });

  const created = await prisma.goal.create({
    data: { ...data, userId: auth.user.sub, isActive: true },
  });

  const completedAmount = await computeProgress(auth.user.sub, created);

  return NextResponse.json({
    ok: true,
    message: "Goal saved.",
    data: {
      id: created.id,
      period: created.period,
      type: created.type,
      targetAmount: created.targetAmount,
      mushafId: created.mushafId,
      category: created.category,
      progress: { completedAmount },
    },
  });
}
