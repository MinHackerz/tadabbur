import { NextRequest, NextResponse } from "next/server";
import { prisma as _prisma } from "@/db";
import { requireUser, toNoteItem } from "@/lib/local-store";

 
const prisma = _prisma as any;

export const dynamic = "force-dynamic";

async function loadOwnedNote(userId: string, noteId: string) {
  return prisma.note.findFirst({ where: { id: noteId, userId } });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ noteId: string }> },
) {
  try {
    const { noteId } = await context.params;
    const auth = await requireUser(req);
    if (!auth.user) return auth.response;

    const payload = (await req.json().catch(() => ({}))) as { body?: string };
    const body = String(payload.body ?? "").trim();
    if (!body) {
      return NextResponse.json(
        { ok: false, message: "Enter a note body before saving." },
        { status: 400 },
      );
    }

    const existing = await loadOwnedNote(auth.user.sub, noteId);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Note not found." }, { status: 404 });
    }

    const row = await prisma.note.update({
      where: { id: existing.id },
      data: { body },
    });

    return NextResponse.json({ ok: true, message: "Note updated.", item: toNoteItem(row) });
  } catch (error) {
    console.error("[PUT /api/notes/[noteId]] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to update note. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ noteId: string }> },
) {
  try {
    const { noteId } = await context.params;
    const auth = await requireUser(req);
    if (!auth.user) return auth.response;

    const existing = await loadOwnedNote(auth.user.sub, noteId);
    if (!existing) {
      return NextResponse.json({ ok: false, message: "Note not found." }, { status: 404 });
    }

    await prisma.note.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, deletedId: existing.id, message: "Note deleted." });
  } catch (error) {
    console.error("[DELETE /api/notes/[noteId]] Error:", error);
    return NextResponse.json(
      { ok: false, message: "Failed to delete note. Please try again." },
      { status: 500 },
    );
  }
}
