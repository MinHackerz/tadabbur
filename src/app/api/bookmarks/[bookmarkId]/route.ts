import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/db";
import { requireUser } from "@/lib/local-store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = _prisma as any;

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ bookmarkId: string }> },
) {
  try {
    const { bookmarkId } = await context.params;
    const auth = await requireUser(req);
    if (!auth.user) return auth.response;

    // Allow either the row id (uuid) or the verse key as the identifier so the
    // reader can call /api/bookmarks/2:255 to remove without a round-trip lookup.
    const row = bookmarkId.includes(":")
      ? await prisma.bookmark.findUnique({
          where: { userId_verseKey: { userId: auth.user.sub, verseKey: bookmarkId } },
        })
      : await prisma.bookmark.findFirst({
          where: { id: bookmarkId, userId: auth.user.sub },
        });

    if (!row) {
      return NextResponse.json(
        { ok: false, message: "Bookmark not found." },
        { status: 404 },
      );
    }

    await prisma.bookmark.delete({ where: { id: row.id } });
    return NextResponse.json({ ok: true, deletedId: row.id, message: "Bookmark removed." });
  } catch (error) {
    console.error("[DELETE /api/bookmarks/[bookmarkId]] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to remove bookmark. Please try again." },
      { status: 500 },
    );
  }
}
