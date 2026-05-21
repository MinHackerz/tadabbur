import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/db";
import { requireUser, toCollectionItem } from "@/lib/local-store";

 
const prisma = _prisma as any;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const rows = await prisma.collection.findMany({
    where: { userId: auth.user.sub },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
    take: 200,
  });

  const items = rows.map((row: any) => ({
    ...toCollectionItem(row),
    itemCount: row._count.items,
  }));

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const payload = (await req.json().catch(() => ({}))) as { name?: string };
  const name = String(payload.name ?? "").trim();
  if (!name) {
    return NextResponse.json(
      { ok: false, message: "Enter a collection name before saving." },
      { status: 400 },
    );
  }

  const row = await prisma.collection.create({
    data: { userId: auth.user.sub, name },
  });

  return NextResponse.json({
    ok: true,
    message: "Collection created.",
    item: toCollectionItem(row),
  });
}
