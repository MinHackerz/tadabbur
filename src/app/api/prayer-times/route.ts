import { NextRequest, NextResponse } from "next/server";

import {
  DEFAULT_PRAYER_LOCATION,
  fetchPrayerTimings,
  resolveLocationFromIp,
} from "@/lib/prayerTimes";

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get("lat");
  const lngParam = request.nextUrl.searchParams.get("lng");

  let lat = latParam;
  let lng = lngParam;
  let cityLabel: string | null = null;

  if (!lat || !lng) {
    const fromIp = await resolveLocationFromIp(clientIp(request));
    const fallback = fromIp ?? DEFAULT_PRAYER_LOCATION;
    lat = fallback.lat;
    lng = fallback.lng;
    cityLabel = fallback.cityLabel;
  }

  try {
    const timings = await fetchPrayerTimings(lat, lng);
    return NextResponse.json({
      ...timings,
      cityLabel: cityLabel ?? timings.cityLabel,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Prayer times request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
