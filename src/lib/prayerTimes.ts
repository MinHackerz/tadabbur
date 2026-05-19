export interface PrayerTimings {
  fajr: string;
  isha: string;
  cityLabel: string | null;
}

/** Aladhan sometimes appends timezone text, e.g. "04:06 (EDT)". */
export function normalizePrayerTime(value: string): string {
  return value.split(" ")[0]?.trim() ?? value;
}

export function aladhanTimingsUrl(lat: string, lng: string): string {
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const url = new URL(`https://api.aladhan.com/v1/timings/${day}-${month}-${year}`);
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lng);
  url.searchParams.set("method", "2");
  return url.toString();
}

export function parseAladhanTimings(payload: unknown): PrayerTimings | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as Record<string, unknown>).data as Record<string, unknown> | undefined;
  const timings = data?.timings as Record<string, string> | undefined;
  if (!timings?.Fajr || !timings?.Isha) return null;

  const meta = data?.meta as Record<string, unknown> | undefined;
  const timezone = String(meta?.timezone ?? "").replace(/_/g, " ");

  return {
    fajr: normalizePrayerTime(timings.Fajr),
    isha: normalizePrayerTime(timings.Isha),
    cityLabel: timezone || null,
  };
}

export async function fetchPrayerTimings(lat: string, lng: string): Promise<PrayerTimings> {
  const response = await fetch(aladhanTimingsUrl(lat, lng), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Prayer times unavailable.");
  }

  const json = await response.json();
  const timings = parseAladhanTimings(json);

  if (!timings) {
    throw new Error("Could not parse prayer times.");
  }

  return timings;
}

interface GeoIpResult {
  lat: string;
  lng: string;
  cityLabel: string | null;
}

/** Resolve approximate location from client IP (fallback when browser geolocation is blocked). */
export async function resolveLocationFromIp(ip: string | null): Promise<GeoIpResult | null> {
  if (!ip || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,lat,lon,city,timezone`,
      { cache: "no-store" },
    );

    if (!response.ok) return null;

    const json = (await response.json()) as {
      status?: string;
      lat?: number;
      lon?: number;
      city?: string;
      timezone?: string;
    };

    if (json.status !== "success" || json.lat == null || json.lon == null) {
      return null;
    }

    const city = json.city?.trim();
    const tz = json.timezone?.replace(/_/g, " ");
    const cityLabel = city && tz ? `${city} · ${tz}` : city ?? tz ?? null;

    return {
      lat: String(json.lat),
      lng: String(json.lon),
      cityLabel,
    };
  } catch {
    return null;
  }
}

export const DEFAULT_PRAYER_LOCATION: GeoIpResult = {
  lat: "21.4225",
  lng: "39.8262",
  cityLabel: "Makkah (estimate)",
};
