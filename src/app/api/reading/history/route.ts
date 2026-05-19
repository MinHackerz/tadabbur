import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await prisma.readingSession.findMany({
      where: { userId: user.sub },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    // Convert date objects to ISO strings for the frontend
    const result = rows.map((r) => ({
      ...r,
      date: r.date.toISOString().slice(0, 10),
    }));

    return NextResponse.json(result);
  } catch (err) {
    if (process.env.NODE_ENV === "development") console.error(err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
