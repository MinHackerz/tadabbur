import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/db";
import { parseVerseKey, requireUser, toCollectionItem } from "@/lib/local-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;

export const dynamic = "force-dynamic";

async function loadOwnedCollection(userId: string, collectionId: string) {
  return prisma.collection.findFirst({ where: { id: collectionId, userId } });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await context.params;
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId: auth.user.sub },
    include: { items: { orderBy: { addedAt: "desc" } } },
  });
  if (!collection) {
    return NextResponse.json({ ok: false, message: "Collection not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    item: {
      ...toCollectionItem(collection),
      verses: collection.items.map((it: any) => ({
        id: it.id,
        verseKey: it.verseKey,
        addedAt: it.addedAt.toISOString(),
      })),
    },
  });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await context.params;
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const payload = (await req.json().catch(() => ({}))) as {
    name?: string;
    addVerseKey?: string;
    removeVerseKey?: string;
  };

  const collection = await loadOwnedCollection(auth.user.sub, collectionId);
  if (!collection) {
    return NextResponse.json({ ok: false, message: "Collection not found." }, { status: 404 });
  }

  if (typeof payload.name === "string" && payload.name.trim()) {
    await prisma.collection.update({
      where: { id: collection.id },
      data: { name: payload.name.trim() },
    });
  }

  if (payload.addVerseKey) {
    const parsed = parseVerseKey(payload.addVerseKey);
    if (!parsed) {
      return NextResponse.json(
        { ok: false, message: "Use a verse like 2:255." },
        { status: 400 },
      );
    }
    await prisma.collectionItem.upsert({
      where: { collectionId_verseKey: { collectionId: collection.id, verseKey: parsed.verseKey } },
      create: { collectionId: collection.id, verseKey: parsed.verseKey },
      update: {},
    });
    // Bump updatedAt so UI ordering refreshes.
    await prisma.collection.update({ where: { id: collection.id }, data: {} });
  }

  if (payload.removeVerseKey) {
    const parsed = parseVerseKey(payload.removeVerseKey);
    if (parsed) {
      await prisma.collectionItem.deleteMany({
        where: { collectionId: collection.id, verseKey: parsed.verseKey },
      });
    }
  }

  const fresh = await prisma.collection.findFirst({
    where: { id: collection.id },
    include: { items: { orderBy: { addedAt: "desc" } } },
  });

  return NextResponse.json({
    ok: true,
    message: "Collection updated.",
    item: fresh
      ? {
          ...toCollectionItem(fresh),
          verses: fresh.items.map((it: any) => ({
            id: it.id,
            verseKey: it.verseKey,
            addedAt: it.addedAt.toISOString(),
          })),
        }
      : null,
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ collectionId: string }> },
) {
  const { collectionId } = await context.params;
  const auth = await requireUser(req);
  if (!auth.user) return auth.response;

  const existing = await loadOwnedCollection(auth.user.sub, collectionId);
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Collection not found." }, { status: 404 });
  }

  await prisma.collection.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true, deletedId: existing.id, message: "Collection deleted." });
}
