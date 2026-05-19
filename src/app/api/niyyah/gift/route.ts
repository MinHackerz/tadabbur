import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/niyyah/gift
 * Body: { journeyId, imageBase64, recipientName }
 * Stores the rendered gift PNG for later re-download from the Journeys history.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    journeyId?: string;
    imageBase64?: string;
    recipientName?: string;
  };

  if (!body.journeyId || !body.imageBase64) {
    return NextResponse.json({ error: "journeyId and imageBase64 are required." }, { status: 400 });
  }

  // Verify ownership.
  const journey = await prisma.niyyahJourney.findFirst({
    where: { id: body.journeyId, userId: user.sub },
  });
  if (!journey) {
    return NextResponse.json({ error: "Journey not found." }, { status: 404 });
  }

  const imageBytes = Buffer.from(body.imageBase64, "base64");

  await prisma.journeyGift.upsert({
    where: { journeyId: body.journeyId },
    create: {
      journeyId: body.journeyId,
      imageBytes,
      recipientName: body.recipientName ?? journey.recipientName,
    },
    update: {
      imageBytes,
      recipientName: body.recipientName ?? journey.recipientName,
    },
  });

  return NextResponse.json({ ok: true, message: "Gift image saved." });
}

/**
 * GET /api/niyyah/gift?journeyId=xxx
 * Returns the stored PNG as a binary download.
 */
export async function GET(req: NextRequest) {
  const user = await getUserFromSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const journeyId = url.searchParams.get("journeyId");
  if (!journeyId) {
    return NextResponse.json({ error: "journeyId is required." }, { status: 400 });
  }

  const gift = await prisma.journeyGift.findFirst({
    where: { journeyId, journey: { userId: user.sub } },
  });
  if (!gift) {
    return NextResponse.json({ error: "Gift not found." }, { status: 404 });
  }

  return new NextResponse(gift.imageBytes, {
    status: 200,
    headers: {
      "Content-Type": gift.imageMime,
      "Content-Disposition": `attachment; filename="niyyah-gift-${gift.recipientName.replace(/[^a-z0-9]/gi, "-")}.png"`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
