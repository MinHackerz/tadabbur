import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";
import {
  asTrimmedString,
  asOptionalTrimmedString,
  MAX_SHORT_STRING,
} from "@/lib/validation";

export const dynamic = "force-dynamic";

// Cap the gift PNG size to prevent base64 abuse / DB bloat.
const MAX_BASE64_LENGTH = 2_000_000; // ~1.5 MB after decode
const MAX_DECODED_BYTES = 1_500_000; // 1.5 MB

/**
 * POST /api/niyyah/gift
 * Body: { journeyId, imageBase64, recipientName }
 * Stores the rendered gift PNG for later re-download from the Journeys history.
 */
export async function POST(req: NextRequest) {
  const user = await getUserFromSession(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    journeyId?: unknown;
    imageBase64?: unknown;
    recipientName?: unknown;
  };

  const journeyId = asTrimmedString(body.journeyId, MAX_SHORT_STRING);
  const imageBase64 =
    typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const recipientNameOverride = asOptionalTrimmedString(
    body.recipientName,
    MAX_SHORT_STRING,
  );

  if (!journeyId || !imageBase64) {
    return NextResponse.json(
      { error: "journeyId and imageBase64 are required." },
      { status: 400 },
    );
  }

  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json(
      { error: "Image too large." },
      { status: 413 },
    );
  }

  // Reject anything that doesn't look like base64 (avoids storing junk that
  // Buffer.from() silently turns into garbage bytes).
  if (!/^[A-Za-z0-9+/=\s]+$/.test(imageBase64)) {
    return NextResponse.json(
      { error: "imageBase64 is not valid base64." },
      { status: 400 },
    );
  }

  // Verify ownership.
  const journey = await prisma.niyyahJourney.findFirst({
    where: { id: journeyId, userId: user.sub },
  });
  if (!journey) {
    return NextResponse.json({ error: "Journey not found." }, { status: 404 });
  }

  const imageBytes = Buffer.from(imageBase64, "base64");
  if (imageBytes.length === 0 || imageBytes.length > MAX_DECODED_BYTES) {
    return NextResponse.json({ error: "Image too large." }, { status: 413 });
  }

  // Confirm the file is a PNG by checking the 8-byte signature. We render
  // gifts as PNGs on the client; anything else is suspicious.
  const isPng =
    imageBytes.length > 8 &&
    imageBytes[0] === 0x89 &&
    imageBytes[1] === 0x50 &&
    imageBytes[2] === 0x4e &&
    imageBytes[3] === 0x47 &&
    imageBytes[4] === 0x0d &&
    imageBytes[5] === 0x0a &&
    imageBytes[6] === 0x1a &&
    imageBytes[7] === 0x0a;
  if (!isPng) {
    return NextResponse.json(
      { error: "Image must be a PNG." },
      { status: 400 },
    );
  }

  await prisma.journeyGift.upsert({
    where: { journeyId },
    create: {
      journeyId,
      imageBytes,
      recipientName: recipientNameOverride ?? journey.recipientName,
    },
    update: {
      imageBytes,
      recipientName: recipientNameOverride ?? journey.recipientName,
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
  const journeyId = asTrimmedString(url.searchParams.get("journeyId"), MAX_SHORT_STRING);
  if (!journeyId) {
    return NextResponse.json({ error: "journeyId is required." }, { status: 400 });
  }

  const gift = await prisma.journeyGift.findFirst({
    where: { journeyId, journey: { userId: user.sub } },
  });
  if (!gift) {
    return NextResponse.json({ error: "Gift not found." }, { status: 404 });
  }

  // Sanitize the filename — only safe characters allowed in the header.
  const safeName = gift.recipientName.replace(/[^a-z0-9]/gi, "-").slice(0, 60);

  return new NextResponse(gift.imageBytes, {
    status: 200,
    headers: {
      "Content-Type": gift.imageMime,
      "Content-Disposition": `attachment; filename="niyyah-gift-${safeName}.png"`,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
