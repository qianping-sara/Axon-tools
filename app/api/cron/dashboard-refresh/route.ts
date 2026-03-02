import { NextRequest, NextResponse } from "next/server";
import { getRedis, DASHBOARD_CACHE_KEY } from "@/lib/redis";
import {
  getDefaultPeriod,
  fetchSessionsFromDb,
} from "@/app/api/smart-proposal-dashboard/route";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7) === secret;
  return request.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { start, end } = getDefaultPeriod();
    const sessionsInPeriod = await fetchSessionsFromDb(start, end);
    const generatedAt = new Date().toISOString();

    const redis = getRedis();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis not configured" },
        { status: 500 }
      );
    }

    await redis.set(
      DASHBOARD_CACHE_KEY,
      JSON.stringify({ start, end, generatedAt, sessionsInPeriod })
    );

    return NextResponse.json({
      ok: true,
      start,
      end,
      generatedAt,
      sessionsCount: sessionsInPeriod.length,
    });
  } catch (error) {
    console.error("Cron dashboard-refresh error:", error);
    return NextResponse.json(
      { error: "Failed to refresh dashboard cache" },
      { status: 500 }
    );
  }
}
